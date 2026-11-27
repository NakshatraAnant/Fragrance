import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { db } from "@/lib/db";
import { getAllCards, type ProductCard } from "@/lib/catalog";
import { brandBanner, journalPosts } from "@/lib/content";
import { ProductCardView, ProductGrid } from "@/components/product/product-card";
import { ProductVisual } from "@/components/product/product-visual";
import { formatINR, priceLabel } from "@/lib/money";

const BRANDS = ["dhun", "vasana", "anvaya"];
type P = { params: Promise<{ brand: string }> };

export async function generateStaticParams() { return BRANDS.map((brand) => ({ brand })); }

export async function generateMetadata({ params }: P): Promise<Metadata> {
  const b = await db.brand.findUnique({ where: { slug: (await params).brand } });
  return b ? { title: `${b.name} — ${b.tagline}`, description: b.positioning, alternates: { canonical: `/${b.slug}` } } : {};
}

export default async function BrandHome({ params }: P) {
  const { brand } = await params;
  if (!BRANDS.includes(brand)) notFound();
  const [b, cards, collections, campaigns, posts, banner] = await Promise.all([
    db.brand.findUniqueOrThrow({ where: { slug: brand } }), getAllCards(),
    db.collection.findMany({ where: { brand: { slug: brand }, isActive: true }, orderBy: { sortOrder: "asc" }, include: { _count: { select: { products: true } } } }),
    db.campaign.findMany({ where: { brand: { slug: brand }, status: "PUBLISHED" }, orderBy: { createdAt: "asc" } }),
    journalPosts(3, brand), brandBanner(brand),
  ]);
  const mine = cards.filter((c) => c.brand.slug === brand);
  const props = { b, mine, collections, campaigns, posts, banner };
  if (brand === "dhun") return <DhunHome {...props} />;
  if (brand === "anvaya") return <AnvayaHome {...props} />;
  return <VasanaHome {...props} />;
}

type HomeProps = {
  b: { slug: string; name: string; tagline: string; positioning: string; description: string; priceBand: string };
  mine: ProductCard[];
  collections: { slug: string; name: string; description: string; _count: { products: number } }[];
  campaigns: { slug: string; title: string; eyebrow: string | null; body: string }[];
  posts: { slug: string; title: string; excerpt: string }[];
  banner: { title: string; body: string | null; ctaHref: string | null; ctaLabel: string | null } | null;
};

function BrandNav({ b, collections }: Pick<HomeProps, "b" | "collections">) {
  return (
    <nav aria-label={`${b.name} navigation`} className="border-b border-line">
      <div className="container-x no-scrollbar flex gap-6 overflow-x-auto py-3 text-sm">
        <Link href={`/${b.slug}`} className="shrink-0 font-semibold">{b.name}</Link>
        {collections.map((c) => <Link key={c.slug} href={`/${b.slug}/collections/${c.slug}`} className="shrink-0 text-muted hover:text-ink">{c.name}</Link>)}
        <Link href={`/${b.slug}/story`} className="shrink-0 text-muted hover:text-ink">Story</Link>
        {b.slug === "anvaya" && <Link href="/anvaya/appointment" className="shrink-0 text-muted hover:text-ink">Private appointment</Link>}
      </div>
    </nav>
  );
}

function PromoBanner({ banner }: Pick<HomeProps, "banner">) {
  if (!banner) return null;
  return <div className="container-x mt-8"><div className="card flex flex-wrap items-center justify-between gap-3 p-5"><div><p className="font-semibold">{banner.title}</p>{banner.body && <p className="text-sm text-muted">{banner.body}</p>}</div>{banner.ctaHref && <Link href={banner.ctaHref} className="btn btn-primary btn-sm">{banner.ctaLabel ?? "Shop"}</Link>}</div></div>;
}

