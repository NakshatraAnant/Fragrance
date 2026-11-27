/**
 * Discovery credits — a real commerce entitlement.
 * Lifecycle: issued only when an order containing an eligible discovery set is PAID (server-verified)
 * → AVAILABLE → RESERVED by exactly one pending order (atomic conditional update) → REDEEMED on
 * payment, or back to AVAILABLE if that order fails/expires → VOID if the source order is refunded.
 */
import { db, type Tx } from "./db";
import { getSetting } from "./settings";
import type { Settings } from "./settings-defaults";

type CreditRule = Settings["discoveryCredit"];

export function isCreditSource(sku: string, rule: CreditRule) {
  return rule.enabled && rule.sourceSkus.includes(sku);
}

export function creditStatusAt(c: { status: string; expiresAt: Date }, now = new Date()) {
  if (c.status === "AVAILABLE" && c.expiresAt < now) return "EXPIRED";
  return c.status;
}

export async function issueCreditsForOrder(tx: Tx, orderId: string, rule: CreditRule) {
  if (!rule.enabled) return [];
  const order = await tx.order.findUniqueOrThrow({ where: { id: orderId }, include: { items: true } });
  if (order.paymentStatus !== "PAID" && order.paymentStatus !== "COD_PENDING") return [];
  const issued = [];
  for (const item of order.items) {
    if (!isCreditSource(item.sku, rule)) continue;
    const existing = await tx.discoveryCredit.findUnique({ where: { sourceOrderItemId: item.id } });
    if (existing) continue; // idempotent
    const amount = Math.floor(item.lineTotalPaise / item.quantity);
    if (amount <= 0) continue;
    issued.push(
      await tx.discoveryCredit.create({
        data: { userId: order.userId, email: order.email, sourceOrderItemId: item.id, amountPaise: amount, expiresAt: new Date(Date.now() + rule.validityDays * 86400_000) },
      }),
    );
  }
  return issued;
}

export async function availableCredits(userId: string | null, email: string | null) {
  if (!userId) return [];
  const now = new Date();
  // Expire lazily
  await db.discoveryCredit.updateMany({ where: { status: "AVAILABLE", expiresAt: { lt: now } }, data: { status: "EXPIRED" } });
  return db.discoveryCredit.findMany({
    where: { status: "AVAILABLE", expiresAt: { gte: now }, OR: [{ userId }, ...(email ? [{ email: email.toLowerCase(), userId: null }] : [])] },
    orderBy: { expiresAt: "asc" },
  });
}

/** Atomically reserve a credit for an order. Returns false if it was already taken/expired. */
export async function reserveCredit(tx: Tx, creditId: string, orderId: string, userId: string) {
  const res = await tx.discoveryCredit.updateMany({
    where: { id: creditId, status: "AVAILABLE", expiresAt: { gte: new Date() }, userId },
    data: { status: "RESERVED", reservedOrderId: orderId },
  });
  return res.count === 1;
}

export async function redeemReservedCredit(tx: Tx, orderId: string) {
  await tx.discoveryCredit.updateMany({ where: { reservedOrderId: orderId, status: "RESERVED" }, data: { status: "REDEEMED", redeemedOrderId: orderId, redeemedAt: new Date() } });
}

export async function releaseReservedCredit(tx: Tx, orderId: string) {
  await tx.discoveryCredit.updateMany({ where: { reservedOrderId: orderId, status: "RESERVED" }, data: { status: "AVAILABLE", reservedOrderId: null } });
}

/** On refund: void credits this order issued (if unused) and restore a credit it consumed (if unexpired). */
export async function reverseCreditsForRefund(tx: Tx, orderId: string) {
  const items = await tx.orderItem.findMany({ where: { orderId }, select: { id: true } });
  await tx.discoveryCredit.updateMany({ where: { sourceOrderItemId: { in: items.map((i) => i.id) }, status: { in: ["AVAILABLE", "RESERVED"] } }, data: { status: "VOID", voidReason: "Source order refunded" } });
  const used = await tx.discoveryCredit.findFirst({ where: { redeemedOrderId: orderId } });
  if (used && used.expiresAt > new Date()) await tx.discoveryCredit.update({ where: { id: used.id }, data: { status: "AVAILABLE", redeemedOrderId: null, redeemedAt: null, reservedOrderId: null } });
}

export async function creditRule() {
  return getSetting("discoveryCredit");
}
