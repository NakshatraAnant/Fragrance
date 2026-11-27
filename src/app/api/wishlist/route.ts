import { NextResponse } from "next/server";
import { z } from "zod";
import { db } from "@/lib/db";
import { getCurrentUser, ensureGuestToken, readGuestToken } from "@/lib/auth";
import { recordServerEvent } from "@/lib/analytics";

export const dynamic = "force-dynamic";

async function owner() {
  const user = await getCurrentUser();
  return user ? { userId: user.id } : { guestToken: await readGuestToken() };
}

export async function GET() {
  const o = await owner();
  if (!("userId" in o) && !o.guestToken) return NextResponse.json({ productIds: [] });
  const rows = await db.wishlistItem.findMany({ where: o.userId ? { userId: o.userId } : { guestToken: o.guestToken! }, select: { productId: true } });
  return NextResponse.json({ productIds: rows.map((r) => r.productId) }, { headers: { "Cache-Control": "no-store" } });
}

export async function POST(req: Request) {
  const parsed = z.object({ productId: z.string().min(1) }).safeParse(await req.json().catch(() => ({})));
  if (!parsed.success) return NextResponse.json({ error: "Invalid request." }, { status: 400 });
  const product = await db.product.findUnique({ where: { id: parsed.data.productId }, select: { id: true } });
  if (!product) return NextResponse.json({ error: "Not found." }, { status: 404 });
  const user = await getCurrentUser();
  const where = user ? { userId: user.id, productId: product.id } : { guestToken: await ensureGuestToken(), productId: product.id };
  const existing = await db.wishlistItem.findFirst({ where });
  if (existing) await db.wishlistItem.delete({ where: { id: existing.id } });
  else { await db.wishlistItem.create({ data: where }); await recordServerEvent("wishlist_add", { userId: user?.id, productId: product.id }); }
  const rows = await db.wishlistItem.findMany({ where: user ? { userId: user.id } : { guestToken: where.guestToken! }, select: { productId: true } });
  return NextResponse.json({ saved: !existing, productIds: rows.map((r) => r.productId) });
}
