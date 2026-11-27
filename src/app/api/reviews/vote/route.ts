import { NextResponse } from "next/server";
import { z } from "zod";
import { db } from "@/lib/db";
import { getCurrentUser } from "@/lib/auth";

export async function POST(req: Request) {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: "Sign in to vote." }, { status: 401 });
  const p = z.object({ reviewId: z.string().min(1) }).safeParse(await req.json().catch(() => ({})));
  if (!p.success) return NextResponse.json({ error: "Invalid request." }, { status: 400 });
  const review = await db.review.findUnique({ where: { id: p.data.reviewId } });
  if (!review || review.status !== "APPROVED") return NextResponse.json({ error: "Not found." }, { status: 404 });
  if (review.userId === user.id) return NextResponse.json({ error: "You can't vote on your own review." }, { status: 400 });
  try {
    await db.$transaction([db.reviewVote.create({ data: { reviewId: review.id, userId: user.id } }), db.review.update({ where: { id: review.id }, data: { helpfulCount: { increment: 1 } } })]);
  } catch {
    return NextResponse.json({ error: "You've already marked this helpful." }, { status: 409 });
  }
  return NextResponse.json({ ok: true, helpfulCount: review.helpfulCount + 1 });
}
