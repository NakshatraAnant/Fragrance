"use client";
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { track } from "@/components/analytics-tracker";

type Opt = { value: string; label: string; hint?: string; colour?: string };
type Answers = { families: string[]; likedNotes: string[]; dislikedNotes: string[]; moods: string[]; occasions: string[]; seasons: string[]; intensity: string; formats: string[]; budgetMaxPaise: number | null; leaning: string; brands: string[] };
const EMPTY: Answers = { families: [], likedNotes: [], dislikedNotes: [], moods: [], occasions: [], seasons: [], intensity: "ANY", formats: [], budgetMaxPaise: null, leaning: "any", brands: [] };

export function FinderQuiz({ families, notes }: { families: { slug: string; name: string; colour: string; description: string }[]; notes: { slug: string; name: string }[] }) {
  const router = useRouter();
  const [step, setStep] = useState(-1);
  const [a, setA] = useState<Answers>(EMPTY);
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  const noteOpts: Opt[] = notes.map((n) => ({ value: n.slug, label: n.name }));
  const STEPS: { key: keyof Answers; title: string; sub: string; options: Opt[]; multi: boolean; max?: number }[] = [
    { key: "families", title: "Which scent families draw you in?", sub: "Pick up to four. Not sure? Choose the ones that sound like a place you'd like to be.", multi: true, max: 4, options: families.map((f) => ({ value: f.slug, label: f.name, hint: f.description, colour: f.colour })) },
    { key: "likedNotes", title: "Any notes you already love?", sub: "Optional. These come from our scents' creative briefs.", multi: true, max: 6, options: noteOpts },
    { key: "dislikedNotes", title: "Anything you'd rather avoid?", sub: "We'll leave out scents whose brief includes these notes.", multi: true, max: 8, options: noteOpts },
    { key: "moods", title: "How do you want to feel?", sub: "Pick up to three.", multi: true, max: 3, options: ["fresh", "playful", "calm", "romantic", "warm", "bold", "opulent", "grounded", "clean", "sensual"].map((m) => ({ value: m, label: m[0].toUpperCase() + m.slice(1) })) },
    { key: "occasions", title: "When will you wear it?", sub: "Pick any that apply.", multi: true, max: 5, options: [["daily", "Every day"], ["office", "Office"], ["evening", "Evenings out"], ["date", "Dates"], ["party", "Parties & sangeets"], ["wedding", "Weddings"], ["festive", "Festivals"], ["gym", "Gym & sport"], ["travel", "Travel"], ["prayer", "Prayer & puja"]].map(([v, l]) => ({ value: v, label: l })) },
    { key: "seasons", title: "What's your climate and season?", sub: "Heat and humidity change how scent behaves.", multi: true, max: 4, options: [["summer", "Hot summer"], ["monsoon", "Humid monsoon"], ["winter", "Cool winter"], ["all-season", "All year round"]].map(([v, l]) => ({ value: v, label: l })) },
    { key: "intensity", title: "How present should it be?", sub: "This guide is based on concentration. It isn't a longevity claim.", multi: false, options: [["SOFT", "Soft — close to the skin", "Mists, solids"], ["MODERATE", "Moderate — noticed, not loud", "Eau de parfum"], ["RICH", "Rich — a statement", "Extraits, oils"], ["ANY", "No preference"]].map(([v, l, h]) => ({ value: v, label: l, hint: h })) },
    { key: "formats", title: "Which formats would you use?", sub: "Pick any. Leave blank for wearable fragrance.", multi: true, max: 7, options: [["EDP", "Eau de parfum"], ["MIST", "Body & hair mist"], ["ATTAR", "Attar / perfume oil"], ["EXTRAIT", "Extrait de parfum"], ["TRAVEL", "Travel spray"], ["SOLID", "Solid perfume"], ["HOME", "Home fragrance"]].map(([v, l]) => ({ value: v, label: l })) },
    { key: "budgetMaxPaise", title: "What's your budget?", sub: "Per product.", multi: false, options: [["50000", "Up to ₹500"], ["100000", "Up to ₹1,000"], ["300000", "Up to ₹3,000"], ["500000", "Up to ₹5,000"], ["1500000", "Up to ₹15,000"], ["", "No limit"]].map(([v, l]) => ({ value: v, label: l })) },
    { key: "leaning", title: "A little about your style", sub: "Optional. Most of our scents are unisex, and this only nudges the ranking.", multi: false, options: [["any", "No preference"], ["feminine", "Leaning feminine"], ["masculine", "Leaning masculine"], ["unisex", "Unisex"]].map(([v, l]) => ({ value: v, label: l })) },
  ];

  useEffect(() => { if (step === 0) track("finder_start"); }, [step]);

  const s = STEPS[step];
  const current = s ? a[s.key] : null;
  const isOn = (v: string) => (s?.multi ? (current as string[]).includes(v) : s?.key === "budgetMaxPaise" ? String(a.budgetMaxPaise ?? "") === v : current === v);
  const choose = (v: string) => {
    if (!s) return;
    if (s.multi) {
      const arr = current as string[];
      const next = arr.includes(v) ? arr.filter((x) => x !== v) : s.max && arr.length >= s.max ? arr : [...arr, v];
      // A note can't be both liked and disliked
      if (s.key === "dislikedNotes") setA((p) => ({ ...p, dislikedNotes: next, likedNotes: p.likedNotes.filter((x) => !next.includes(x)) }));
      else setA((p) => ({ ...p, [s.key]: next }));
    } else if (s.key === "budgetMaxPaise") setA((p) => ({ ...p, budgetMaxPaise: v ? Number(v) : null }));
    else setA((p) => ({ ...p, [s.key]: v }));
  };

  async function finish() {
    setBusy(true); setErr(null);
    const res = await fetch("/api/finder", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(a) });
    const d = await res.json().catch(() => ({}));
    if (!res.ok) { setErr(d.error ?? "Something went wrong."); setBusy(false); return; }
    router.push(`/scent-finder/results/${d.shareId}`);
  }

  if (step === -1) return (
    <section className="relative overflow-hidden grain">
      <div aria-hidden className="absolute inset-0 -z-10" style={{ background: "conic-gradient(from 200deg at 70% 40%, #e6d6b0, #b5725a, #8fa889, #5b8fc9, #e6d6b0)", opacity: 0.35, filter: "blur(60px)" }} />
      <div className="container-x grid min-h-[78svh] place-content-center py-20 text-center">
        <p className="eyebrow">The Scent Finder</p>
        <h1 className="display mx-auto mt-4 max-w-4xl text-[clamp(3rem,7vw,6rem)]">Find a scent that feels like yours.</h1>
        <p className="lede mx-auto mt-6">Ten short questions. We match your answers against every product's family, notes, mood, occasion, climate, intensity, format and price, and show you why each one fits.</p>
        <div className="mt-10"><button className="btn btn-primary" onClick={() => setStep(0)} data-testid="finder-start">Begin</button></div>
        <p className="mx-auto mt-6 max-w-md text-xs text-muted">A transparent, rules-based match. It's a starting point, not a scientific prediction. Wear-test with a discovery set.</p>
      </div>
    </section>
  );

  const isLast = step === STEPS.length - 1;
  return (
    <section className="container-x max-w-4xl py-10" aria-live="polite">
      <div className="flex items-center gap-4">
        <button className="btn btn-ghost btn-sm" onClick={() => setStep((x) => x - 1)} aria-label="Previous question">←</button>
        <div className="h-1 flex-1 overflow-hidden rounded-full bg-surface-2" role="progressbar" aria-valuemin={1} aria-valuemax={STEPS.length} aria-valuenow={step + 1}><div className="h-full rounded-full bg-accent transition-all duration-500" style={{ width: `${((step + 1) / STEPS.length) * 100}%` }} /></div>
        <span className="text-sm text-muted">{step + 1} / {STEPS.length}</span>
      </div>
      <div key={step} className="animate-rise">
        <h1 className="display mt-10 text-4xl md:text-6xl">{s.title}</h1>
        <p className="mt-3 text-muted">{s.sub}{s.multi && s.max ? ` (${(current as string[]).length}/${s.max})` : ""}</p>
        <div className={`mt-8 ${s.options.length > 12 ? "flex flex-wrap gap-2" : "grid gap-3 sm:grid-cols-2"}`} role="group" aria-label={s.title}>
          {s.options.map((o) => s.options.length > 12 ? (
            <button key={o.value} type="button" className="chip" aria-pressed={isOn(o.value)} onClick={() => choose(o.value)}>{o.label}</button>
          ) : (
            <button key={o.value} type="button" aria-pressed={isOn(o.value)} onClick={() => choose(o.value)} data-testid={`opt-${o.value}`}
              className={`flex items-start gap-3 rounded-[var(--radius)] border p-4 text-left transition ${isOn(o.value) ? "border-ink bg-ink text-bg" : "border-line bg-surface hover:border-ink"}`}>
              {o.colour && <span aria-hidden className="mt-1 h-4 w-4 shrink-0 rounded-full" style={{ background: o.colour }} />}
              <span><span className="block font-semibold">{o.label}</span>{o.hint && <span className={`mt-0.5 block text-sm ${isOn(o.value) ? "text-bg/70" : "text-muted"}`}>{o.hint}</span>}</span>
            </button>
          ))}
        </div>
      </div>
      {err && <p role="alert" className="mt-6 text-danger">{err}</p>}
      <div className="mt-10 flex flex-wrap items-center justify-between gap-3">
        <button className="btn btn-ghost" onClick={() => (isLast ? finish() : setStep((x) => x + 1))} disabled={busy}>Skip</button>
        <button className="btn btn-primary" onClick={() => (isLast ? finish() : setStep((x) => x + 1))} disabled={busy} data-testid="finder-next">{isLast ? (busy ? "Matching…" : "See my matches") : "Next"}</button>
      </div>
    </section>
  );
}
