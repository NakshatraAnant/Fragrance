/**
 * Order payment state machine. All transitions are idempotent and transactional.
 *   PENDING_PAYMENT ──verified capture──▶ CONFIRMED (paymentStatus PAID)
 *   PENDING_PAYMENT ──verified failure──▶ PAYMENT_FAILED (retry allowed until expiry)
 *   PENDING_PAYMENT / PAYMENT_FAILED ──expiry──▶ EXPIRED (stock + credit + coupon released)
 */
import { db } from "../db";
import { AppError, log } from "../logger";
import { commitStock, releaseStock } from "../inventory";
import { issueCreditsForOrder, redeemReservedCredit, releaseReservedCredit, reverseCreditsForRefund } from "../credits";
import { recordOrderForLoyalty, reverseLoyaltyForOrder } from "../loyalty";
import { scheduleOrderLifecycle } from "../crm";
import { getSetting } from "../settings";
import { sendTemplate } from "../messaging";
import { formatINR } from "../money";
import { recordServerEvent } from "../analytics";
import { razorpayConfigured } from "../env";
import { createProviderRefund } from "./razorpay";

export async function recordPaymentEvent(provider: string, eventId: string, type: string, payload: string, verified: boolean) {
  try {
    return { event: await db.paymentEvent.create({ data: { provider, eventId, type, payload: payload.slice(0, 20000), verified } }), duplicate: false };
  } catch {
    const event = await db.paymentEvent.findUnique({ where: { provider_eventId: { provider, eventId } } });
    return { event, duplicate: Boolean(event?.processedAt) };
  }
}

export async function markOrderPaid(orderId: string, info: { provider: string; providerPaymentId: string; providerOrderId?: string | null; amountPaise: number; method?: string | null }) {
  const [creditRuleCfg, loyaltyCfg] = await Promise.all([getSetting("discoveryCredit"), getSetting("loyalty")]);
  const result = await db.$transaction(async (tx) => {
    const order = await tx.order.findUnique({ where: { id: orderId }, include: { items: true } });
    if (!order) throw new AppError("Order not found", "NOT_FOUND", 404);
    if (order.paymentStatus === "PAID") return { order, already: true };
    if (order.status === "EXPIRED" || order.status === "CANCELLED") {
      // Payment arrived after expiry: record it and flag for refund rather than silently confirming.
      await tx.payment.create({ data: { orderId, provider: info.provider, providerPaymentId: info.providerPaymentId, status: "CAPTURED", amountPaise: info.amountPaise, method: info.method ?? null, signatureVerified: true, failureReason: "Captured after order expiry — refund required" } });
      await tx.refund.create({ data: { orderId, amountPaise: info.amountPaise, reason: "Payment captured after order expired", status: "MANUAL_REQUIRED" } });
      return { order, already: false, lateCapture: true };
    }
    if (info.amountPaise !== order.totalPaise) throw new AppError(`Amount mismatch for ${order.number}: expected ${order.totalPaise}, got ${info.amountPaise}`, "AMOUNT_MISMATCH", 400);
    const existingPayment = await tx.payment.findFirst({ where: { orderId, OR: [{ providerPaymentId: info.providerPaymentId }, ...(info.providerOrderId ? [{ providerOrderId: info.providerOrderId }] : [])] } });
    if (existingPayment) await tx.payment.update({ where: { id: existingPayment.id }, data: { status: "CAPTURED", providerPaymentId: info.providerPaymentId, method: info.method ?? null, signatureVerified: true } });
    else await tx.payment.create({ data: { orderId, provider: info.provider, providerPaymentId: info.providerPaymentId, providerOrderId: info.providerOrderId ?? null, status: "CAPTURED", amountPaise: info.amountPaise, method: info.method ?? null, signatureVerified: true } });
    const updated = await tx.order.update({ where: { id: orderId }, data: { status: "CONFIRMED", paymentStatus: "PAID", paidAt: new Date(), expiresAt: null }, include: { items: true } });
    for (const it of order.items) if (it.warehouseId) await commitStock(tx, it.variantId, it.warehouseId, it.quantity, order.number);
    await redeemReservedCredit(tx, orderId);
    await issueCreditsForOrder(tx, orderId, creditRuleCfg);
    await recordOrderForLoyalty(tx, updated, loyaltyCfg);
    await scheduleOrderLifecycle(tx, updated);
    if (order.userId) {
      const ref = await tx.referral.findFirst({ where: { refereeUserId: order.userId, status: "JOINED" } });
      if (ref) await tx.referral.update({ where: { id: ref.id }, data: { status: "QUALIFIED" } });
    }
    return { order: updated, already: false };
  });
  if (!result.already && !("lateCapture" in result)) {
    const o = result.order;
    await sendTemplate("ORDER_CONFIRMED", "EMAIL", { email: o.email, userId: o.userId }, { name: o.shipName, orderNumber: o.number, total: formatINR(o.totalPaise), deliveryEstimate: o.deliveryEstimate ?? "" });
    await sendTemplate("ORDER_CONFIRMED", "WHATSAPP", { phone: o.phone, userId: o.userId }, { orderNumber: o.number, total: formatINR(o.totalPaise) });
    const repeat = o.userId ? await db.order.count({ where: { userId: o.userId, paymentStatus: "PAID" } }) : 1;
    await recordServerEvent("purchase", { userId: o.userId, valuePaise: o.totalPaise, props: { orderNumber: o.number, provider: info.provider, items: o.items.map((i) => i.sku), repeat: repeat > 1 } });
    if (o.items.some((i) => i.format === "DISCOVERY")) await recordServerEvent("discovery_set_purchase", { userId: o.userId, props: { orderNumber: o.number } });
    if (o.creditPaise > 0) await recordServerEvent("discovery_credit_redeemed", { userId: o.userId, valuePaise: o.creditPaise, props: { orderNumber: o.number } });
  }
  return result;
}

