"use client";
import { useState } from "react";
import { track } from "@/components/analytics-tracker";

export function NewsletterForm({ compact }: { compact?: boolean }) {
  const [email, setEmail] = useState("");
  const [consent, setConsent] = useState(false);
  const [state, setState] = useState<{ ok?: boolean; msg?: string }>({});
  const [busy, setBusy] = useState(false);
  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    const res = await fetch("/api/newsletter", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ email, consent }) });
    const d = await res.json().catch(() => ({}));
    setBusy(false);
    setState({ ok: res.ok, msg: d.message ?? d.error });
    if (res.ok) { track("newsletter_signup"); setEmail(""); }
  }
  return (
    <form onSubmit={submit} className="grid gap-3" aria-label="Newsletter sign-up">
      <div className={`flex gap-2 ${compact ? "" : "flex-col sm:flex-row"}`}>
        <label htmlFor={compact ? "nl-email-f" : "nl-email"} className="sr-only">Email address</label>
        <input id={compact ? "nl-email-f" : "nl-email"} type="email" required className="input" placeholder="Your email" value={email} onChange={(e) => setEmail(e.target.value)} autoComplete="email" />
        <button className="btn btn-primary shrink-0" disabled={busy || !consent}>{busy ? "…" : "Subscribe"}</button>
      </div>
      <label className="flex items-start gap-2 text-xs text-muted">
        <input type="checkbox" checked={consent} onChange={(e) => setConsent(e.target.checked)} className="mt-0.5 accent-[var(--accent)]" required />
        <span>Yes, email me news and offers. I can unsubscribe at any time (see the <a href="/privacy" className="underline">privacy policy</a>).</span>
      </label>
      {state.msg && <p role="status" className={`text-sm ${state.ok ? "text-ok" : "text-danger"}`}>{state.msg}</p>}
    </form>
  );
}
