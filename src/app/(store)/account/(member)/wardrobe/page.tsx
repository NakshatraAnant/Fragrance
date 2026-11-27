import type { Metadata } from "next";
import Link from "next/link";
import { db } from "@/lib/db";
import { requireUser } from "@/lib/auth";
import { getAllCards } from "@/lib/catalog";
import { getSetting } from "@/lib/settings";
import { rulesRecommender, EMPTY_ANSWERS, type FinderAnswers } from "@/lib/recommend";
import { ProductCardView } from "@/components/product/product-card";
import { ProductVisual } from "@/components/product/product-visual";
import { unsaveLayering } from "@/app/actions/account";
import { FamilyBars } from "@/components/discovery/family-bars";
import { formatDate } from "@/lib/money";

export const metadata: Metadata = { title: "Fragrance Wardrobe", robots: { index: false } };

export default async function WardrobePage() {
  const user = await requireUser("/account/wardrobe");
  const [profile, pref, cards, wish, items, views, layerings, reviews, days, weights] = await Promise.all([
    db.scentProfile.findFirst({ where: { userId: user.id }, orderBy: { createdAt: "desc" } }),
    db.customerPreference.findUnique({ where: { userId: user.id } }),
    getAllCards(),
    db.wishlistItem.findMany({ where: { userId: user.id }, select: { productId: true } }),
    db.orderItem.findMany({ where: { order: { userId: user.id, paymentStatus: "PAID" } }, include: { order: { select: { paidAt: true, number: true } }, variant: { select: { productId: true } } }, orderBy: { order: { paidAt: "desc" } } }),
    db.analyticsEvent.findMany({ where: { userId: user.id, name: "product_view", productId: { not: null } }, orderBy: { createdAt: "desc" }, take: 40, select: { productId: true } }),
    db.savedLayering.findMany({ where: { userId: user.id }, include: { pair: { include: { productA: true, productB: true } } } }),
    db.review.count({ where: { userId: user.id } }),
    getSetting("replenishmentDays"), getSetting("finderWeights"),
  ]);
  const byId = new Map(cards.map((c) => [c.id, c]));
  const owned = [...new Map(items.map((i) => [i.variant.productId, i])).values()];
  const ownedCards = owned.map((o) => byId.get(o.variant.productId)).filter(Boolean) as typeof cards;
  const discovery = items.filter((i) => i.format === "DISCOVERY");
  const explored = [...new Set(views.map((v) => v.productId!))].filter((id) => !owned.some((o) => o.variant.productId === id)).map((id) => byId.get(id)).filter(Boolean).slice(0, 6) as typeof cards;
  const replenish = owned.filter((o) => { const d = days[o.format]; return d && o.order.paidAt && Date.now() - o.order.paidAt.getTime() > d * 0.8 * 86400_000; }).map((o) => byId.get(o.variant.productId)).filter(Boolean).slice(0, 4) as typeof cards;

  // Personalised picks: from the saved Scent Finder profile, or (with profiling consent) from purchase families.
  let answers: FinderAnswers | null = null;
  if (profile) answers = { ...EMPTY_ANSWERS, ...(JSON.parse(profile.answers) as Partial<FinderAnswers>) };
  else if (pref?.profilingConsent && ownedCards.length) answers = { ...EMPTY_ANSWERS, families: [...new Set(ownedCards.flatMap((c) => c.families.slice(0, 1).map((f) => f.slug)))] };
  const recs = answers ? rulesRecommender.recommend(answers, cards.filter((c) => !owned.some((o) => o.variant.productId === c.id)), weights, 4) : null;
  const results = profile ? JSON.parse(profile.results) as { familyProfile: { slug: string; name: string; colour: string; value: number }[] } : null;

  return (
    <div className="grid gap-14">
      <header>
        <p className="eyebrow">Your collection</p>
        <h1 className="display mt-2 text-5xl">Fragrance Wardrobe</h1>
        <p className="mt-2 text-muted">{ownedCards.length} owned · {wish.length} saved · {layerings.length} layering pair{layerings.length === 1 ? "" : "s"} · {reviews} review{reviews === 1 ? "" : "s"}</p>
      </header>

      <section className="grid gap-6 rounded-[var(--radius)] bg-ink p-8 text-bg md:grid-cols-[1.2fr_1fr]">
        {profile ? (
          <>
            <div><p className="eyebrow !text-bg/60">Your scent profile · {formatDate(profile.createdAt)}</p><h2 className="display mt-3 text-4xl">{profile.personalityTitle}</h2><p className="mt-3 text-bg/75">{profile.summary}</p>
              <div className="mt-6 flex flex-wrap gap-3"><Link href={`/scent-finder/results/${profile.shareId}`} className="btn btn-accent">View results</Link><Link href="/scent-finder" className="btn btn-outline !border-bg !text-bg">Retake</Link></div></div>
            {results?.familyProfile && <FamilyBars data={results.familyProfile} dark />}
          </>
        ) : (
          <div className="md:col-span-2"><h2 className="display text-4xl">Build your scent profile</h2><p className="mt-3 text-bg/75">Ten questions about the families you love, notes to avoid, occasions and climate. Save the results here.</p><Link href="/scent-finder" className="btn btn-accent mt-6">Take the Scent Finder</Link></div>
        )}
      </section>

      <Shelf title="Owned" empty="Fragrances you buy will be collected here.">{ownedCards.map((c) => <Mini key={c.id} c={c} />)}</Shelf>
      {replenish.length > 0 && <section><h2 className="display text-3xl">Running low?</h2><p className="mt-1 text-sm text-muted">Based on typical use since you bought them.</p><div className="mt-6 grid grid-cols-2 gap-6 lg:grid-cols-4">{replenish.map((c, i) => <ProductCardView key={c.id} p={c} position={i} list="replenish" compact />)}</div></section>}
      <Shelf title="Favourites" empty="Tap the heart on any product to save it." href="/wishlist">{wish.map((w) => byId.get(w.productId)).filter(Boolean).map((c) => <Mini key={c!.id} c={c!} />)}</Shelf>

      <section>
        <h2 className="display text-3xl">Discovery history</h2>
        {discovery.length === 0 ? <p className="mt-2 text-muted">No discovery sets yet. <Link href="/discovery" className="underline">Try one</Link>. Its price is credited on your first full size.</p> : <ul className="mt-4 text-sm">{discovery.map((d) => <li key={d.id}>{d.productName} · order {d.order.number} · {d.order.paidAt ? formatDate(d.order.paidAt) : ""}</li>)}</ul>}
        <Link href="/account/loyalty" className="mt-3 inline-block text-sm underline">See my discovery credits</Link>
      </section>

      <section>
        <h2 className="display text-3xl">Saved layering combinations</h2>
        {layerings.length === 0 ? <p className="mt-2 text-muted">Save pairings from the <Link href="/layering" className="underline">Layering Studio</Link>.</p> : (
          <ul className="mt-4 grid gap-3 md:grid-cols-2">{layerings.map((l) => <li key={l.id} className="card p-5"><p className="display text-xl">{l.pair.title}</p><p className="mt-1 text-sm text-muted">{l.pair.sequence}</p><form action={unsaveLayering} className="mt-2"><input type="hidden" name="pairId" value={l.pairId} /><button className="text-xs underline">Remove</button></form></li>)}</ul>
        )}
      </section>

      {explored.length > 0 && <Shelf title="Recently explored">{explored.map((c) => <Mini key={c.id} c={c} />)}</Shelf>}

      {recs && recs.matches.length > 0 && (
        <section><h2 className="display text-3xl">Picked for you</h2><p className="mt-1 text-sm text-muted">{profile ? "Based on your saved scent profile." : "Based on the families you own, because you've allowed personalisation."} This is a rules-based match, not a guarantee.</p>
          <div className="mt-6 grid grid-cols-2 gap-6 lg:grid-cols-4">{recs.matches.map((m, i) => <div key={m.productId}><ProductCardView p={m.card} position={i} list="wardrobe-recs" compact /><p className="mt-2 text-xs text-muted">{m.reasons[0]}</p></div>)}</div>
        </section>
      )}
    </div>
  );
}

function Shelf({ title, children, empty, href }: { title: string; children: React.ReactNode; empty?: string; href?: string }) {
  const arr = Array.isArray(children) ? children : [children];
  return (
    <section>
      <div className="flex items-baseline justify-between"><h2 className="display text-3xl">{title}</h2>{href && <Link href={href} className="text-sm underline">See all</Link>}</div>
      {arr.length === 0 ? <p className="mt-2 text-muted">{empty}</p> : <div className="no-scrollbar mt-4 flex gap-4 overflow-x-auto pb-2">{children}</div>}
    </section>
  );
}

function Mini({ c }: { c: { slug: string; name: string; subtitle: string; format: string; brand: { slug: string }; colour: string | null; image: { url: string; alt: string } | null } }) {
  return <Link href={`/product/${c.slug}`} className="w-36 shrink-0"><ProductVisual name={c.name} format={c.format} brand={c.brand.slug} colour={c.colour} image={c.image} className="aspect-[4/5] rounded-[var(--radius)]" label={false} /><p className="mt-2 text-sm font-semibold">{c.name}</p><p className="text-xs text-muted">{c.subtitle}</p></Link>;
}
