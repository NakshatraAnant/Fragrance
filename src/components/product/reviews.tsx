"use client";
import { useMemo, useState } from "react";
import Link from "next/link";
import { Stars } from "@/components/ui/stars";
import { useToast } from "@/components/ui/toast";

type R = { id: string; rating: number; title: string; body: string; isVerifiedPurchase: boolean; helpfulCount: number; createdAt: string; author: string; media: { url: string; kind: string }[] };
type Q = { id: string; name: string; question: string; answer: string | null; answeredAt: string | null };

export function ReviewsBlock({ productId, reviews, signedIn }: { productId: string; reviews: R[]; signedIn: boolean }) {
  const [filter, setFilter] = useState<number | "verified" | "media" | null>(null);
  const [sort, setSort] = useState<"recent" | "helpful" | "high" | "low">("recent");
  const [writing, setWriting] = useState(false);
  const { toast } = useToast();
  const avg = reviews.length ? reviews.reduce((s, r) => s + r.rating, 0) / reviews.length : 0;
  const shown = useMemo(() => {
    let r = reviews.filter((x) => filter === null || (filter === "verified" ? x.isVerifiedPurchase : filter === "media" ? x.media.length > 0 : x.rating === filter));
    r = [...r].sort((a, b) => sort === "helpful" ? b.helpfulCount - a.helpfulCount : sort === "high" ? b.rating - a.rating : sort === "low" ? a.rating - b.rating : b.createdAt.localeCompare(a.createdAt));
    return r;
  }, [reviews, filter, sort]);

  async function vote(id: string) {
    const res = await fetch("/api/reviews/vote", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ reviewId: id }) });
    const d = await res.json();
    toast(res.ok ? "Thanks for your feedback." : d.error, res.ok ? "success" : "error");
  }

  return (
    <section id="reviews" className="scroll-mt-24" aria-labelledby="reviews-h">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <h2 id="reviews-h" className="display text-4xl">Reviews</h2>
          {reviews.length > 0 ? <div className="mt-2 flex items-center gap-3"><Stars value={avg} count={reviews.length} size={18} /><span className="text-sm">{avg.toFixed(1)} out of 5</span></div> : <p className="mt-2 text-muted">No reviews yet. We only publish reviews from real customers, after moderation.</p>}
        </div>
        {signedIn ? <button className="btn btn-outline" onClick={() => setWriting((w) => !w)}>{writing ? "Cancel" : "Write a review"}</button> : <Link href="/account/login" className="btn btn-outline">Sign in to review</Link>}
      </div>
      {writing && <ReviewForm productId={productId} onDone={() => setWriting(false)} />}
      {reviews.length > 0 && (
        <>
          <div className="mt-6 flex flex-wrap items-center gap-2">
            <button className="chip text-sm" aria-pressed={filter === null} onClick={() => setFilter(null)}>All</button>
            {[5, 4, 3, 2, 1].map((n) => <button key={n} className="chip text-sm" aria-pressed={filter === n} onClick={() => setFilter(n)}>{n}★ ({reviews.filter((r) => r.rating === n).length})</button>)}
            <button className="chip text-sm" aria-pressed={filter === "verified"} onClick={() => setFilter("verified")}>Verified purchase</button>
            <button className="chip text-sm" aria-pressed={filter === "media"} onClick={() => setFilter("media")}>With photos/video</button>
            <select className="select ml-auto !min-h-9 w-auto !py-1 text-sm" value={sort} onChange={(e) => setSort(e.target.value as typeof sort)} aria-label="Sort reviews">
              <option value="recent">Most recent</option><option value="helpful">Most helpful</option><option value="high">Highest rated</option><option value="low">Lowest rated</option>
            </select>
          </div>
          <ul className="mt-6 divide-y divide-line">
            {shown.map((r) => (
              <li key={r.id} className="py-6">
                <div className="flex items-center gap-3"><Stars value={r.rating} />{r.isVerifiedPurchase && <span className="badge badge-ok">Verified purchase</span>}</div>
                <p className="mt-2 font-semibold">{r.title}</p>
                <p className="mt-1 whitespace-pre-line text-muted">{r.body}</p>
                {r.media.length > 0 && <div className="mt-3 flex gap-2">{r.media.map((m) => m.kind === "VIDEO" ? <video key={m.url} src={m.url} controls className="h-28 rounded" /> : <img key={m.url} src={m.url} alt="Customer photo" className="h-28 w-28 rounded object-cover" loading="lazy" />)}</div>}
                <p className="mt-3 text-xs text-muted">{r.author} · {new Date(r.createdAt).toLocaleDateString("en-IN")} · <button className="underline" onClick={() => vote(r.id)}>Helpful ({r.helpfulCount})</button></p>
              </li>
            ))}
          </ul>
        </>
      )}
    </section>
  );
}

