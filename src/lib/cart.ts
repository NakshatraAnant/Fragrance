import { db } from "./db";
import { AppError } from "./logger";
import { computeTotals, type PriceLine, type Totals } from "./pricing";
import { loadCoupon } from "./coupons";
import { availabilityFor } from "./inventory";
import { getSetting } from "./settings";
import { availableCredits } from "./credits";
import { randomToken } from "./password";

export const MAX_QTY_PER_LINE = 10;

const cartInclude = {
  items: { orderBy: { createdAt: "asc" as const }, include: { variant: { include: { product: { include: { brand: true, concept: { select: { colour: true } } } } } } } },
};

export async function findCart(token: string | null, userId: string | null) {
  if (userId) {
    const own = await db.cart.findFirst({ where: { userId }, orderBy: { updatedAt: "desc" }, include: cartInclude });
    if (own) return own;
  }
  if (token) return db.cart.findUnique({ where: { token }, include: cartInclude });
  return null;
}

export async function getOrCreateCart(token: string | null, userId: string | null) {
  const existing = await findCart(token, userId);
  if (existing) return existing;
  return db.cart.create({ data: { token: token ?? randomToken(24), userId }, include: cartInclude });
}

export async function addToCart(cartId: string, variantId: string, quantity = 1) {
  if (!Number.isInteger(quantity) || quantity < 1 || quantity > MAX_QTY_PER_LINE) throw new AppError("Choose a quantity between 1 and 10.");
  const variant = await db.variant.findUnique({ where: { id: variantId }, include: { product: true } });
  if (!variant || variant.status !== "ACTIVE" || variant.product.status !== "ACTIVE" || variant.product.deletedAt) throw new AppError("This item is not available.", "NOT_AVAILABLE", 404);
  const existing = await db.cartItem.findUnique({ where: { cartId_variantId: { cartId, variantId } } });
  const next = (existing?.quantity ?? 0) + quantity;
  const avail = (await availabilityFor([variantId]))[variantId];
  if (avail <= 0) throw new AppError(`${variant.product.name} (${variant.label}) is out of stock.`, "OUT_OF_STOCK", 409);
  if (next > Math.min(avail, MAX_QTY_PER_LINE)) throw new AppError(`Only ${Math.min(avail, MAX_QTY_PER_LINE)} of ${variant.product.name} (${variant.label}) can be added.`, "QTY_LIMIT", 409);
  await db.cartItem.upsert({ where: { cartId_variantId: { cartId, variantId } }, update: { quantity: next }, create: { cartId, variantId, quantity } });
  await db.cart.update({ where: { id: cartId }, data: { updatedAt: new Date() } });
  return variant;
}

export async function setCartQuantity(cartId: string, variantId: string, quantity: number) {
  if (quantity <= 0) return db.cartItem.deleteMany({ where: { cartId, variantId } });
  if (!Number.isInteger(quantity) || quantity > MAX_QTY_PER_LINE) throw new AppError("Choose a quantity between 1 and 10.");
  const avail = (await availabilityFor([variantId]))[variantId];
  if (quantity > avail) throw new AppError(avail > 0 ? `Only ${avail} available.` : "This item is out of stock.", "QTY_LIMIT", 409);
  return db.cartItem.update({ where: { cartId_variantId: { cartId, variantId } }, data: { quantity } });
}

/** Moves a guest cart's lines into the user's cart on sign-in. */
export async function mergeGuestCart(guestToken: string | null, userId: string) {
  if (!guestToken) return;
  const guest = await db.cart.findUnique({ where: { token: guestToken }, include: { items: true } });
  if (!guest || guest.userId === userId) return;
  const own = await db.cart.findFirst({ where: { userId }, orderBy: { updatedAt: "desc" } });
  if (!own) { await db.cart.update({ where: { id: guest.id }, data: { userId } }); return; }
  for (const it of guest.items) {
    const ex = await db.cartItem.findUnique({ where: { cartId_variantId: { cartId: own.id, variantId: it.variantId } } });
    await db.cartItem.upsert({ where: { cartId_variantId: { cartId: own.id, variantId: it.variantId } }, update: { quantity: Math.min(MAX_QTY_PER_LINE, (ex?.quantity ?? 0) + it.quantity) }, create: { cartId: own.id, variantId: it.variantId, quantity: it.quantity } });
  }
  await db.cart.delete({ where: { id: guest.id } });
}