/* ─────────────── DHUN: colourful, fast, playful ─────────────── */
function DhunHome({ b, mine, collections, campaigns, banner }: HomeProps) {
  const edps = mine.filter((c) => c.format === "EDP");
  const mists = mine.filter((c) => c.format === "MIST");
  const set = mine.find((c) => c.isDiscoverySet);
  return (
    <>
      <BrandNav b={b} collections={collections} />
      <section className="container-x pb-10 pt-12">
        <p className="eyebrow">{b.priceBand} · original scents · quick to love</p>
        <h1 className="display mt-4 text-[clamp(3.5rem,12vw,10rem)] leading-[0.9]">dhun<span className="text-accent">.</span></h1>
        <p className="mt-6 max-w-xl text-xl font-semibold">{b.tagline} {b.description.split(".")[1]}.</p>
        <div className="mt-8 flex flex-wrap gap-3"><Link href="/dhun/collections/eau-de-parfum" className="btn btn-accent">shop the six</Link><Link href="/scent-finder" className="btn btn-outline">which one am i?</Link></div>
      </section>
      <PromoBanner banner={banner} />
      <section className="container-x py-8" aria-label="The six Dhun scents">
        <div className="grid grid-cols-2 gap-3 md:grid-cols-3">
          {edps.map((p, i) => (
            <Link key={p.id} href={`/product/${p.slug}`} className="group relative flex min-h-56 flex-col justify-between overflow-hidden rounded-[22px] p-6 transition duration-300 hover:-rotate-1 hover:scale-[1.02] md:min-h-72" style={{ background: p.colour ?? "#ff4f2e", color: ["#E4EC3A", "#F0B3C4"].includes(p.colour ?? "") ? "#121212" : "#fff", animationDelay: `${i * 60}ms` }}>
              <span className="text-sm font-extrabold opacity-80">{String(i + 1).padStart(2, "0")} · {p.families[0]?.name.toLowerCase()}</span>
              <div><p className="text-4xl font-extrabold lowercase tracking-tight md:text-5xl">{p.name}</p><p className="mt-1 text-sm font-bold opacity-90">{p.shortDescription.toLowerCase()}</p><p className="mt-3 text-sm font-extrabold">{priceLabel(p)} →</p></div>
              <div aria-hidden className="absolute -right-8 -top-8 h-32 w-32 rounded-full bg-white/15 transition duration-500 group-hover:scale-150" />
            </Link>
          ))}
        </div>
      </section>
      {set && (
        <section className="container-x py-12">
          <div className="grid items-center gap-8 rounded-[22px] bg-ink p-8 text-bg md:grid-cols-2 md:p-12">
            <div><p className="text-sm font-extrabold text-accent">can't decide?</p><h2 className="display mt-2 text-5xl">try all six for {formatINR(set.minPricePaise)}</h2><p className="mt-3 text-bg/70">{set.shortDescription}. Its price is credited on your first full size.</p></div>
            <div className="max-w-sm justify-self-end"><ProductCardView p={set} list="dhun-set" compact /></div>
          </div>
        </section>
      )}
      <section className="container-x py-12"><h2 className="display mb-8 text-5xl">mists for every day</h2><ProductGrid products={mists} list="dhun-mists" /></section>
      <section className="container-x py-12"><h2 className="display mb-8 text-5xl">20 ml pocket sizes</h2><p className="-mt-6 mb-8 font-semibold text-muted">every scent in a ₹299 pocket spray. bag it, gym it, travel it.</p><ProductGrid products={edps} list="dhun-pocket" cols={3} /></section>
      {campaigns.length > 0 && <Campaigns brand="dhun" campaigns={campaigns} />}
    </>
  );
}

