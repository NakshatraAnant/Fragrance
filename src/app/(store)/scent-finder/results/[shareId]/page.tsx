import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { db } from "@/lib/db";
import { getCurrentUser } from "@/lib/auth";
import { getAllCards } from "@/lib/catalog";
import { ProductCardView } from "@/components/product/product-card";
import { FamilyBars } from "@/components/discovery/family-bars";
import { ShareResult } from "@/components/discovery/share-result";
import { claimProfile } from "@/app/actions/discovery";

type P = { params: Promise<{ shareId: string }> };
type Stored = { matches: { productId: string; score: number; reasons: string[] }[]; discoverySet: { productId: string; slug: string; name: string; covers: number; reason: string } | null; familyProfile: { slug: string; name: string; colour: string; value: number }[]; excludedCount: number; exclusions: { name: string; reason: string }[] };

export async function generateMetadata({ params }: P): Promise<Metadata> {
  const p = await db.scentProfile.findUnique({ where: { shareId: (await params).shareId } });
  return p ? { title: `${p.personalityTitle} — my Scent Finder result`, description: p.summary, robots: { index: false } } : {};
}

export default async function ResultsPage({ params }: P) {
  const { shareId } = await params;
  const profile = await db.scentProfile.findUnique({ where: { shareId } });
  if (!profile) notFound();
  const [user, cards] = await Promise.all([getCurrentUser(), getAllCards()]);
  const r = JSON.parse(profile.results) as Stored;
  const byId = new Map(cards.map((c) => [c.id, c]));
  const matches = r.matches.map((m) => ({ ...m, card: byId.get(m.productId) })).filter((m) => m.card);
  const set = r.discoverySet ? byId.get(r.discoverySet.productId) : null;
  const owned = user && profile.userId === user.id;
  return (
    <div>
      <section className="relative overflow-hidden bg-ink text-bg grain">
        <div aria-hidden className="absolute inset-0 opacity-40" style={{ background: `radial-gradient(50% 60% at 80% 30%, ${r.familyProfile[0]?.colour ?? "#b5725a"}, transparent), radial-gradient(40% 50% at 15% 85%, ${r.familyProfile[1]?.colour ?? "#c9a24a"}, transparent)` }} />
        <div className="container-x relative grid gap-12 py-20 md:grid-cols-[1.3fr_1fr] md:items-center">
          <div className="animate-rise">
            <p className="eyebrow !text-bg/60">Your fragrance personality</p>
            <h1 className="display mt-4 text-[clamp(3rem,7vw,6rem)]" data-testid="personality">{profile.personalityTitle}</h1>
            <p className="mt-6 max-w-xl text-xl text-bg/80">{profile.summary}</p>
            <div className="mt-8 flex flex-wrap gap-3">
              {owned ? <span className="badge badge-ok">Saved to your Wardrobe</span> : user ? <form action={claimProfile}><input type="hidden" name="shareId" value={shareId} /><button className="btn btn-accent">Save my profile</button></form> : <Link href={`/account/login?next=/scent-finder/results/${shareId}`} className="btn btn-accent">Sign in to save my profile</Link>}
              <ShareResult title={profile.personalityTitle} />
              <Link href="/scent-finder" className="btn btn-outline !border-bg !text-bg">Retake</Link>
            </div>
          </div>
          <div className="rounded-[var(--radius)] bg-bg/5 p-6 backdrop-blur"><p className="eyebrow mb-4 !text-bg/60">Family profile</p><FamilyBars data={r.familyProfile} dark /></div>
        </div>
      </section>
      <section className="container-x py-16">
        <h2 className="display text-4xl">Your top matches</h2>
        <p className="mt-2 text-sm text-muted">The match score shows how well a product fits your answers under our rules. It's not a scientific prediction of how a scent will wear on your skin.{r.excludedCount ? ` We left out ${r.excludedCount} product${r.excludedCount === 1 ? "" : "s"} because of your exclusions, budget or stock.` : ""}</p>
        {matches.length === 0 ? (
          <div className="mt-8 card p-8 text-center"><p className="display text-2xl">No products match all of your answers</p><p className="mt-2 text-muted">Try widening your budget or formats, or start with a discovery set.</p><div className="mt-4 flex justify-center gap-3"><Link href="/scent-finder" className="btn btn-primary">Retake</Link><Link href="/discovery" className="btn btn-outline">Discovery sets</Link></div></div>
        ) : (
          <ol className="mt-10 grid gap-x-6 gap-y-12 sm:grid-cols-2 lg:grid-cols-3" data-testid="matches">
            {matches.map((m, i) => (
              <li key={m.productId} className="reveal" style={{ transitionDelay: `${i * 80}ms` }}>
                <div className="mb-3 flex items-center justify-between"><span className="display text-3xl text-muted">#{i + 1}</span><span className="badge badge-accent" title="Rules-based preference match">{m.score}% match</span></div>
                <ProductCardView p={m.card!} position={i} list="finder-results" compact />
                <ul className="mt-3 grid gap-1 text-sm text-muted">{m.reasons.slice(0, 4).map((x) => <li key={x}>✓ {x}</li>)}</ul>
              </li>
            ))}
          </ol>
        )}
      </section>
      {set && r.discoverySet && (
        <section className="container-x pb-16">
          <div className="grid items-center gap-8 rounded-[var(--radius)] bg-surface-2 p-8 md:grid-cols-[1.4fr_1fr] md:p-12">
            <div><p className="eyebrow">Wear-test before you commit</p><h2 className="display mt-3 text-4xl">{set.name}</h2><p className="mt-3 text-muted">{r.discoverySet.reason} Its price is credited on your first eligible full size.</p><Link href={`/product/${set.slug}`} className="btn btn-primary mt-6">Get the discovery set</Link></div>
            <ProductCardView p={set} list="finder-discovery" compact />
          </div>
        </section>
      )}
      {r.exclusions.length > 0 && <section className="container-x pb-16"><details className="text-sm text-muted"><summary className="cursor-pointer">Why some scents weren't recommended</summary><ul className="mt-2">{r.exclusions.map((e, i) => <li key={i}>{e.name}: {e.reason}</li>)}</ul></details></section>}
    </div>
  );
}
