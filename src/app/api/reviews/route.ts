import { NextResponse } from "next/server";
import { z } from "zod";
import { db } from "@/lib/db";
import { getCurrentUser, clientIp } from "@/lib/auth";
import { rateLimit } from "@/lib/rate-limit";
import { saveUpload } from "@/lib/uploads";
import { getSetting } from "@/lib/settings";
import { recordServerEvent } from "@/lib/analytics";
import { AppError } from "@/lib/logger";

const Schema = z.object({
  productId: z.string().min(1),
  rating: z.coerce.number().int().min(1).max(5),
  title: z.string().trim().min(3, "Add a short title.").max(120),
  body: z.string().trim().min(20, "Tell us a little more (20+ characters).").max(3000),
});

/** Reviews: signed-in customers only, one per product, moderated before publishing. Verified-purchase flag is computed server-side. */
export async function POST(req: Request) {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: "Please sign in to write a review." }, { status: 401 });
  if (!rateLimit(`review:${user.id}:${await clientIp()}`, 5, 3600_000).ok) return NextResponse.json({ error: "Too many reviews. Please try later." }, { status: 429 });
  const form = await req.formData();
  const parsed = Schema.safeParse(Object.fromEntries(["productId", "rating", "title", "body"].map((k) => [k, form.get(k)])));
  if (!parsed.success) return NextResponse.json({ error: parsed.error.issues[0].message }, { status: 400 });
  const { productId, rating, title, body } = parsed.data;
  const product = await db.product.findUnique({ where: { id: productId } });
  if (!product) return NextResponse.json({ error: "Product not found." }, { status: 404 });
  if (await db.review.findUnique({ where: { productId_userId: { productId, userId: user.id } } })) return NextResponse.json({ error: "You've already reviewed this product." }, { status: 409 });
  const purchased = await db.orderItem.findFirst({ where: { variant: { productId }, order: { userId: user.id, paymentStatus: "PAID" } } });
  const cfg = await getSetting("reviews");
  try {
    const media: { url: string; kind: string }[] = [];
    if (cfg.allowMedia) {
      for (const f of form.getAll("media").slice(0, 4)) {
        if (!(f instanceof File) || f.size === 0) continue;
        const saved = await saveUpload(f, { allow: ["IMAGE", "VIDEO"], maxBytes: 10 * 1024 * 1024, folder: "reviews" });
        media.push({ url: saved.url, kind: saved.kind });
      }
    }
    const review = await db.review.create({
      data: { productId, userId: user.id, rating, title, body, orderItemId: purchased?.id ?? null, isVerifiedPurchase: Boolean(purchased), status: cfg.autoApprove ? "APPROVED" : "PENDING", media: { create: media } },
    });
    await recordServerEvent("review_submit", { userId: user.id, productId, props: { rating, verified: Boolean(purchased) } });
    return NextResponse.json({ ok: true, status: review.status, message: review.status === "APPROVED" ? "Thank you — your review is live." : "Thank you — your review will appear once it's been moderated." });
  } catch (e) {
    if (e instanceof AppError) return NextResponse.json({ error: e.message }, { status: 400 });
    throw e;
  }
}
