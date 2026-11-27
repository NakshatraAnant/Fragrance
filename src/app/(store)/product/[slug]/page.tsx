import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { db } from "@/lib/db";
import { getAllCards, getProductBySlug } from "@/lib/catalog";
import { availabilityFor } from "@/lib/inventory";
import { getSetting } from "@/lib/settings";
import { getCurrentUser } from "@/lib/auth";
import { formatINR, formatDate } from "@/lib/money";
import { env } from "@/lib/env";
import { Breadcrumbs } from "@/components/ui/breadcrumbs";
import { Gallery, StickyBuyBar } from "@/components/product/gallery";
import { PurchasePanel } from "@/components/product/purchase-panel";
import { NotesPyramid } from "@/components/product/notes-pyramid";
import { ReviewsBlock, QuestionsBlock } from "@/components/product/reviews";
import { ProductCardView } from "@/components/product/product-card";
import { RecentlyViewed, RecordView } from "@/components/product/local-lists";
import { JsonLd } from "@/components/seo/json-ld";
import { AddAllButton } from "@/components/product/add-all";

type P = { params: Promise<{ slug: string }>; searchParams: Promise<{ sku?: string }> };

export async function generateMetadata({ params }: P): Promise<Metadata> {
  const p = await getProductBySlug((await params).slug);
  if (!p) return { title: "Not found" };
  return { title: p.seoTitle ?? `${p.name} ${p.subtitle}`, description: p.seoDescription ?? p.shortDescription, alternates: { canonical: `/product/${p.slug}` }, openGraph: { title: `${p.name} — ${p.subtitle}`, description: p.shortDescription, type: "website" } };
}

const INTENSITY: Record<string, string> = { SOFT: "Soft — low concentration", MODERATE: "Moderate — eau de parfum strength", RICH: "Rich — extrait / oil concentration", AMBIENT: "Home fragrance" };

