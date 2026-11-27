import { NextResponse } from "next/server";
import { z } from "zod";
import { db } from "@/lib/db";
import { getCurrentUser, ensureGuestToken, readGuestToken, clientIp } from "@/lib/auth";
import { addToCart, buildCartView, findCart, getOrCreateCart, setCartQuantity } from "@/lib/cart";
import { AppError, log } from "@/lib/logger";
import { loadCoupon } from "@/lib/coupons";
import { rateLimit } from "@/lib/rate-limit";
import { recordServerEvent } from "@/lib/analytics";

export const dynamic = "force-dynamic";

async function view() {
  const user = await getCurrentUser();
  const cart = await findCart(await readGuestToken(), user?.id ?? null);
  return buildCartView(cart, { userId: user?.id ?? null, email: user?.email ?? null });
}

export async function GET() {
  return NextResponse.json(await view(), { headers: { "Cache-Control": "no-store" } });
}

const Body = z.discriminatedUnion("action", [
  z.object({ action: z.literal("add"), variantId: z.string().min(1), quantity: z.number().int().min(1).max(10).default(1) }),
  z.object({ action: z.literal("addMany"), variantIds: z.array(z.string().min(1)).min(1).max(10) }),
  z.object({ action: z.literal("set"), variantId: z.string().min(1), quantity: z.number().int().min(0).max(10) }),
  z.object({ action: z.literal("remove"), variantId: z.string().min(1) }),
  z.object({ action: z.literal("coupon"), code: z.string().max(40).nullable() }),
  z.object({ action: z.literal("credit"), creditId: z.string().max(40).nullable() }),
  z.object({ action: z.literal("gift"), giftWrap: z.boolean(), giftMessage: z.string().max(300).optional() }),
]);

export async function POST(req: Request) {
  const ip = await clientIp();
  if (!rateLimit(`cart:${ip}`, 120, 60_000).ok) return NextResponse.json({ error: "Too many requests. Please slow down." }, { status: 429 });
  const parsed = Body.safeParse(await req.json().catch(() => ({})));
  if (!parsed.success) return NextResponse.json({ error: "Invalid request." }, { status: 400 });
  const b = parsed.data;
  try {
    const user = await getCurrentUser();
    const token = await ensureGuestToken();
    const cart = await getOrCreateCart(token, user?.id ?? null);
    switch (b.action) {
      case "add": {
        const v = await addToCart(cart.id, b.variantId, b.quantity);
        await recordServerEvent("add_to_cart", { userId: user?.id, sku: v.sku, productId: v.productId, valuePaise: v.pricePaise * b.quantity, props: { quantity: b.quantity } });
        break;
      }
      case "addMany":
        for (const id of b.variantIds) await addToCart(cart.id, id, 1);
        break;
      case "set": await setCartQuantity(cart.id, b.variantId, b.quantity); break;
      case "remove": await db.cartItem.deleteMany({ where: { cartId: cart.id, variantId: b.variantId } }); break;
      case "coupon": {
        if (b.code) {
          const c = await loadCoupon(b.code, user?.email);
          if (!c.ok) throw new AppError(c.error, "COUPON_INVALID");
          await db.cart.update({ where: { id: cart.id }, data: { couponCode: c.coupon.code } });
        } else await db.cart.update({ where: { id: cart.id }, data: { couponCode: null } });
        break;
      }
      case "credit": {
        if (b.creditId && !user) throw new AppError("Sign in to use your discovery credit.", "AUTH_REQUIRED", 401);
        if (b.creditId) {
          const credit = await db.discoveryCredit.findUnique({ where: { id: b.creditId } });
          if (!credit || credit.userId !== user!.id || credit.status !== "AVAILABLE" || credit.expiresAt < new Date()) throw new AppError("That credit isn't available.", "CREDIT_INVALID");
        }
        await db.cart.update({ where: { id: cart.id }, data: { creditId: b.creditId } });
        break;
      }
      case "gift": await db.cart.update({ where: { id: cart.id }, data: { giftWrap: b.giftWrap, giftMessage: b.giftMessage?.trim() || null } }); break;
    }
    return NextResponse.json(await view());
  } catch (e) {
    if (e instanceof AppError) return NextResponse.json({ error: e.message, code: e.code, cart: await view() }, { status: e.status });
    log.error("cart error", { error: e });
    return NextResponse.json({ error: "Something went wrong. Please try again." }, { status: 500 });
  }
}