function ReviewForm({ productId, onDone }: { productId: string; onDone: () => void }) {
  const [rating, setRating] = useState(0);
  const [msg, setMsg] = useState<{ ok: boolean; text: string } | null>(null);
  const [busy, setBusy] = useState(false);
  async function submit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    if (!rating) { setMsg({ ok: false, text: "Choose a star rating." }); return; }
    setBusy(true);
    const fd = new FormData(e.currentTarget);
    fd.set("rating", String(rating)); fd.set("productId", productId);
    const res = await fetch("/api/reviews", { method: "POST", body: fd });
    const d = await res.json();
    setBusy(false);
    setMsg({ ok: res.ok, text: d.message ?? d.error });
    if (res.ok) setTimeout(onDone, 2500);
  }
  return (
    <form onSubmit={submit} className="card mt-6 grid gap-4 p-6" aria-label="Write a review">
      <fieldset><legend className="label mb-2">Your rating</legend>
        <div className="flex gap-1">{[1, 2, 3, 4, 5].map((n) => <button key={n} type="button" aria-label={`${n} star${n > 1 ? "s" : ""}`} aria-pressed={rating === n} onClick={() => setRating(n)} className={`text-3xl ${n <= rating ? "text-gold" : "text-line"}`}>★</button>)}</div>
      </fieldset>
      <div className="field"><label className="label" htmlFor="rv-title">Title</label><input id="rv-title" name="title" className="input" required maxLength={120} /></div>
      <div className="field"><label className="label" htmlFor="rv-body">Your review</label><textarea id="rv-body" name="body" className="textarea" required minLength={20} maxLength={3000} placeholder="How did it open, how did it dry down, and when did you wear it?" /></div>
      <div className="field"><label className="label" htmlFor="rv-media">Photos or video (optional, up to 4, 10 MB each)</label><input id="rv-media" name="media" type="file" accept="image/jpeg,image/png,image/webp,video/mp4,video/webm" multiple className="text-sm" /></div>
      {msg && <p role="status" className={msg.ok ? "text-ok" : "text-danger"}>{msg.text}</p>}
      <button className="btn btn-primary justify-self-start" disabled={busy}>{busy ? "Submitting…" : "Submit review"}</button>
    </form>
  );
}

export function QuestionsBlock({ productId, questions }: { productId: string; questions: Q[] }) {
  const [name, setName] = useState("");
  const [question, setQuestion] = useState("");
  const [msg, setMsg] = useState<{ ok: boolean; text: string } | null>(null);
  async function submit(e: React.FormEvent) {
    e.preventDefault();
    const res = await fetch("/api/questions", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ productId, name, question }) });
    const d = await res.json();
    setMsg({ ok: res.ok, text: d.message ?? d.error });
    if (res.ok) { setQuestion(""); }
  }
  return (
    <section aria-labelledby="qa-h">
      <h2 id="qa-h" className="display text-4xl">Questions & answers</h2>
      {questions.length === 0 ? <p className="mt-2 text-muted">No questions yet. Ask the house below.</p> : (
        <dl className="mt-6 divide-y divide-line">
          {questions.map((q) => <div key={q.id} className="py-4"><dt className="font-semibold">Q: {q.question}</dt><dd className="mt-1 text-muted">A: {q.answer}</dd><dd className="mt-1 text-xs text-muted">Asked by {q.name}</dd></div>)}
        </dl>
      )}
      <form onSubmit={submit} className="mt-6 grid gap-3 md:grid-cols-[12rem_1fr_auto] md:items-end">
        <div className="field"><label className="label" htmlFor="qa-name">Your name</label><input id="qa-name" className="input" value={name} onChange={(e) => setName(e.target.value)} required minLength={2} /></div>
        <div className="field"><label className="label" htmlFor="qa-q">Your question</label><input id="qa-q" className="input" value={question} onChange={(e) => setQuestion(e.target.value)} required minLength={10} /></div>
        <button className="btn btn-outline">Ask</button>
      </form>
      {msg && <p role="status" className={`mt-2 text-sm ${msg.ok ? "text-ok" : "text-danger"}`}>{msg.text}</p>}
    </section>
  );
}
