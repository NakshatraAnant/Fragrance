import { NextResponse } from "next/server";
import { handleRazorpayWebhook } from "@/lib/payments";
import { AppError, log } from "@/lib/logger";

/** Razorpay webhook. Verifies X-Razorpay-Signature over the raw body; idempotent on event id. */
export async function POST(req: Request) {
  const raw = await req.text();
  try {
    const result = await handleRazorpayWebhook(raw, req.headers.get("x-razorpay-signature"), req.headers.get("x-razorpay-event-id"));
    return NextResponse.json(result);
  } catch (e) {
    if (e instanceof AppError) return NextResponse.json({ error: e.message }, { status: e.status });
    log.error("razorpay webhook failed", { error: e });
    return NextResponse.json({ error: "Webhook processing failed" }, { status: 500 });
  }
}