export async function markPaymentFailed(orderId: string, info: { provider: string; providerPaymentId?: string | null; providerOrderId?: string | null; amountPaise: number; reason: string }) {
  const res = await db.$transaction(async (tx) => {
    const order = await tx.order.findUnique({ where: { id: orderId } });
    if (!order || order.paymentStatus === "PAID") return null;
    await tx.payment.create({ data: { orderId, provider: info.provider, providerPaymentId: info.providerPaymentId ?? null, status: "FAILED", amountPaise: info.amountPaise, failureReason: info.reason.slice(0, 300), signatureVerified: true } });
    return tx.order.update({ where: { id: orderId }, data: { status: order.status === "EXPIRED" ? "EXPIRED" : "PAYMENT_FAILED", paymentStatus: "FAILED" } });
  });
  if (res) {
    await sendTemplate("PAYMENT_FAILED", "EMAIL", { email: res.email, userId: res.userId }, { orderNumber: res.number, orderId: res.id });
    await recordServerEvent("payment_failure", { userId: res.userId, props: { orderNumber: res.number, provider: info.provider, reason: info.reason } });
  }
  return res;
}

/** Releases all holds on an unpaid order. Used by expiry and cancellation. */
export async function releaseOrderHolds(orderId: string, finalStatus: "EXPIRED" | "CANCELLED") {
  return db.$transaction(async (tx) => {
    const order = await tx.order.findUnique({ where: { id: orderId }, include: { items: true } });
    if (!order || order.paymentStatus === "PAID" || order.status === "EXPIRED" || order.status === "CANCELLED") return null;
    for (const it of order.items) if (it.warehouseId) await releaseStock(tx, it.variantId, it.warehouseId, it.quantity, order.number);
    await releaseReservedCredit(tx, orderId);
    await tx.couponRedemption.deleteMany({ where: { orderId } });
    return tx.order.update({ where: { id: orderId }, data: { status: finalStatus, cancelledAt: finalStatus === "CANCELLED" ? new Date() : null } });
  });
}

export async function expireStaleOrders(now = new Date()) {
  const stale = await db.order.findMany({ where: { status: { in: ["PENDING_PAYMENT", "PAYMENT_FAILED"] }, paymentStatus: { not: "PAID" }, expiresAt: { lt: now } }, select: { id: true } });
  let n = 0;
  for (const o of stale) if (await releaseOrderHolds(o.id, "EXPIRED")) n++;
  return n;
}

/** Admin refund. Razorpay refunds go to the provider; sandbox refunds complete locally; otherwise MANUAL_REQUIRED. */
export async function refundOrder(orderId: string, amountPaise: number, reason: string, actorId: string) {
  const order = await db.order.findUnique({ where: { id: orderId }, include: { payments: true, refunds: true } });
  if (!order) throw new AppError("Order not found", "NOT_FOUND", 404);
  if (order.paymentStatus !== "PAID" && order.paymentStatus !== "PARTIALLY_REFUNDED") throw new AppError("Only paid orders can be refunded.");
  const refunded = order.refunds.filter((r) => r.status === "COMPLETED" || r.status === "PROCESSING").reduce((s, r) => s + r.amountPaise, 0);
  if (amountPaise <= 0 || amountPaise + refunded > order.totalPaise) throw new AppError("Refund amount exceeds the refundable balance.");
  const payment = order.payments.find((p) => p.status === "CAPTURED");
  let status = "MANUAL_REQUIRED";
  let providerRefundId: string | null = null;
  if (payment?.provider === "SANDBOX") { status = "COMPLETED"; providerRefundId = `sbx_rfnd_${Date.now()}`; }
  else if (payment?.provider === "RAZORPAY" && razorpayConfigured() && payment.providerPaymentId) {
    try {
      const r = await createProviderRefund(payment.providerPaymentId, amountPaise, { orderNumber: order.number });
      providerRefundId = r.id; status = r.status === "processed" ? "COMPLETED" : "PROCESSING";
    } catch (e) { log.error("refund failed", { orderId, error: e }); status = "FAILED"; }
  }
  const full = amountPaise + refunded >= order.totalPaise;
  await db.$transaction(async (tx) => {
    await tx.refund.create({ data: { orderId, paymentId: payment?.id ?? null, amountPaise, reason, status, providerRefundId, actorId } });
    if (status === "COMPLETED" || status === "PROCESSING") {
      await tx.order.update({ where: { id: orderId }, data: { paymentStatus: full ? "REFUNDED" : "PARTIALLY_REFUNDED", status: full ? "REFUNDED" : "PARTIALLY_REFUNDED" } });
      if (full) { await reverseCreditsForRefund(tx, orderId); await reverseLoyaltyForOrder(tx, orderId); }
    }
  });
  return { status, providerRefundId };
}
