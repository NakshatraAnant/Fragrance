/**
 * Local payment sandbox: NO real money and NO bank contact. It exists so the full order lifecycle
 * (reservation → verified payment event → confirmation / failure → retry) can be exercised locally.
 * Events are HMAC-signed with PAYMENTS_SANDBOX_SECRET and verified exactly like a provider webhook
 * before any order state changes. Disabled in production unless explicitly enabled.
 */
import { env } from "../env";
import { hmacHex, safeEqualHex } from "./razorpay";

export type SandboxEvent = { eventId: string; type: "payment.captured" | "payment.failed"; orderId: string; paymentId: string; amountPaise: number; method: string; reason?: string; issuedAt: number };

export function signSandboxEvent(ev: SandboxEvent) {
  const body = JSON.stringify(ev);
  return { body, signature: hmacHex(env.sandboxSecret(), body) };
}

export function verifySandboxSignature(body: string, signature: string | null) {
  if (!signature) return false;
  return safeEqualHex(hmacHex(env.sandboxSecret(), body), signature);
}
