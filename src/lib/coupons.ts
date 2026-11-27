import { db } from "./db";
import type { CouponInput } from "./pricing";

export type CouponCheck = { ok: true; coupon: CouponInput & { id: string } } | { ok: false; error: string };

/** Pure eligibility check on a coupon row (dates, activity, usage counts). */
export function checkCouponRow(
  c: { code: string; isActive: boolean; startsAt: Date | null; endsAt: Date | null; maxRedemptions: number | null; perCustomerLimit: number },
  usage: { total: number; byCustomer: number },
  now = new Date(),
): string | null {
  if (!c.isActive) return "This code is no longer active.";
  if (c.startsAt && c.startsAt > now) return "This code isn't active yet.";
  if (c.endsAt && c.endsAt < now) return "This code has expired.";
  if (c.maxRedemptions !== null && usage.total >= c.maxRedemptions) return "This code has reached its usage limit.";
  if (usage.byCustomer >= c.perCustomerLimit) return "You've already used this code.";
  return null;
}

export async function loadCoupon(codeRaw: string, email?: string | null): Promise<CouponCheck> {
  const code = codeRaw.trim().toUpperCase();
  if (!/^[A-Z0-9-]{3,32}$/.test(code)) return { ok: false, error: "That code doesn't look right." };
  const c = await db.coupon.findUnique({ where: { code } });
  if (!c) return { ok: false, error: "We couldn't find that code." };
  // Redemptions count while the order is live (pending or paid); expired/failed orders release them.
  const total = await db.couponRedemption.count({ where: { couponId: c.id } });
  const byCustomer = email ? await db.couponRedemption.count({ where: { couponId: c.id, email: email.toLowerCase() } }) : 0;
  const err = checkCouponRow(c, { total, byCustomer });
  if (err) return { ok: false, error: err };
  return { ok: true, coupon: { id: c.id, code: c.code, type: c.type === "FIXED" ? "FIXED" : "PERCENT", value: c.value, minSubtotalPaise: c.minSubtotalPaise, brandScope: c.brandScope ? c.brandScope.split(",").map((s) => s.trim()).filter(Boolean) : [] } };
}
