import { z } from "zod";
import { db } from "./db";
import { AppError } from "./logger";
import { computeTotals, type PriceLine } from "./pricing";
import { loadCoupon } from "./coupons";
import { reserveStock } from "./inventory";
import { reserveCredit } from "./credits";
import { getSetting } from "./settings";
import { estimateDelivery, INDIAN_STATES, PINCODE_RE } from "./shipping";
import { recordConsent } from "./messaging";
import { recordServerEvent } from "./analytics";
import { randomToken } from "./password";

export const CheckoutSchema = z.object({
  idempotencyKey: z.string().min(16).max(64),
  email: z.string().trim().toLowerCase().email("Enter a valid email address.").max(200),
  phone: z.string().trim().regex(/^(\+91[\s-]?)?[6-9]\d{9}$/, "Enter a valid 10-digit Indian mobile number."),
  name: z.string().trim().min(2, "Enter the recipient's name.").max(100),
  line1: z.string().trim().min(3, "Enter the address.").max(200),
  line2: z.string().trim().max(200).optional().or(z.literal("")),
  landmark: z.string().trim().max(120).optional().or(z.literal("")),
  city: z.string().trim().min(2, "Enter the city.").max(80),
  state: z.string().refine((s) => INDIAN_STATES.includes(s), "Choose a state."),
  pincode: z.string().trim().regex(PINCODE_RE, "Enter a valid 6-digit PIN code."),
  gstin: z.string().trim().toUpperCase().regex(/^[0-9]{2}[A-Z]{5}[0-9]{4}[A-Z][1-9A-Z]Z[0-9A-Z]$/, "Enter a valid GSTIN or leave it blank.").optional().or(z.literal("")),
  giftRecipient: z.string().trim().max(100).optional().or(z.literal("")),
  paymentMethod: z.enum(["ONLINE", "COD"]),
  marketingOptIn: z.boolean().default(false),
  saveAddress: z.boolean().default(false),
});
export type CheckoutInput = z.infer<typeof CheckoutSchema>;

function orderNumber() {
  const d = new Date();
  const ymd = `${String(d.getFullYear()).slice(2)}${String(d.getMonth() + 1).padStart(2, "0")}${String(d.getDate()).padStart(2, "0")}`;
  return `FH-${ymd}-${randomToken(4).replace(/[^A-Za-z0-9]/g, "").toUpperCase().slice(0, 5).padEnd(5, "X")}`;
}

/**
 * Creates an order from a cart in one transaction: re-prices server-side, reserves stock atomically,
 * reserves the discovery credit and coupon usage, and is idempotent on idempotencyKey (double-submits
 * return the same order instead of creating a duplicate).
 */
