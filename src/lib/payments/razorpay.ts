/**
 * Razorpay integration (India: UPI, cards, net banking, wallets) over its REST API — no SDK.
 * Only active when RAZORPAY_KEY_ID / RAZORPAY_KEY_SECRET are set. Orders are marked paid only after
 * (a) the checkout signature is verified server-side AND the payment is fetched from Razorpay and
 * confirmed captured/authorized, or (b) a webhook with a verified X-Razorpay-Signature arrives.
 */
import { createHmac, timingSafeEqual } from "node:crypto";
import { env, razorpayConfigured } from "../env";
import { AppError } from "../logger";

const API = "https://api.razorpay.com/v1";

function authHeader() {
  const { keyId, keySecret } = env.razorpay();
  return "Basic " + Buffer.from(`${keyId}:${keySecret}`).toString("base64");
}

export function safeEqualHex(a: string, b: string) {
  const ab = Buffer.from(a, "utf8"), bb = Buffer.from(b, "utf8");
  return ab.length === bb.length && timingSafeEqual(ab, bb);
}

export function hmacHex(secret: string, payload: string) {
  return createHmac("sha256", secret).update(payload).digest("hex");
}

/** Checkout signature = HMAC_SHA256(order_id + "|" + payment_id, key_secret). */
export function verifyCheckoutSignature(providerOrderId: string, paymentId: string, signature: string, secret = env.razorpay().keySecret) {
  if (!secret) return false;
  return safeEqualHex(hmacHex(secret, `${providerOrderId}|${paymentId}`), signature);
}

/** Webhook signature = HMAC_SHA256(raw body, webhook_secret). */
export function verifyWebhookSignature(rawBody: string, signature: string | null, secret = env.razorpay().webhookSecret) {
  if (!secret || !signature) return false;
  return safeEqualHex(hmacHex(secret, rawBody), signature);
}

async function call<T>(path: string, init: RequestInit = {}): Promise<T> {
  if (!razorpayConfigured()) throw new AppError("Razorpay is not configured.", "PAYMENTS_UNCONFIGURED", 503);
  const res = await fetch(`${API}${path}`, { ...init, headers: { Authorization: authHeader(), "Content-Type": "application/json", ...(init.headers ?? {}) } });
  const data = (await res.json().catch(() => ({}))) as T & { error?: { description?: string } };
  if (!res.ok) throw new AppError(`Payment provider error: ${data.error?.description ?? res.status}`, "PROVIDER_ERROR", 502);
  return data;
}

export async function createProviderOrder(amountPaise: number, receipt: string, notes: Record<string, string>) {
  return call<{ id: string; amount: number; currency: string; status: string }>("/orders", { method: "POST", body: JSON.stringify({ amount: amountPaise, currency: "INR", receipt, notes, payment_capture: 1 }) });
}

export async function fetchProviderPayment(paymentId: string) {
  return call<{ id: string; order_id: string; amount: number; status: string; method: string; error_description?: string }>(`/payments/${encodeURIComponent(paymentId)}`);
}

export async function createProviderRefund(paymentId: string, amountPaise: number, notes: Record<string, string>) {
  return call<{ id: string; status: string }>(`/payments/${encodeURIComponent(paymentId)}/refund`, { method: "POST", body: JSON.stringify({ amount: amountPaise, notes }) });
}