export type CartView = Awaited<ReturnType<typeof buildCartView>>;

export async function buildCartView(cart: NonNullable<Awaited<ReturnType<typeof findCart>>> | null, ctx: { userId: string | null; email: string | null }) {
  const [shipping, rule, brands] = await Promise.all([getSetting("shipping"), getSetting("discoveryCredit"), db.brand.findMany({ select: { slug: true, discountCeilingPct: true } })]);
  const brandCeilings = Object.fromEntries(brands.map((b) => [b.slug, b.discountCeilingPct]));
  const items = cart?.items ?? [];
  const avail = await availabilityFor(items.map((i) => i.variantId));
  const lines: PriceLine[] = items.map((i) => ({
    variantId: i.variantId, sku: i.variant.sku, brandSlug: i.variant.product.brand.slug, format: i.variant.product.format, isDiscoverySet: i.variant.product.isDiscoverySet,
    unitPricePaise: i.variant.pricePaise, mrpPaise: i.variant.mrpPaise, quantity: i.quantity, gstRatePct: i.variant.gstRatePct,
  }));
  let couponErr: string | null = null;
  let coupon = null;
  if (cart?.couponCode) {
    const c = await loadCoupon(cart.couponCode, ctx.email);
    if (c.ok) coupon = c.coupon; else couponErr = c.error;
  }
  const credits = await availableCredits(ctx.userId, ctx.email);
  const chosenCredit = cart?.creditId ? credits.find((c) => c.id === cart.creditId) : undefined;
  const totals: Totals = computeTotals({
    lines, brandCeilings, coupon, shipping, giftWrap: cart?.giftWrap,
    credit: chosenCredit ? { id: chosenCredit.id, amountPaise: chosenCredit.amountPaise, eligibleFormats: rule.eligibleFormats, excludedBrands: rule.excludedBrands } : null,
  });
  return {
    cartId: cart?.id ?? null,
    couponCode: cart?.couponCode ?? null,
    couponError: couponErr ?? totals.couponError,
    creditId: chosenCredit?.id ?? null,
    creditError: cart?.creditId && !chosenCredit ? "That credit is no longer available." : totals.creditError,
    availableCredits: credits.map((c) => ({ id: c.id, amountPaise: c.amountPaise, expiresAt: c.expiresAt.toISOString() })),
    giftWrap: cart?.giftWrap ?? false,
    giftMessage: cart?.giftMessage ?? "",
    count: items.reduce((s, i) => s + i.quantity, 0),
    items: items.map((i, idx) => ({
      variantId: i.variantId, sku: i.variant.sku, label: i.variant.label, quantity: i.quantity, available: avail[i.variantId] ?? 0,
      productId: i.variant.productId, slug: i.variant.product.slug, name: i.variant.product.name, subtitle: i.variant.product.subtitle, brand: i.variant.product.brand.slug, brandName: i.variant.product.brand.name,
      format: i.variant.product.format, colour: i.variant.product.concept?.colour ?? null,
      unitPricePaise: i.variant.pricePaise, lineTotalPaise: totals.lines[idx].lineTotalPaise, lineSubtotalPaise: totals.lines[idx].lineSubtotalPaise,
      discountPaise: totals.lines[idx].discountPaise, creditPaise: totals.lines[idx].creditPaise,
    })),
    totals: { subtotalPaise: totals.subtotalPaise, discountPaise: totals.discountPaise, creditPaise: totals.creditPaise, shippingPaise: totals.shippingPaise, giftWrapPaise: totals.giftWrapPaise, taxPaise: totals.taxPaise, totalPaise: totals.totalPaise, freeShippingRemainingPaise: totals.freeShippingRemainingPaise },
    shippingPlaceholder: shipping.placeholder,
  };
}
