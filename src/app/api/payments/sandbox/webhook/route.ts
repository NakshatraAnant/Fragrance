import { NextResponse } from "next/server";
import { handleSandboxEvent } from "@/lib/payments";
import { sandboxPaymentsEnabled } from "@/lib/env";
import { AppError } from "@/lib/logger";

/** Sandbox webhook endpoint (test mode only). Requires a valid HMAC signature in X-Sandbox-Signature. */
export async function POST(req: Request) {
  if (!sandboxPaymentsEnabled()) return NextResponse.json({ error: "Sandbox disabled" }, { status: 404 });
  const raw = await req.text();
  try {
    return NextResponse.json(await handleSandboxEvent(raw, req.headers.get("x-sandbox-signature")));
  } catch (e) {
    if (e instanceof AppError) return NextResponse.json({ error: e.message }, { status: e.status });
    return NextResponse.json({ error: "Invalid event" }, { status: 400 });
  }
}
