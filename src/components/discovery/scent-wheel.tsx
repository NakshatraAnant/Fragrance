"use client";
import Link from "next/link";
import { useState } from "react";

type Fam = { slug: string; name: string; colour: string; description: string; count: number };

/** Interactive fragrance-family wheel (keyboard accessible). */
export function ScentWheel({ families }: { families: Fam[] }) {
  const [active, setActive] = useState(0);
  const n = families.length;
  const R = 160, r = 70, cx = 180, cy = 180;
  const arc = (i: number) => {
    const a0 = (i / n) * 2 * Math.PI - Math.PI / 2, a1 = ((i + 1) / n) * 2 * Math.PI - Math.PI / 2;
    const p = (rad: number, a: number) => `${cx + rad * Math.cos(a)} ${cy + rad * Math.sin(a)}`;
    return `M ${p(r, a0)} L ${p(R, a0)} A ${R} ${R} 0 0 1 ${p(R, a1)} L ${p(r, a1)} A ${r} ${r} 0 0 0 ${p(r, a0)} Z`;
  };
  const f = families[active];
  return (
    <div className="grid items-center gap-10 md:grid-cols-[minmax(0,26rem)_1fr]">
      <svg viewBox="0 0 360 360" className="mx-auto w-full max-w-[26rem]" role="group" aria-label="Fragrance family wheel">
        {families.map((fam, i) => (
          <path key={fam.slug} d={arc(i)} fill={fam.colour} stroke="var(--bg)" strokeWidth="2" tabIndex={0} role="button" aria-label={fam.name} aria-pressed={i === active}
            onMouseEnter={() => setActive(i)} onFocus={() => setActive(i)} onClick={() => setActive(i)}
            style={{ transformOrigin: "180px 180px", transform: i === active ? "scale(1.05)" : "scale(1)", opacity: i === active ? 1 : 0.78, transition: "transform 300ms, opacity 300ms", cursor: "pointer", outline: "none" }} />
        ))}
        <circle cx={cx} cy={cy} r={r - 6} fill="var(--surface)" />
        <text x={cx} y={cy - 4} textAnchor="middle" className="display" style={{ fontSize: 17, fill: "var(--ink)" }}>{f.name}</text>
        <text x={cx} y={cy + 18} textAnchor="middle" style={{ fontSize: 11, fill: "var(--muted)" }}>{f.count} product{f.count === 1 ? "" : "s"}</text>
      </svg>
      <div aria-live="polite">
        <p className="eyebrow">Family {active + 1} of {n}</p>
        <h3 className="display mt-2 text-4xl md:text-5xl">{f.name}</h3>
        <p className="lede mt-4">{f.description}</p>
        <div className="mt-6 flex flex-wrap gap-3">
          <Link href={`/families/${f.slug}`} className="btn btn-primary">Explore {f.name}</Link>
          <Link href="/scent-finder" className="btn btn-ghost">Not sure? Take the Scent Finder</Link>
        </div>
        <div className="mt-8 flex flex-wrap gap-2">
          {families.map((x, i) => <button key={x.slug} className="chip text-xs" data-active={i === active} onClick={() => setActive(i)}><span className="h-2.5 w-2.5 rounded-full" style={{ background: x.colour }} />{x.name}</button>)}
        </div>
      </div>
    </div>
  );
}
