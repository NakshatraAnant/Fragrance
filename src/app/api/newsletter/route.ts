import { NextResponse } from "next/server";
import { z } from "zod";
import { recordConsent } from "@/lib/messaging";
import { clientIp, getCurrentUser } from "@/lib/auth";
import { rateLimit } from "@/lib/rate-limit";

export async function POST(req: Request) {
  const ip = await clientIp();
  if (!rateLimit(`nl:${ip}`, 8, 60_000).ok) return NextResponse.json({ error: "Too many attempts. Try again shortly." }, { status: 429 });
  const parsed = z.object({ email: z.string().trim().toLowerCase().email(), consent: z.literal(true) }).safeParse(await req.json().catch(() => ({})));
  if (!parsed.success) return NextResponse.json({ error: "Enter a valid email and tick the consent box." }, { status: 400 });
  const user = await getCurrentUser();
  await recordConsent({ userId: user?.id, email: parsed.data.email, channel: "EMAIL", granted: true, source: "newsletter", ip });
  return NextResponse.json({ message: "Thank you — you're on the list." });
}
