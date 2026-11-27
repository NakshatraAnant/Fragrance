import { db } from "../db";
import { env, razorpayConfigured, sandboxPaymentsEnabled } from "../env";
import { AppError, log } from "../logger";
import { createProviderOrder, fetchProviderPayment, verifyCheckoutSignature, verifyWebhookSignature } from "./razorpay";
import { signSandboxEvent, verifySandboxSignature, type SandboxEvent } from "./sandbox";
import { markOrderPaid, markPaymentFailed, recordPaymentEvent } from "./process";
import { randomToken } from "../password";

export type PaymentMode = "RAZORPAY" | "SANDBOX" | "UNAVAILABLE";

export function activePaymentMode(): PaymentMode {
  if (razorpayConfigured()) return "RAZORPAY";
  if (sandboxPaymentsEnabled()) return "SANDBOX";
  return "UNAVAILABLE";
}

/** Prepares a payment attempt for an order (new attempt on each retry). */
export async function preparePayment(orderId: string) {
  const order = await db.order.findUnique({ where: { id: orderId } });
  if (!order) throw new AppError("Order not found", "NOT_FOUND", 404);
  if (order.paymentStatus === "PAID") return { mode: "PAID" as const, order };
  if (order.status === "EXPIRED" || order.status === "CANCELLED") throw new AppError("This order has expired. Your items have been released.", "ORDER_EXPIRED", 410);
  const mode = activePaymentMode();
  if (mode === "RAZORPAY") {
    const po = await createProviderOrder(order.totalPaise, order.number, { orderId: order.id, orderNumber: order.number });
    await db.payment.create({ data: { orderId, provider: "RAZORPAY", providerOrderId: po.id, amountPaise: order.totalPaise } });
    return { mode, order, razorpay: { keyId: env.razorpay().keyId, providerOrderId: po.id, amount: order.totalPaise } };
  }
  if (mode === "SANDBOX") return { mode, order };
  throw new AppError("Online payment is not configured on this environment.", "PAYMENTS_UNCONFIGURED", 503);
}

/** Razorpay Checkout success callback → verify signature server-side, then confirm with the API. */
export async function verifyRazorpayCheckout(input: { orderId: string; razorpayOrderId: string; razorpayPaymentId: string; razorpaySignature: string }) {
  const attempt = await db.payment.findUnique({ where: { providerOrderId: input.razorpayOrderId } });
  if (!attempt || attempt.orderId !== input.orderId) throw new AppError("Payment attempt not recognised.", "PAYMENT_UNKNOWN", 400);
  if (!verifyCheckoutSignature(input.razorpayOrderId, input.razorpayPaymentId, input.razorpaySignature)) {
    log.warn("razorpay signature mismatch", { orderId: input.orderId });
    throw new AppError("We couldn't verify this payment. If you were charged, it will be reconciled automatically.", "SIGNATURE_INVALID", 400);
  }
  const p = await fetchProviderPayment(input.razorpayPaymentId);
  if (p.order_id !== input.razorpayOrderId) throw new AppError("Payment does not belong to this order.", "PAYMENT_MISMATCH", 400);
  if (p.status === "captured" || p.status === "authorized") return markOrderPaid(input.orderId, { provider: "RAZORPAY", providerPaymentId: p.id, providerOrderId: p.order_id, amountPaise: p.amount, method: p.method });
  if (p.status === "failed") { await markPaymentFailed(input.orderId, { provider: "RAZORPAY", providerPaymentId: p.id, amountPaise: p.amount, reason: p.error_description ?? "failed" }); return null; }
  return null; // still pending — webhook will finalise
}

export async function handleRazorpayWebhook(rawBody: string, signature: string | null, eventIdHeader: string | null) {
  const verified = verifyWebhookSignature(rawBody, signature);
  const payload = JSON.parse(rawBody) as { event: string; payload?: { payment?: { entity?: { id: string; order_id: string; amount: number; method: string; error_description?: string; notes?: { orderId?: string } } } } };
  const ent = payload.payload?.payment?.entity;
  const eventId = eventIdHeader || `${payload.event}:${ent?.id ?? randomToken(6)}`;
  const { event, duplicate } = await recordPaymentEvent("RAZORPAY", eventId, payload.event, rawBody, verified);
  if (!verified) throw new AppError("Invalid webhook signature", "SIGNATURE_INVALID", 401);
  if (duplicate || !ent) return { duplicate };
  const attempt = await db.payment.findUnique({ where: { providerOrderId: ent.order_id } });
  const orderId = attempt?.orderId ?? ent.notes?.orderId;
  if (!orderId) return { ignored: true };
  if (payload.event === "payment.captured" || payload.event === "order.paid") await markOrderPaid(orderId, { provider: "RAZORPAY", providerPaymentId: ent.id, providerOrderId: ent.order_id, amountPaise: ent.amount, method: ent.method });
  else if (payload.event === "payment.failed") await markPaymentFailed(orderId, { provider: "RAZORPAY", providerPaymentId: ent.id, amountPaise: ent.amount, reason: ent.error_description ?? "failed" });
  if (event) await db.paymentEvent.update({ where: { id: event.id }, data: { processedAt: new Date() } });
  return { ok: true };
}

/** Builds and signs a sandbox event (what a provider would send), then processes it through verification. */
export async function runSandboxPayment(orderId: string, outcome: "success" | "failure", method = "upi") {
  if (!sandboxPaymentsEnabled()) throw new AppError("The payment sandbox is disabled.", "SANDBOX_DISABLED", 403);
  const order = await db.order.findUnique({ where: { id: orderId } });
  if (!order) throw new AppError("Order not found", "NOT_FOUND", 404);
  const ev: SandboxEvent = { eventId: `sbx_evt_${randomToken(9)}`, type: outcome === "success" ? "payment.captured" : "payment.failed", orderId, paymentId: `sbx_pay_${randomToken(9)}`, amountPaise: order.totalPaise, method, reason: outcome === "failure" ? "Sandbox: payment declined by tester" : undefined, issuedAt: Date.now() };
  const { body, signature } = signSandboxEvent(ev);
  return handleSandboxEvent(body, signature);
}

export async function handleSandboxEvent(body: string, signature: string | null) {
  const verified = verifySandboxSignature(body, signature);
  const ev = JSON.parse(body) as SandboxEvent;
  const { event, duplicate } = await recordPaymentEvent("SANDBOX", ev.eventId, ev.type, body, verified);
  if (!verified) throw new AppError("Invalid sandbox signature", "SIGNATURE_INVALID", 401);
  if (duplicate) return { duplicate: true };
  let result;
  if (ev.type === "payment.captured") result = await markOrderPaid(ev.orderId, { provider: "SANDBOX", providerPaymentId: ev.paymentId, amountPaise: ev.amountPaise, method: ev.method });
  else result = await markPaymentFailed(ev.orderId, { provider: "SANDBOX", providerPaymentId: ev.paymentId, amountPaise: ev.amountPaise, reason: ev.reason ?? "failed" });
  if (event) await db.paymentEvent.update({ where: { id: event.id }, data: { processedAt: new Date() } });
  return { ok: true, result };
}
