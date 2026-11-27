import { NextResponse } from "next/server";
import { estimateDelivery } from "@/lib/shipping";
import { getSetting } from "@/lib/settings";
import { clientIp } from "@/lib/auth";
import { rateLimit } from "@/lib/rate-limit";

export async function GET(req: Request) {
  if (!rateLimit(`pin:${await clientIp()}`, 60, 60_000).ok) return NextResponse.json({ ok: false, message: "Too many checks. Try again shortly." }, { status: 429 });
  const code = new URL(req.url).searchParams.get("code") ?? "";
  const [est, cod] = await Promise.all([estimateDelivery(code), getSetting("cod")]);
  if (est.ok && est.serviceable) return NextResponse.json({ ...est, codAllowed: cod.enabled && est.codAllowed });
  return NextResponse.json(est);
}
