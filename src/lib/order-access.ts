import { createHmac } from "node:crypto";
import { env } from "./env";
import { safeEqualHex } from "./payments/razorpay";

/** Signed, unguessable token that lets a guest view/pay their own order without an account. */
export function orderAccessToken(orderId: string) {
  return createHmac("sha256", env.sessionSecret()).update(`order:${orderId}`).digest("hex").slice(0, 32);
}

export function canAccessOrder(order: { id: string; userId: string | null }, viewer: { userId: string | null; token?: string | null; isStaff?: boolean }) {
  if (viewer.isStaff) return true;
  if (order.userId && viewer.userId === order.userId) return true;
  return Boolean(viewer.token && safeEqualHex(viewer.token, orderAccessToken(order.id)));
}
