"use client";
import Link from "next/link";
import { useMemo, useState } from "react";
import type { ProductCard } from "@/lib/catalog";
import { ProductVisual } from "@/components/product/product-visual";
import { ProductCardView } from "@/components/product/product-card";
import { AddAllButton } from "@/components/product/add-all";
import { saveLayering } from "@/app/actions/discovery";

type Pair = { id: string; a: string; b: string; title: string; rationale: string; sequence: string; source: string };

export function LayeringStudio({ wearable, home, pairs, initialId, savedPairIds, signedIn }: { wearable: ProductCard[]; home: ProductCard[]; pairs: Pair[]; initialId?: string; savedPairIds: string[]; signedIn: boolean }) {
  const [id, setId] = useState(initialId ?? wearable[0]?.id);
  const byId = useMemo(() => new Map(wearable.map((c) => [c.id, c])), [wearable]);
  const primary = byId.get(id ?? "");
  const pairedIds = new Set(pairs.flatMap((p) => [p.a, p.b]));
  const mine = pairs.filter((p) => p.a === id || p.b === id);
  const homeSameScent = primary?.conceptId ? home.filter((h) => h.conceptId === primary.conceptId) : [];
  return (
    <div className="grid gap-10 lg:grid-cols-[20rem_1fr]">
      <aside>
        <label htmlFor="primary" className="label">Choose your primary fragrance</label>
        <select id="primary" className="select mt-2" value={id} onChange={(e) => setId(e.target.value)}>
          {wearable.map((c) => <option key={c.id} value={c.id}>{c.name} — {c.subtitle} ({c.brand.name}){pairedIds.has(c.id) ? " ★" : ""}</option>)}
        </select>
        <p className="mt-2 text-xs text-muted">★ has a curated pairing</p>
        {primary && <div className="mt-6"><ProductVisual name={primary.name} format={primary.format} brand={primary.brand.slug} colour={primary.colour} image={primary.image} className="aspect-[4/5] rounded-[var(--radius)]" /></div>}
      </aside>
      <div className="grid content-start gap-10">
        {mine.length === 0 ? (
          <div className="card p-8">
            <p className="display text-2xl">No curated pairing yet</p>
            <p className="mt-2 text-muted">Our perfumers haven't approved a layering partner for {primary?.name ?? "this scent"} yet, and we won't suggest one without a curated compatibility mapping. Scents with a pairing are marked ★.</p>
            <div className="mt-4 flex flex-wrap gap-2">{pairs.map((p) => { const a = byId.get(p.a); return a ? <button key={p.id} className="chip text-sm" onClick={() => setId(p.a)}>{p.title}</button> : null; })}</div>
          </div>
        ) : mine.map((p) => {
          const partner = byId.get(p.a === id ? p.b : p.a);
          const first = byId.get(p.a);
          const second = byId.get(p.b);
          if (!partner || !first || !second || !primary) return null;
          return (
            <article key={p.id} className="card overflow-hidden" data-testid="layering-pair">
              <div className="grid grid-cols-2">
                <ProductVisual name={first.name} format={first.format} brand={first.brand.slug} colour={first.colour} className="aspect-square" label={false} />
                <ProductVisual name={second.name} format={second.format} brand={second.brand.slug} colour={second.colour} className="aspect-square" label={false} />
              </div>
              <div className="p-6 md:p-8">
                <h2 className="display text-3xl">{p.title}</h2>
                <p className="mt-3">{p.rationale}</p>
                <ol className="mt-5 grid gap-2 text-sm">
                  {p.sequence.split(/,\s*then\s*|\.\s+/i).filter(Boolean).map((step, i) => <li key={i} className="flex gap-3"><span className="display text-xl text-accent">{i + 1}</span><span>{step.replace(/\.$/, "")}.</span></li>)}
                </ol>
                <p className="mt-4 text-xs text-muted">Source: {p.source}</p>
                <div className="mt-6 flex flex-wrap gap-3">
                  {first.variants[0] && second.variants[0] && first.available && second.available ? <AddAllButton variantIds={[first.variants.find((v) => v.available > 0)!.id, second.variants.find((v) => v.available > 0)!.id]} label="Add both to bag" /> : <span className="text-sm text-danger">One of these is currently out of stock.</span>}
                  {signedIn ? (savedPairIds.includes(p.id) ? <span className="badge badge-ok self-center">Saved to your Wardrobe</span> : <form action={saveLayering}><input type="hidden" name="pairId" value={p.id} /><button className="btn btn-outline">Save combination</button></form>) : <Link href="/account/login?next=/layering" className="btn btn-outline">Sign in to save</Link>}
                </div>
              </div>
            </article>
          );
        })}
        {homeSameScent.length > 0 && (
          <section><h2 className="display text-2xl">Scent your home with {primary?.name}</h2><p className="mt-1 text-sm text-muted">The same scent story, made as a home fragrance.</p><div className="mt-5 grid grid-cols-2 gap-6 md:grid-cols-3">{homeSameScent.map((h, i) => <ProductCardView key={h.id} p={h} position={i} list="layering-home" compact />)}</div></section>
        )}
      </div>
    </div>
  );
}