/* ─────────────── VASANA: editorial, warm, cultured ─────────────── */
function VasanaHome({ b, mine, collections, campaigns, posts, banner }: HomeProps) {
  const signature = mine.filter((c) => c.collection === "signature");
  const attar = mine.filter((c) => c.collection === "attar-atelier");
  const home = mine.filter((c) => c.collection === "home").slice(0, 4);
  return (
    <>
      <BrandNav b={b} collections={collections} />
      <section className="relative overflow-hidden grain">
        <div aria-hidden className="absolute inset-0 -z-10" style={{ background: "radial-gradient(60% 70% at 75% 30%, #d8b97f55, transparent), radial-gradient(50% 60% at 10% 90%, #b5725a44, transparent)" }} />
        <div className="container-x grid min-h-[70svh] items-center gap-10 py-16 md:grid-cols-[1.3fr_1fr]">
          <div>
            <p className="eyebrow">India's own perfume house</p>
            <h1 className="display mt-4 text-[clamp(3.5rem,9vw,8rem)]"><em>Vasana</em></h1>
            <p className="mt-4 max-w-xl text-2xl italic text-ink/80">{b.tagline}</p>
            <p className="lede mt-6">{b.positioning}</p>
            <div className="mt-9 flex flex-wrap gap-3"><Link href="/vasana/collections/signature" className="btn btn-primary">The Signature collection</Link><Link href="/product/vasana-discovery-set" className="btn btn-outline">Discovery set · 8 × 2 ml</Link></div>
          </div>
          <div className="grid grid-cols-2 gap-3">
            {signature.slice(0, 4).map((p, i) => <Link key={p.id} href={`/product/${p.slug}`} className={`reveal ${i % 2 ? "mt-10" : ""}`} style={{ transitionDelay: `${i * 140}ms` }}><ProductVisual name={p.name} format={p.format} brand="vasana" colour={p.colour} className="aspect-[3/4]" label={false} /><p className="display mt-2 text-lg">{p.name}</p></Link>)}
          </div>
        </div>
      </section>
      <PromoBanner banner={banner} />
      <section className="container-x py-24">
        <div className="mb-12 flex items-end justify-between"><h2 className="display text-5xl md:text-6xl">The Signature eaux de parfum</h2><Link href="/vasana/collections/signature" className="btn btn-outline hidden md:inline-flex">All eight</Link></div>
        <ol className="divide-y divide-line border-y border-line">
          {signature.map((p, i) => (
            <li key={p.id} className="reveal">
              <Link href={`/product/${p.slug}`} className="group grid items-center gap-4 py-6 md:grid-cols-[4rem_1.2fr_2fr_auto]">
                <span className="display text-2xl text-muted">{String(i + 1).padStart(2, "0")}</span>
                <span className="display text-4xl transition group-hover:translate-x-2 group-hover:text-accent">{p.name}</span>
                <span className="text-muted">{p.shortDescription} <span className="text-xs uppercase tracking-widest">· {p.notes.heart.slice(0, 2).join(", ")}</span></span>
                <span className="font-semibold">{priceLabel(p)}</span>
              </Link>
            </li>
          ))}
        </ol>
      </section>
      <section className="bg-[#2a211b] py-24 text-[#f3ead9]">
        <div className="container-x grid gap-12 md:grid-cols-[1fr_1.6fr]">
          <div><p className="eyebrow !text-[#f3ead9]/60">Vasana Attar Atelier</p><h2 className="display mt-3 text-5xl">Drops, not sprays.</h2><p className="mt-5 text-lg opacity-80">Five modern perfume oils, with their compositions declared. Compare them per wear, not per ml.</p><Link href="/vasana/collections/attar-atelier" className="btn btn-accent mt-8">Enter the Atelier</Link></div>
          <div className="grid grid-cols-2 gap-4 md:grid-cols-3">{attar.map((p) => <Link key={p.id} href={`/product/${p.slug}`} className="group"><ProductVisual name={p.name} format={p.format} brand="vasana" colour={p.colour} className="aspect-square" label={false} /><p className="display mt-2 text-xl group-hover:underline">{p.name}</p><p className="text-sm opacity-70">{priceLabel(p)}</p></Link>)}</div>
        </div>
      </section>
      <section className="container-x py-24"><div className="mb-10 flex items-end justify-between"><h2 className="display text-5xl">Vasana Home</h2><Link href="/vasana/collections/home" className="btn btn-outline">Shop home</Link></div><ProductGrid products={home} list="vasana-home" /></section>
      <section className="container-x grid gap-4 pb-16 sm:grid-cols-2 lg:grid-cols-3">
        {collections.map((c) => <Link key={c.slug} href={`/vasana/collections/${c.slug}`} className="lift card p-7"><p className="display text-3xl">{c.name}</p><p className="mt-2 text-muted">{c.description}</p><p className="mt-4 text-sm font-semibold">{c._count.products} products →</p></Link>)}
      </section>
      {campaigns.length > 0 && <Campaigns brand="vasana" campaigns={campaigns} />}
      {posts.length > 0 && <section className="container-x py-16"><h2 className="display mb-8 text-4xl">From the journal</h2><div className="grid gap-6 md:grid-cols-3">{posts.map((p) => <Link key={p.slug} href={`/journal/${p.slug}`} className="border-t border-line pt-5"><p className="display text-2xl">{p.title}</p><p className="mt-2 text-muted">{p.excerpt}</p></Link>)}</div></section>}
    </>
  );
}