export async function createOrderFromCart(cartId: string, input: CheckoutInput, ctx: { userId: string | null; ip?: string }) {
  const dup = await db.order.findUnique({ where: { idempotencyKey: input.idempotencyKey } });
  if (dup) return dup;

  const cart = await db.cart.findUnique({ where: { id: cartId }, include: { items: { include: { variant: { include: { product: { include: { brand: true } } } } } } } });
  if (!cart || cart.items.length === 0) throw new AppError("Your bag is empty.", "CART_EMPTY");
  if (cart.userId && cart.userId !== ctx.userId) throw new AppError("This bag belongs to another account.", "FORBIDDEN", 403);
  for (const i of cart.items) if (i.variant.status !== "ACTIVE" || i.variant.product.status !== "ACTIVE") throw new AppError(`${i.variant.product.name} is no longer available. Please remove it.`, "NOT_AVAILABLE");

  const delivery = await estimateDelivery(input.pincode);
  if (!delivery.ok) throw new AppError(delivery.message, "PINCODE_INVALID");
  if (!delivery.serviceable) throw new AppError(delivery.message, "PINCODE_UNSERVICEABLE");

  const [shipping, rule, cod, ordersCfg, brands] = await Promise.all([getSetting("shipping"), getSetting("discoveryCredit"), getSetting("cod"), getSetting("orders"), db.brand.findMany()]);
  const brandCeilings = Object.fromEntries(brands.map((b) => [b.slug, b.discountCeilingPct]));

  let coupon = null;
  if (cart.couponCode) {
    const c = await loadCoupon(cart.couponCode, input.email);
    if (!c.ok) throw new AppError(c.error, "COUPON_INVALID");
    coupon = c.coupon;
  }
  let credit = null;
  if (cart.creditId) {
    if (!ctx.userId) throw new AppError("Sign in to use your discovery credit.", "CREDIT_REQUIRES_ACCOUNT");
    const row = await db.discoveryCredit.findUnique({ where: { id: cart.creditId } });
    if (!row || row.userId !== ctx.userId || row.status !== "AVAILABLE" || row.expiresAt < new Date()) throw new AppError("That discovery credit is no longer available.", "CREDIT_INVALID");
    credit = { id: row.id, amountPaise: row.amountPaise, eligibleFormats: rule.eligibleFormats, excludedBrands: rule.excludedBrands };
  }

  const lines: PriceLine[] = cart.items.map((i) => ({ variantId: i.variantId, sku: i.variant.sku, brandSlug: i.variant.product.brand.slug, format: i.variant.product.format, isDiscoverySet: i.variant.product.isDiscoverySet, unitPricePaise: i.variant.pricePaise, mrpPaise: i.variant.mrpPaise, quantity: i.quantity, gstRatePct: i.variant.gstRatePct }));
  const totals = computeTotals({ lines, brandCeilings, coupon, credit, shipping, giftWrap: cart.giftWrap });
  if (coupon && totals.couponError) throw new AppError(totals.couponError, "COUPON_INVALID");
  if (credit && totals.creditError) throw new AppError(totals.creditError, "CREDIT_INVALID");

  if (input.paymentMethod === "COD") {
    if (!cod.enabled) throw new AppError("Cash on delivery isn't available.", "COD_DISABLED");
    if (!delivery.codAllowed) throw new AppError("Cash on delivery isn't available for this PIN code.", "COD_DISABLED");
    if (totals.totalPaise > cod.maxOrderPaise) throw new AppError("This order is above the cash-on-delivery limit.", "COD_LIMIT");
  }
  const isCod = input.paymentMethod === "COD";
  const number = orderNumber();

  const order = await db.$transaction(async (tx) => {
    const o = await tx.order.create({
      data: {
        number, idempotencyKey: input.idempotencyKey, userId: ctx.userId, email: input.email, phone: input.phone,
        status: isCod ? "CONFIRMED" : "PENDING_PAYMENT", paymentStatus: isCod ? "COD_PENDING" : "UNPAID", paymentMethod: isCod ? "COD" : "ONLINE",
        subtotalPaise: totals.subtotalPaise, discountPaise: totals.discountPaise, creditPaise: totals.creditPaise, shippingPaise: totals.shippingPaise + (isCod ? cod.feePaise : 0),
        giftWrapPaise: totals.giftWrapPaise, taxPaise: totals.taxPaise, totalPaise: totals.totalPaise + (isCod ? cod.feePaise : 0),
        couponCode: coupon?.code ?? null, creditId: credit?.id ?? null,
        shipName: input.name, shipPhone: input.phone, shipLine1: input.line1, shipLine2: input.line2 || null, shipLandmark: input.landmark || null,
        shipCity: input.city, shipState: input.state, shipPincode: input.pincode, gstin: input.gstin || null,
        giftWrap: cart.giftWrap, giftMessage: cart.giftMessage, giftRecipient: input.giftRecipient || null,
        deliveryEstimate: delivery.label, marketingOptIn: input.marketingOptIn,
        expiresAt: isCod ? null : new Date(Date.now() + ordersCfg.pendingExpiryMinutes * 60_000),
      },
    });
    for (const [idx, i] of cart.items.entries()) {
      const pl = totals.lines[idx];
      const warehouseId = await reserveStock(tx, i.variantId, i.quantity, number);
      await tx.orderItem.create({
        data: {
          orderId: o.id, variantId: i.variantId, sku: i.variant.sku, productName: i.variant.product.name, variantLabel: i.variant.label, brandSlug: i.variant.product.brand.slug,
          format: i.variant.product.format, unitPricePaise: i.variant.pricePaise, mrpPaise: i.variant.mrpPaise, quantity: i.quantity,
          discountPaise: pl.discountPaise + pl.creditPaise, gstRatePct: i.variant.gstRatePct, taxPaise: pl.taxPaise, lineTotalPaise: pl.lineTotalPaise, warehouseId,
        },
      });
    }
    if (credit && ctx.userId) {
      const ok = await reserveCredit(tx, credit.id, o.id, ctx.userId);
      if (!ok) throw new AppError("That discovery credit was just used on another order.", "CREDIT_INVALID");
    }
    if (coupon) await tx.couponRedemption.create({ data: { couponId: coupon.id, orderId: o.id, email: input.email, amountPaise: totals.discountPaise } });
    await tx.cartItem.deleteMany({ where: { cartId } });
    await tx.cart.update({ where: { id: cartId }, data: { couponCode: null, creditId: null, giftWrap: false, giftMessage: null } });
    if (input.saveAddress && ctx.userId) {
      const count = await tx.address.count({ where: { userId: ctx.userId } });
      await tx.address.create({ data: { userId: ctx.userId, name: input.name, phone: input.phone, line1: input.line1, line2: input.line2 || null, landmark: input.landmark || null, city: input.city, state: input.state, pincode: input.pincode, isDefault: count === 0 } });
    }
    return o;
  });

  if (input.marketingOptIn) await recordConsent({ userId: ctx.userId, email: input.email, channel: "EMAIL", granted: true, source: "checkout", ip: ctx.ip });
  await recordServerEvent("checkout_start", { userId: ctx.userId, valuePaise: order.totalPaise, props: { orderNumber: order.number } });
  return order;
}
