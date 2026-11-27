import Link from "next/link";
import { db } from "@/lib/db";
import { requireStaff } from "@/lib/auth";
import { answerQuestion, moderateReview } from "@/app/actions/admin/crm";
import { formatDate } from "@/lib/money";
import { AdminHeader, Flash, Pill, Section, statusTone } from "@/components/admin/ui";

export default async function ReviewsAdmin({ searchParams }: { searchParams: Promise<{ status?: string; msg?: string; err?: string }> }) {
  await requireStaff("reviews:write", "/admin/reviews");
  const sp = await searchParams;
  const status = sp.status ?? "PENDING";
  const [reviews, questions] = await Promise.all([
    db.review.findMany({ where: { status }, include: { product: true, user: { select: { email: true } }, media: true }, orderBy: { createdAt: "desc" } }),
    db.productQuestion.findMany({ where: { status: "PENDING" }, include: { product: true }, orderBy: { createdAt: "asc" } }),
  ]);
  return (
    <>
      <AdminHeader title="Reviews & Q&A" sub="Only genuine customer reviews. Nothing is seeded or generated. Verified purchase is computed from paid orders.">
        {["PENDING", "APPROVED", "REJECTED"].map((s) => <Link key={s} href={`/admin/reviews?status=${s}`} className={`btn btn-sm ${s === status ? "btn-primary" : "btn-outline"}`}>{s.toLowerCase()}</Link>)}
      </AdminHeader>
      <Flash msg={sp.msg} err={sp.err} />
      <Section title={`Reviews · ${status.toLowerCase()} (${reviews.length})`}>
        {reviews.length === 0 ? <p className="text-muted">No reviews in this state.</p> : (
          <ul className="grid gap-3">{reviews.map((r) => (
            <li key={r.id} className="card p-4">
              <div className="flex flex-wrap items-center gap-2 text-sm"><strong>{r.rating}★ {r.title}</strong><Pill tone={statusTone(r.status)}>{r.status}</Pill>{r.isVerifiedPurchase && <Pill tone="ok">Verified purchase</Pill>}<span className="text-muted">{r.product.name} · {r.user.email} · {formatDate(r.createdAt, true)}</span></div>
              <p className="mt-2 whitespace-pre-line text-sm">{r.body}</p>
              {r.media.length > 0 && <div className="mt-2 flex gap-2">{r.media.map((m) => m.kind === "VIDEO" ? <video key={m.id} src={m.url} className="h-20" controls /> : <img key={m.id} src={m.url} alt="" className="h-20 w-20 rounded object-cover" />)}</div>}
              <form action={moderateReview} className="mt-3 flex flex-wrap items-center gap-2"><input type="hidden" name="id" value={r.id} /><input name="note" placeholder="Moderation note (optional)" className="input !min-h-8 max-w-xs !py-1 text-xs" />
                {r.status !== "APPROVED" && <button name="status" value="APPROVED" className="btn btn-primary btn-sm">Approve</button>}{r.status !== "REJECTED" && <button name="status" value="REJECTED" className="btn btn-outline btn-sm">Reject</button>}</form>
            </li>
          ))}</ul>
        )}
      </Section>
      <Section title={`Questions awaiting an answer (${questions.length})`}>
        {questions.length === 0 ? <p className="text-muted">No open questions.</p> : (
          <ul className="grid gap-3">{questions.map((q) => (
            <li key={q.id} className="card p-4 text-sm">
              <p><strong>{q.question}</strong> <span className="text-muted">— {q.name} on {q.product.name} · {formatDate(q.createdAt)}</span></p>
              <form action={answerQuestion} className="mt-2 flex flex-wrap gap-2"><input type="hidden" name="id" value={q.id} /><input name="answer" className="input !min-h-9 flex-1 !py-1 text-sm" placeholder="Answer (published on the product page)" /><button name="op" value="answer" className="btn btn-primary btn-sm">Publish</button><button name="op" value="reject" className="btn btn-outline btn-sm">Reject</button></form>
            </li>
          ))}</ul>
        )}
      </Section>
    </>
  );
}