export default async function ProductPage({ params, searchParams }: P) {
  const { slug } = await params;
  const { sku } = await searchParams;
  const p = await getProductBySlug(slug);
  if (!p) notFound();
  const [avail, user, credit, cards, reviewsRaw, questions, pairs, inSets, batches] = await Promise.all([
    availabilityFor(p.variants.map((v) => v.id)), getCurrentUser(), getSetting("discoveryCredit"), getAllCards(),
    db.review.findMany({ where: { productId: p.id, status: "APPROVED" }, include: { user: { select: { name: true } }, media: true }, orderBy: { createdAt: "desc" } }),
    db.productQuestion.findMany({ where: { productId: p.id, status: "PUBLISHED" }, orderBy: { answeredAt: "desc" } }),
    db.layeringPair.findMany({ where: { isActive: true, OR: [{ productAId: p.id }, { productBId: p.id }] }, include: { productA: true, productB: true } }),
    db.discoverySetItem.findMany({ where: { productId: p.id }, include: { set: true } }),
    db.batch.findMany({ where: { variant: { productId: p.id }, status: "RELEASED" }, include: { variant: { select: { sku: true } } }, orderBy: { manufacturedAt: "desc" }, take: 5 }),
  ]);
  const brand = p.brand.slug;
  const me = cards.find((c) => c.id === p.id);
  const sameScent = p.conceptId ? cards.filter((c) => c.conceptId === p.conceptId && c.id !== p.id) : [];
  const similar = me ? cards.filter((c) => c.id !== p.id && c.conceptId !== p.conceptId && !c.isDiscoverySet && c.families.some((f) => f.slug === me.families[0]?.slug)).slice(0, 4) : [];
  // Frequently bought together — computed only from real paid orders.
  const coItems = await db.orderItem.groupBy({ by: ["variantId"], where: { order: { paymentStatus: "PAID", items: { some: { variant: { productId: p.id } } } }, variant: { productId: { not: p.id } } }, _count: { _all: true }, orderBy: { _count: { variantId: "desc" } }, take: 6 });
  const fbtIds = new Set<string>();
  for (const ci of coItems) { const c = cards.find((x) => x.variants.some((v) => v.id === ci.variantId)); if (c) fbtIds.add(c.id); }
  const fbt = cards.filter((c) => fbtIds.has(c.id)).slice(0, 3);
  const notes = { top: [] as string[], heart: [] as string[], base: [] as string[] };
  for (const cn of p.concept?.notes ?? []) notes[cn.layer === "TOP" ? "top" : cn.layer === "HEART" ? "heart" : "base"].push(cn.note.name);
  const variants = p.variants.map((v) => ({ id: v.id, sku: v.sku, label: v.label, pricePaise: v.pricePaise, mrpPaise: v.mrpPaise, available: avail[v.id] ?? 0, netQuantity: v.netQuantity, netUnit: v.netUnit, concentration: v.concentrationPct ? `${v.concentrationPct}% concentration (${v.concentrationStatus === "VERIFIED" ? "verified" : "proposed, subject to formulation"})` : null }));
  const isCreditSource = credit.enabled && p.variants.some((v) => credit.sourceSkus.includes(v.sku));
  const isCreditTarget = credit.enabled && credit.eligibleFormats.includes(p.format) && !credit.excludedBrands.includes(brand);
  const creditNote = isCreditSource ? `Buy this set while signed in and its price becomes a credit on your first eligible full-size order within ${credit.validityDays} days.` : isCreditTarget ? "Have a discovery credit? It can be applied to this product in your bag." : null;
  const discoverySet = inSets.find((s) => s.set.status === "ACTIVE");
  const occasions = p.occasions.split(",").filter(Boolean);
  const seasons = p.seasons.split(",").filter(Boolean);
  const reviews = reviewsRaw.map((r) => ({ id: r.id, rating: r.rating, title: r.title, body: r.body, isVerifiedPurchase: r.isVerifiedPurchase, helpfulCount: r.helpfulCount, createdAt: r.createdAt.toISOString(), author: r.user.name?.split(" ")[0] ?? "Customer", media: r.media.map((m) => ({ url: m.url, kind: m.kind })) }));
  const anyAvailable = variants.some((v) => v.available > 0);
  const ld = {
    "@context": "https://schema.org", "@type": "Product", name: `${p.name} ${p.subtitle}`, description: p.shortDescription, brand: { "@type": "Brand", name: p.brand.name },
    sku: variants[0].sku, category: p.category.name, url: `${env.appUrl()}/product/${p.slug}`,
    offers: variants.map((v) => ({ "@type": "Offer", sku: v.sku, price: (v.pricePaise / 100).toFixed(2), priceCurrency: "INR", availability: v.available > 0 ? "https://schema.org/InStock" : "https://schema.org/OutOfStock", url: `${env.appUrl()}/product/${p.slug}?sku=${v.sku}` })),
    ...(reviews.length ? { aggregateRating: { "@type": "AggregateRating", ratingValue: (reviews.reduce((s, r) => s + r.rating, 0) / reviews.length).toFixed(1), reviewCount: reviews.length } } : {}),
  };

  return (
    <div data-theme={brand} className="pb-24">
      <JsonLd data={ld} />
      <RecordView productId={p.id} />
      <div className="container-x pt-6"><Breadcrumbs items={[{ name: p.brand.name, href: `/${brand}` }, ...(p.collection ? [{ name: p.collection.name, href: `/${brand}/collections/${p.collection.slug}` }] : []), { name: p.name, href: `/product/${p.slug}` }]} /></div>
      <section className="container-x grid gap-10 pt-6 lg:grid-cols-[1.1fr_1fr] lg:gap-16">
        <Gallery name={p.name} format={p.format} brand={brand} colour={p.concept?.colour ?? null} media={p.media} />
        <div className="lg:sticky lg:top-24 lg:self-start" id="buy">
          <Link href={`/${brand}`} className="eyebrow hover:text-accent">{p.brand.name}{p.collection ? ` · ${p.collection.name}` : ""}</Link>
          <h1 className="display mt-3 text-5xl md:text-6xl" data-testid="product-name">{p.name}</h1>
          <p className="mt-2 text-lg text-muted">{p.subtitle}</p>
          <p className="mt-5 text-lg">{p.shortDescription}</p>
          {p.families.length > 0 && <div className="mt-4 flex flex-wrap gap-2">{p.families.slice(0, 3).map((f) => <Link key={f.familyId} href={`/families/${f.family.slug}`} className="chip text-xs"><span className="h-2.5 w-2.5 rounded-full" style={{ background: f.family.colour }} />{f.family.name}</Link>)}</div>}
          {reviews.length > 0 && <a href="#reviews" className="mt-3 inline-block text-sm underline">{reviews.length} verified review{reviews.length === 1 ? "" : "s"}</a>}
          <div className="mt-8"><PurchasePanel productId={p.id} name={p.name} subtitle={p.subtitle} brand={brand} variants={variants} initialSku={sku} creditNote={creditNote} discoveryHref={discoverySet && !p.isDiscoverySet ? `/product/${discoverySet.set.slug}` : null} /></div>
          {p.nameStatus !== "LEGALLY_CLEARED" && <p className="mt-6 text-xs text-muted">“{p.name}” is a working name pending legal clearance.</p>}
        </div>
      </section>

      {(notes.top.length > 0 || p.concept) && (
        <section className="container-x mt-24 grid gap-12 lg:grid-cols-2" aria-labelledby="exp-h">
          <div>
            <p className="eyebrow">The fragrance</p>
            <h2 id="exp-h" className="display mt-3 text-4xl md:text-5xl">How it unfolds</h2>
            {p.concept?.story && <p className="lede mt-5 max-w-none">{p.concept.story.replace(/\. Story: /, ". ")}</p>}
            <dl className="mt-8 grid grid-cols-[9rem_1fr] gap-y-3 text-sm">
              {p.concept?.character && <><dt className="text-muted">Scent profile</dt><dd>{p.concept.character}</dd></>}
              <dt className="text-muted">Intensity guide</dt><dd>{INTENSITY[p.intensity]}</dd>
              {occasions.length > 0 && <><dt className="text-muted">Occasion</dt><dd className="capitalize">{occasions.join(", ")}</dd></>}
              {seasons.length > 0 && <><dt className="text-muted">Season & climate</dt><dd className="capitalize">{seasons.join(", ")}{p.concept?.climate ? ` — ${p.concept.climate}` : ""}</dd></>}
              {p.gender && <><dt className="text-muted">Worn by</dt><dd>{p.gender}</dd></>}
              <dt className="text-muted">Longevity & projection</dt>
              <dd>{p.claimsStatus === "VERIFIED" ? `${p.longevityNote ?? ""} ${p.projectionNote ?? ""}` : "Not published yet. We'll only state performance once it has been substantiated by panel testing."}</dd>
            </dl>
            {p.concept?.differentiation && <p className="mt-8 border-l-2 border-accent pl-4 text-sm text-muted">{p.concept.differentiation}.</p>}
          </div>
          {notes.top.length > 0 && <NotesPyramid {...notes} opening={p.concept?.opening} development={p.concept?.development} drydown={p.concept?.drydown} colour={p.concept?.colour} />}
        </section>
      )}

      {p.setContents.length > 0 && (
        <section className="container-x mt-24">
          <h2 className="display text-4xl">Inside the set</h2>
          {p.contentsNote && <p className="mt-2 text-muted">{p.contentsNote}</p>}
          <ul className="mt-6 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
            {p.setContents.map((s) => <li key={s.id}><Link href={`/product/${s.product.slug}`} className="lift card block p-5"><p className="display text-2xl">{s.product.name}</p><p className="text-sm text-muted">{s.vialSize} · {s.product.subtitle}</p></Link></li>)}
          </ul>
        </section>
      )}
      {p.setContents.length === 0 && p.contentsNote && <section className="container-x mt-16"><h2 className="display text-3xl">Contents</h2><p className="mt-2 text-muted">{p.contentsNote}</p></section>}

      {pairs.length > 0 && (
        <section className="container-x mt-24">
          <h2 className="display text-4xl">Layer it</h2>
          {pairs.map((lp) => {
            const other = lp.productAId === p.id ? lp.productB : lp.productA;
            const otherCard = cards.find((c) => c.id === other.id);
            return (
              <div key={lp.id} className="card mt-6 grid gap-6 p-6 md:grid-cols-[1fr_16rem] md:items-center">
                <div><p className="display text-2xl">{lp.title}</p><p className="mt-2 text-muted">{lp.rationale}</p><p className="mt-3 text-sm"><strong>How to wear:</strong> {lp.sequence}</p></div>
                {otherCard && me && <AddAllButton variantIds={[me.variants[0].id, otherCard.variants[0].id]} label="Add the pair" />}
              </div>
            );
          })}
        </section>
      )}

      {sameScent.length > 0 && (
        <section className="container-x mt-24">
          <h2 className="display text-4xl">{p.name} in other forms</h2>
          <p className="mt-2 text-muted">One scent story across perfume, travel and home. Each application uses its own compliant compound.</p>
          <div className="mt-8 grid grid-cols-2 gap-6 lg:grid-cols-4">{sameScent.map((c, i) => <ProductCardView key={c.id} p={c} position={i} list="same-scent" compact />)}</div>
        </section>
      )}

      <section className="container-x mt-24 grid gap-10 md:grid-cols-3">
        <details className="card p-6" open>
          <summary className="display cursor-pointer text-2xl">Ingredients & product information</summary>
          <dl className="mt-4 grid gap-2 text-sm">
            <dt className="font-semibold">Ingredients (INCI)</dt><dd className="text-muted">{p.ingredientsDeclaration ?? "Will be published once the formula is approved."}</dd>
            <dt className="font-semibold">Allergens</dt><dd className="text-muted">{p.allergenDeclaration ?? "Disclosure to IS 4707 (Part 2): 2025 will be published with the approved formula."}</dd>
            <dt className="font-semibold">Net quantity & MRP</dt><dd className="text-muted">{variants.map((v) => `${v.label} — ${formatINR(v.mrpPaise)}`).join("; ")} (incl. of all taxes)</dd>
            <dt className="font-semibold">Format</dt><dd className="text-muted">{p.subtitle} · {p.category.name}</dd>
          </dl>
        </details>
        <details className="card p-6" open>
          <summary className="display cursor-pointer text-2xl">Quality & batches</summary>
          <p className="mt-4 text-sm text-muted">Every SKU needs an IFRA certificate, an allergen review, a stability file and a Legal Metrology label before release.</p>
          {batches.length ? <ul className="mt-3 text-sm">{batches.map((b) => <li key={b.id}>{b.variant.sku} · Batch {b.batchCode}{b.manufacturedAt ? ` · made ${formatDate(b.manufacturedAt)}` : ""}{b.ifraCertificate ? " · IFRA on file" : ""}</li>)}</ul> : <p className="mt-3 text-sm">Batch documentation appears here once a production batch has been released.</p>}
        </details>
        <details className="card p-6" open>
          <summary className="display cursor-pointer text-2xl">Authenticity</summary>
          <p className="mt-4 text-sm text-muted">Buy only from the house or its authorised channels. For this product, those are: {p.channels}.</p>
          <p className="mt-3 text-sm text-muted">If you're unsure about a seller, <Link href="/support" className="underline">contact support</Link>.</p>
        </details>
      </section>

      {fbt.length > 0 && (
        <section className="container-x mt-24"><h2 className="display text-4xl">Frequently bought together</h2><p className="mt-2 text-sm text-muted">Based on real orders.</p><div className="mt-8 grid grid-cols-2 gap-6 lg:grid-cols-4">{fbt.map((c, i) => <ProductCardView key={c.id} p={c} position={i} list="fbt" compact />)}</div></section>
      )}

      <section className="container-x mt-24 grid gap-16 lg:grid-cols-[1.4fr_1fr]">
        <ReviewsBlock productId={p.id} reviews={reviews} signedIn={!!user} />
        <QuestionsBlock productId={p.id} questions={questions.map((q) => ({ id: q.id, name: q.name, question: q.question, answer: q.answer, answeredAt: q.answeredAt?.toISOString() ?? null }))} />
      </section>

      {similar.length > 0 && (
        <section className="container-x mt-24"><h2 className="display text-4xl">You may also like</h2><div className="mt-8 grid grid-cols-2 gap-6 lg:grid-cols-4">{similar.map((c, i) => <ProductCardView key={c.id} p={c} position={i} list="similar" compact />)}</div></section>
      )}
      <RecentlyViewed excludeId={p.id} />
      {anyAvailable && <StickyBuyBar name={p.name} price={variants.length > 1 ? `From ${formatINR(Math.min(...variants.map((v) => v.pricePaise)))}` : formatINR(variants[0].pricePaise)} targetId="buy" />}
    </div>
  );
}