/* ─────────────── ANVAYA: quiet luxury, slow, spacious ─────────────── */
function AnvayaHome({ b, mine, collections, campaigns }: HomeProps) {
  const extraits = mine.filter((c) => c.format === "EXTRAIT");
  const others = mine.filter((c) => c.format !== "EXTRAIT");
  return (
    <>
      <BrandNav b={b} collections={collections} />
      <section className="container-x grid min-h-[80svh] place-items-center py-24 text-center">
        <div className="animate-[fade_2.4s_ease_both]">
          <p className="eyebrow tracking-[0.5em]">Maison</p>
          <h1 className="display mt-8 text-[clamp(3rem,9vw,7rem)]">Anvaya</h1>
          <div aria-hidden className="mx-auto mt-8 h-px w-24 bg-accent" />
          <p className="mx-auto mt-8 max-w-lg text-2xl italic text-muted">{b.tagline} {b.positioning.split(" — ")[0]}.</p>
          <div className="mt-12 flex flex-wrap justify-center gap-4"><Link href="/anvaya/collections/extraits" className="btn btn-outline">The extraits</Link><Link href="/anvaya/appointment" className="btn btn-accent">Request a private appointment</Link></div>
        </div>
      </section>
      <section className="container-x grid gap-32 py-24">
        {extraits.map((p, i) => (
          <article key={p.id} className={`reveal grid items-center gap-12 md:grid-cols-2 ${i % 2 ? "md:[&>*:first-child]:order-2" : ""}`}>
            <Link href={`/product/${p.slug}`}><ProductVisual name={p.name} format={p.format} brand="anvaya" colour={p.colour} className="aspect-[4/5]" /></Link>
            <div>
              <p className="eyebrow">Extrait de parfum · 75 ml</p>
              <h2 className="display mt-6 text-4xl md:text-5xl">{p.name}</h2>
              <p className="mt-6 text-xl italic text-muted">{p.shortDescription}</p>
              <p className="mt-6 text-sm tracking-widest text-muted">{[...p.notes.top, ...p.notes.heart, ...p.notes.base].slice(0, 6).join(" · ")}</p>
              <p className="mt-8">{formatINR(p.minPricePaise)}</p>
              <Link href={`/product/${p.slug}`} className="btn btn-outline mt-6">Discover</Link>
            </div>
          </article>
        ))}
      </section>
      <section className="container-x border-t border-line py-24"><h2 className="display mb-12 text-center text-3xl">Ruh & coffret</h2><div className="mx-auto grid max-w-4xl grid-cols-1 gap-10 sm:grid-cols-3">{others.map((p) => <ProductCardView key={p.id} p={p} list="anvaya-others" compact />)}</div></section>
      <section className="container-x py-24 text-center">
        <p className="eyebrow">Clienteling</p><h2 className="display mt-6 text-3xl">By appointment</h2>
        <p className="mx-auto mt-6 max-w-xl text-lg text-muted">A client advisor will guide you through the extraits in person, in a private salon within our Vasana flagships. Anvaya is never discounted.</p>
        <Link href="/anvaya/appointment" className="btn btn-accent mt-10">Request an appointment</Link>
      </section>
      {campaigns.length > 0 && <Campaigns brand="anvaya" campaigns={campaigns} />}
    </>
  );
}

function Campaigns({ brand, campaigns }: { brand: string; campaigns: { slug: string; title: string; eyebrow: string | null; body: string }[] }) {
  return (
    <section className="container-x py-16">
      <div className="grid gap-4 md:grid-cols-2">
        {campaigns.map((c) => (
          <Link key={c.slug} href={`/${brand}/campaign/${c.slug}`} className="lift card flex min-h-52 flex-col justify-between p-8">
            <p className="eyebrow">{c.eyebrow}</p><div><p className="display text-4xl">{c.title}</p><p className="mt-2 text-muted">{c.body}</p></div>
          </Link>
        ))}
      </div>
    </section>
  );
}
