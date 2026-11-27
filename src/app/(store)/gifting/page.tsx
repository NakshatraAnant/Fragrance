import type { Metadata } from "next";
import Link from "next/link";
import { db } from "@/lib/db";
import { getAllCards } from "@/lib/catalog";
import { getSetting } from "@/lib/settings";
import { findGifts, GIFT_OCCASIONS } from "@/lib/gifting";
import { formatINR } from "@/lib/money";
import { PageHeader } from "@/components/listing/listing";
import { ProductGrid } from "@/components/product/product-card";
import { AddAllButton } from "@/components/product/add-all";
import { EmptyState } from "@/components/ui/empty-state";

export const metadata: Metadata = { title: "The Gifting Atelier", description: "Fragrance gifts by recipient, occasion and budget, with gift wrap and a personal message.", alternates: { canonical: "/gifting" } };

type SP = { recipient?: string; occasion?: string; budget?: string; preference?: string };

export default async function GiftingPage({ searchParams }: { searchParams: Promise<SP> }) {
  const sp = await searchParams;
  const [cards, bundles, shipping] = await Promise.all([getAllCards(), db.bundle.findMany({ where: { isActive: true }, include: { items: true } }), getSetting("shipping")]);
  const asked = Boolean(sp.recipient || sp.occasion || sp.budget || sp.preference);
  const results = asked ? findGifts(cards, { recipient: sp.recipient, occasion: sp.occasion, budgetMaxPaise: sp.budget ? Number(sp.budget) * 100 : null, preference: sp.preference }).slice(0, 12) : [];
  const byId = new Map(cards.map((c) => [c.id, c]));
  const sel = (name: keyof SP, label: string, opts: [string, string][]) => (
    <label className="field"><span className="label">{label}</span><select name={name} defaultValue={sp[name] ?? ""} className="select">{opts.map(([v, l]) => <option key={v} value={v}>{l}</option>)}</select></label>
  );
  return (
    <>
      <PageHeader eyebrow="The Gifting Atelier" title="Gifts that feel considered" intro={`Every order can be gift-wrapped${shipping.giftWrapPaise ? ` (${formatINR(shipping.giftWrapPaise)})` : ""} with a personal message, and prices are hidden on the slip. Engraving is offered in our boutiques.`} crumbs={[{ name: "Gifting", href: "/gifting" }]} />
      <section className="container-x pb-12">
        <form className="card grid gap-4 p-6 md:grid-cols-5 md:items-end" aria-label="Gift finder">
          {sel("recipient", "For", [["", "Anyone"], ["her", "Her"], ["him", "Him"], ["them", "Them"], ["home", "Their home"]])}
          {sel("occasion", "Occasion", [["", "Any occasion"], ...Object.entries(GIFT_OCCASIONS).map(([k, v]) => [k, v.title.replace(/ gifting| gifts/i, "")] as [string, string])])}
          {sel("budget", "Budget", [["", "Any budget"], ["1000", "Under ₹1,000"], ["3000", "Under ₹3,000"], ["5000", "Under ₹5,000"], ["15000", "Under ₹15,000"]])}
          {sel("preference", "They like", [["", "Not sure"], ["fresh", "Fresh & clean"], ["floral", "Floral & fruity"], ["warm", "Warm & spicy"], ["woody", "Woody & earthy"]])}
          <button className="btn btn-primary">Find gifts</button>
        </form>
      </section>
      {asked && (
        <section className="container-x pb-16" aria-live="polite">
          <h2 className="display mb-6 text-3xl">{results.length ? `${results.length} gift ideas` : "No matches"}</h2>
          {results.length ? <ProductGrid products={results} list="gift-finder" /> : <EmptyState title="Nothing fits all of that" body="Try a wider budget, or give a discovery set so they can choose their own full size."><Link href="/discovery" className="btn btn-primary">Discovery sets</Link></EmptyState>}
        </section>
      )}
      <section className="container-x pb-16">
        <h2 className="display mb-6 text-3xl">Shop by occasion</h2>
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">{Object.entries(GIFT_OCCASIONS).map(([k, v]) => <Link key={k} href={`/gifting/${k}`} className="lift card p-7"><p className="display text-3xl">{v.title}</p><p className="mt-2 text-sm text-muted">{v.intro}</p></Link>)}</div>
      </section>
      <section className="container-x pb-16">
        <h2 className="display mb-2 text-3xl">Gift bundles</h2>
        <p className="mb-6 text-sm text-muted">Curated pairings at their everyday prices. Bundles add something extra, not a markdown.</p>
        <div className="grid gap-4 md:grid-cols-3">
          {bundles.map((b) => {
            const items = b.items.map((i) => byId.get(i.productId)).filter(Boolean);
            const ok = items.every((i) => i!.available);
            const total = items.reduce((s, i) => s + i!.minPricePaise, 0);
            return (
              <div key={b.id} className="card flex flex-col p-6">
                <p className="display text-2xl">{b.name}</p><p className="mt-2 text-sm text-muted">{b.description}</p>
                <ul className="mt-3 text-sm">{items.map((i) => <li key={i!.id}>· {i!.name} {i!.subtitle} ({i!.variants[0]?.label})</li>)}</ul>
                <p className="mt-3 font-semibold">{formatINR(total)}</p>
                <div className="mt-auto pt-4">{ok ? <AddAllButton variantIds={items.map((i) => i!.variants.find((v) => v.available > 0)!.id)} label="Add bundle to bag" /> : <span className="text-sm text-danger">Part of this bundle is out of stock</span>}</div>
              </div>
            );
          })}
        </div>
      </section>
      <section className="container-x pb-8 text-sm text-muted"><p>Gift cards aren't available yet.</p></section>
    </>
  );
}
