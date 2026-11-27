import type { Metadata } from "next";
import Link from "next/link";
import { db } from "@/lib/db";
import { requireUser } from "@/lib/auth";
import { Stars } from "@/components/ui/stars";
import { formatDate } from "@/lib/money";

export const metadata: Metadata = { title: "My reviews", robots: { index: false } };

export default async function MyReviews() {
  const user = await requireUser("/account/reviews");
  const [reviews, purchased] = await Promise.all([
    db.review.findMany({ where: { userId: user.id }, include: { product: true }, orderBy: { createdAt: "desc" } }),
    db.orderItem.findMany({ where: { order: { userId: user.id, paymentStatus: "PAID" } }, include: { variant: { include: { product: true } } }, distinct: ["variantId"] }),
  ]);
  const reviewed = new Set(reviews.map((r) => r.productId));
  const toReview = [...new Map(purchased.filter((p) => !reviewed.has(p.variant.productId)).map((p) => [p.variant.productId, p.variant.product])).values()];
  return (
    <div className="grid gap-10">
      <h1 className="display text-5xl">My reviews</h1>
      {toReview.length > 0 && (
        <section><h2 className="display text-2xl">Waiting for your review</h2>
          <ul className="mt-3 flex flex-wrap gap-2">{toReview.map((p) => <li key={p.id}><Link href={`/product/${p.slug}#reviews`} className="chip">{p.name} · {p.subtitle}</Link></li>)}</ul>
        </section>
      )}
      {reviews.length === 0 ? <p className="text-muted">You haven't written any reviews yet.</p> : (
        <ul className="divide-y divide-line">{reviews.map((r) => (
          <li key={r.id} className="py-5"><div className="flex items-center gap-3"><Stars value={r.rating} /><span className="badge">{r.status.toLowerCase()}</span>{r.isVerifiedPurchase && <span className="badge badge-ok">Verified purchase</span>}</div>
            <p className="mt-2 font-semibold">{r.title}</p><p className="text-sm text-muted">{r.body}</p><p className="mt-1 text-xs text-muted"><Link className="underline" href={`/product/${r.product.slug}`}>{r.product.name}</Link> · {formatDate(r.createdAt)}{r.moderationNote ? ` · Moderator: ${r.moderationNote}` : ""}</p></li>
        ))}</ul>
      )}
    </div>
  );
}
