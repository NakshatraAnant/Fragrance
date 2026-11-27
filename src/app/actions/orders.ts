"use server";
import { redirect } from "next/navigation";
import { db } from "@/lib/db";
import { ensureGuestToken, getCurrentUser } from "@/lib/auth";
import { isStaff } from "@/lib/auth-core";
import { canAccessOrder, orderAccessToken } from "@/lib/order-access";
import { getOrCreateCart, MAX_QTY_PER_LINE } from "@/lib/cart";
import { availabilityFor } from "@/lib/inventory";
import { releaseOrderHolds } from "@/lib/payments/process";
import { clientIp } from "@/lib/auth";
import { rateLimit } from "@/lib/rate-limit";
import type { FormState } from "@/lib/form-state";

/** Puts an expired/failed order's items back in the bag (respecting current stock). */
export async function restoreOrderToCart(fd: FormData) {
  const orderId = String(fd.get("orderId"));
  const user = await getCurrentUser();
  const order = await db.order.findUnique({ where: { id: orderId }, include: { items: true } });
  if (!order || !canAccessOrder(order, { userId: user?.id ?? null, token: String(fd.get("t") ?? ""), isStaff: isStaff(user) })) redirect("/cart");
  if (order.status === "PENDING_PAYMENT" || order.status === "PAYMENT_FAILED") await releaseOrderHolds(order.id, "CANCELLED");
  const cart = await getOrCreateCart(await ensureGuestToken(), user?.id ?? null);
  const avail = await availabilityFor(order.items.map((i) => i.variantId));
  for (const i of order.items) {
    const q = Math.min(i.quantity, avail[i.variantId] ?? 0, MAX_QTY_PER_LINE);
    if (q > 0) await db.cartItem.upsert({ where: { cartId_variantId: { cartId: cart.id, variantId: i.variantId } }, update: { quantity: q }, create: { cartId: cart.id, variantId: i.variantId, quantity: q } });
  }
  redirect("/cart");
}

/** Order tracking lookup: order number + email must match. */
export async function trackOrder(_: FormState, fd: FormData): Promise<FormState> {
  if (!rateLimit(`track:${await clientIp()}`, 10, 600_000).ok) return { ok: false, message: "Too many attempts. Please wait a few minutes." };
  const number = String(fd.get("number") ?? "").trim().toUpperCase();
  const email = String(fd.get("email") ?? "").trim().toLowerCase();
  const order = await db.order.findUnique({ where: { number } });
  if (!order || order.email !== email) return { ok: false, message: "We couldn't find an order with that number and email.", data: { number, email } };
  redirect(`/order/${order.number}?t=${orderAccessToken(order.id)}`);
}
