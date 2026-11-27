import { NextResponse } from "next/server";
import { z } from "zod";
import { db } from "@/lib/db";
import { getCurrentUser, clientIp } from "@/lib/auth";
import { rateLimit } from "@/lib/rate-limit";

export async function POST(req: Request) {
  if (!rateLimit(`q:${await clientIp()}`, 5, 3600_000).ok) return NextResponse.json({ error: "Too many questions. Please try later." }, { status: 429 });
  const p = z.object({ productId: z.string().min(1), name: z.string().trim().min(2).max(60), question: z.string().trim().min(10, "Please write a full question.").max(600) }).safeParse(await req.json().catch(() => ({})));
  if (!p.success) return NextResponse.json({ error: p.error.issues[0].message }, { status: 400 });
  const user = await getCurrentUser();
  await db.productQuestion.create({ data: { ...p.data, userId: user?.id ?? null } });
  return NextResponse.json({ ok: true, message: "Thanks. Our team will answer and publish your question." });
}
