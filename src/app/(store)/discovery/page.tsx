import type { Metadata } from "next";
import Link from "next/link";
import { db } from "@/lib/db";
import { getAllCards } from "@/lib/catalog";
import { getSetting } from "@/lib/settings";
import { getCurrentUser } from "@/lib/auth";
import { availableCredits } from "@/lib/credits";
import { formatINR, formatDate, perUnit } from "@/lib/money";
import { PageHeader } from "@/components/listing/listing";
import { ProductCardView } from "@/components/product/product-card";
import { AddAllButton } from "@/components/product/add-all";

export const metadata: Metadata = { title: "Discovery Studio", description: "Wear-test our scents at home with discovery sets. The set price is credited on your first full size.", alternates: { canonical: "/discovery" } };

export default async function DiscoveryStudio() {
  const [cards, rule, user, sets] = await Promise.all([
    getAllCards(), getSetting("discoveryCredit"), getCurrentUser(),
    db.product.findMany({ where: { isDiscoverySet: true, status: "ACTIVE", deletedAt: null }, include: { setContents: { include: { product: { include: { concept: { include: { notes: { include: { note: true }, orderBy: { position: "asc" } } } }, families: { include: { family: true }, orderBy: { weight: "desc" } } } } } }, brand: true, variants: true }, orderBy: { merchRank: "asc" } }),
  ]);
  const credits = user ? await availableCredits(user.id, user.email) : [];
  const history = user ? await db.discoveryCredit.findMany({ where: { userId: user.id }, orderBy: { issuedAt: "desc" }, take: 10 }) : [];
  const byId = new Map(cards.map((c) => [c.id, c]));
  // Customer favourites: real wishlist saves across set contents (shown only when data exists).
  const favRows = await db.wishlistItem.groupBy({ by: ["productId"], where: { product: { inSets: { some: {} } } }, _count: { _all: true }, orderBy: { _count: { productId: "desc" } }, take: 4 });
  const favourites = favRows.filter((f) => f._count._all > 0).map((f) => byId.get(f.productId)).filter(Boolean);
  return (
    <>
      <PageHeader eyebrow="Discovery Studio" title="Try before you commit" intro="You can't smell a perfume online, so we built sampling into the way you shop. Wear-test at home, find your favourite, and the set price comes back as credit on a full size." crumbs={[{ name: "Discovery Studio", href: "/discovery" }]} />
      <section className="container-x grid gap-4 pb-12 md:grid-cols-3">
        {[["1", "Choose a set", "Dhun, Vasana, the Attar Atelier or Anvaya."], ["2", "Wear-test at home", "A few days each, on skin, in your climate."], ["3", "Redeem your credit", rule.enabled ? `Use the set price on your first eligible full size within ${rule.validityDays} days.` : "Credits are currently paused."]].map(([n, t, d]) => (
          <div key={n} className="card p-6"><p className="display text-5xl text-accent">{n}</p><p className="mt-3 font-semibold">{t}</p><p className="text-sm text-muted">{d}</p></div>
        ))}
      </section>

      {user && (
        <section className="container-x pb-12">
          <div className="card p-6">
            <p className="font-semibold">Your discovery credits</p>
            {credits.length ? <ul className="mt-2 text-sm">{credits.map((c) => <li key={c.id}>{formatINR(c.amountPaise)} available · expires {formatDate(c.expiresAt)}</li>)}</ul> : <p className="mt-1 text-sm text-muted">No credits available right now.</p>}
            {history.length > 0 && <details className="mt-3 text-sm"><summary className="cursor-pointer">Redemption history</summary><ul className="mt-2 text-muted">{history.map((h) => <li key={h.id}>{formatINR(h.amountPaise)} · issued {formatDate(h.issuedAt)} · {h.status.toLowerCase()}{h.redeemedAt ? ` on ${formatDate(h.redeemedAt)}` : ""}</li>)}</ul></details>}
          </div>
        </section>
      )}

      {sets.map((s) => {
        const card = byId.get(s.id);
        const fullSizes = s.setContents.map((c) => byId.get(c.productId)).filter(Boolean);
        const isSource = rule.enabled && s.variants.some((v) => rule.sourceSkus.includes(v.sku));
        return (
          <section key={s.id} className="container-x border-t border-line py-16" aria-labelledby={`set-${s.slug}`}>
            <div className="grid gap-10 lg:grid-cols-[22rem_1fr]">
              <div>{card && <ProductCardView p={card} list="discovery-studio" compact />}
                <p className={`mt-4 text-sm ${isSource ? "text-ok" : "text-muted"}`}>{isSource ? "✓ Earns a discovery credit on purchase (signed-in customers)." : "Doesn't earn a discovery credit."}</p>
              </div>
              <div>
                <p className="eyebrow">{s.brand.name}</p>
                <h2 id={`set-${s.slug}`} className="display mt-2 text-4xl">{s.name}</h2>
                <p className="mt-2 text-muted">{s.contentsNote}</p>
                <div className="mt-6 overflow-x-auto">
                  <table className="w-full min-w-[36rem] text-left text-sm">
                    <caption className="sr-only">Samples in {s.name}</caption>
                    <thead className="text-xs uppercase tracking-widest text-muted"><tr><th className="py-2">Sample</th><th>Family</th><th>Top</th><th>Heart</th><th>Base</th><th>Full size</th></tr></thead>
                    <tbody className="divide-y divide-line">
                      {s.setContents.map((c) => {
                        const notes = (l: string) => c.product.concept?.notes.filter((n) => n.layer === l).map((n) => n.note.name).slice(0, 2).join(", ");
                        const full = byId.get(c.productId);
                        return (
                          <tr key={c.id}>
                            <td className="py-3"><Link href={`/product/${c.product.slug}`} className="font-semibold underline-offset-4 hover:underline">{c.product.name}</Link><span className="block text-xs text-muted">{c.vialSize}</span></td>
                            <td><span className="inline-flex items-center gap-1.5"><span className="h-2.5 w-2.5 rounded-full" style={{ background: c.product.families[0]?.family.colour }} />{c.product.families[0]?.family.name}</span></td>
                            <td>{notes("TOP")}</td><td>{notes("HEART")}</td><td>{notes("BASE")}</td>
                            <td>{full ? `${formatINR(full.minPricePaise)}${full.variants[0] ? ` · ${perUnit(full.variants[0].pricePaise, full.variants[0].netQuantity, full.variants[0].netUnit)}` : ""}` : "—"}</td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
                {fullSizes.length > 0 && card?.variants[0] && <div className="mt-6"><AddAllButton variantIds={[card.variants[0].id]} label={`Add ${s.name} to bag`} /></div>}
              </div>
            </div>
          </section>
        );
      })}

      {favourites.length > 0 && <section className="container-x py-12"><h2 className="display text-3xl">Customer favourites</h2><p className="mt-1 text-sm text-muted">The sampled scents customers save most.</p><div className="mt-6 grid grid-cols-2 gap-6 lg:grid-cols-4">{favourites.map((c, i) => <ProductCardView key={c!.id} p={c!} position={i} list="discovery-favourites" compact />)}</div></section>}

      <section className="container-x py-12" id="terms">
        <h2 className="display text-3xl">Discovery credit terms</h2>
        <ul className="prose-house mt-4 list-disc">
          <li>Credits are issued only once the payment for an eligible discovery set ({rule.sourceSkus.join(", ")}) has been verified by our payment provider. They are not issued for unpaid, failed or cancelled orders.</li>
          <li>A credit equals the price you paid for the set. It is valid for {rule.validityDays} days and can be used once on an eligible full-size product ({rule.eligibleFormats.join(", ").toLowerCase()}).{rule.excludedBrands.length ? ` It is not valid on ${rule.excludedBrands.join(", ")}.` : ""}</li>
          <li>Credits can be used across our houses. They can't be exchanged for cash or combined with another credit on the same order. They are applied after any coupon.</li>
          <li>You need to be signed in to use a credit. A credit earned on a guest order follows your email: create an account with the same email to use it.</li>
          <li>If the order that issued a credit is refunded, the unused credit is cancelled. If an order that used a credit is refunded, the credit is restored while it is still within its validity.</li>
        </ul>
      </section>
    </>
  );
}
