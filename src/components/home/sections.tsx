import Link from "next/link";
import type { ProductCard } from "@/lib/catalog";
import { ProductCardView } from "@/components/product/product-card";
import { ProductVisual } from "@/components/product/product-visual";
import { ScentWheel } from "@/components/discovery/scent-wheel";
import { NewsletterForm } from "@/components/forms/newsletter-form";
import { Stars } from "@/components/ui/stars";
import { formatINR, formatDate } from "@/lib/money";

export type Section = { key: string; type: string; title: string; subtitle: string | null; body: string | null; ctaLabel: string | null; ctaHref: string | null; imageDesktop: string | null; imageMobile: string | null; config: Record<string, unknown> };

export function SectionHead({ s, align = "left" }: { s: Pick<Section, "title" | "subtitle" | "ctaLabel" | "ctaHref">; align?: "left" | "center" }) {
  return (
    <div className={`mb-10 flex flex-col gap-4 md:flex-row md:items-end ${align === "center" ? "items-center text-center md:flex-col md:items-center" : "md:justify-between"}`}>
      <div className="reveal">
        <h2 className="display text-4xl md:text-5xl">{s.title}</h2>
        {s.subtitle && <p className="lede mt-3">{s.subtitle}</p>}
      </div>
      {s.ctaLabel && s.ctaHref && <Link href={s.ctaHref} className="btn btn-outline shrink-0">{s.ctaLabel}</Link>}
    </div>
  );
}

export function Hero({ s }: { s: Section }) {
  const words = ["mogra at dusk", "first rain", "kesar · chandan", "malabar pepper", "darjeeling first flush", "kannauj rose", "khus screens", "temple incense"];
  return (
    <section className="relative isolate overflow-hidden grain" aria-labelledby="hero-h">
      {s.imageDesktop ? (
        <picture className="absolute inset-0 -z-10">
          {s.imageMobile && <source media="(max-width: 767px)" srcSet={s.imageMobile} />}
          <img src={s.imageDesktop} alt="" className="h-full w-full object-cover" fetchPriority="high" />
        </picture>
      ) : (
        <div aria-hidden className="absolute inset-0 -z-10 bg-[#efe4d2]">
          <div className="absolute -left-[10%] top-[-20%] h-[70vh] w-[70vh] rounded-full bg-[#c98b6b] opacity-50 blur-[90px] animate-[drift_18s_ease-in-out_infinite]" />
          <div className="absolute right-[-10%] top-[10%] h-[60vh] w-[60vh] rounded-full bg-[#d8b97f] opacity-60 blur-[100px] animate-[drift2_22s_ease-in-out_infinite]" />
          <div className="absolute bottom-[-25%] left-[30%] h-[55vh] w-[55vh] rounded-full bg-[#8fa889] opacity-40 blur-[110px] animate-[drift_26s_ease-in-out_infinite]" />
        </div>
      )}
      <div className="container-x grid min-h-[78svh] items-end gap-10 py-16 md:grid-cols-[1.25fr_1fr] md:items-center md:py-24">
        <div>
          <p className="eyebrow animate-rise">Vasana House · Est. in India</p>
          <h1 id="hero-h" className="display mt-5 text-[clamp(3rem,8vw,7.5rem)]">{s.title}</h1>
          {s.subtitle && <p className="lede mt-6 animate-rise text-ink/75 [animation-delay:240ms]">{s.subtitle}</p>}
          <div className="mt-9 flex flex-wrap gap-3 animate-rise [animation-delay:360ms]">
            {s.ctaHref && <Link href={s.ctaHref} className="btn btn-primary">{s.ctaLabel}</Link>}
            {typeof s.config.secondaryHref === "string" && <Link href={s.config.secondaryHref} className="btn btn-outline">{String(s.config.secondaryLabel ?? "Shop")}</Link>}
          </div>
        </div>
        <div className="relative mx-auto hidden aspect-[4/5] w-full max-w-md md:block">
          <div className="absolute inset-0 rotate-[-4deg] animate-[float_9s_ease-in-out_infinite]"><ProductVisual name="Mogra Hour" format="EDP" brand="vasana" colour="#E6D6B0" className="h-full rounded-[2px] shadow-2xl" /></div>
          <div className="absolute -bottom-6 -left-10 w-40 rotate-[6deg] animate-[float_11s_ease-in-out_infinite] [animation-delay:-3s]"><ProductVisual name="First Rain" format="TRAVEL" brand="vasana" colour="#B5725A" className="aspect-[4/5] rounded-[2px] shadow-xl" label={false} /></div>
        </div>
      </div>
      <div className="overflow-hidden border-y border-ink/10 bg-bg/50 py-3 backdrop-blur">
        <div className="marquee display text-xl italic text-ink/70" aria-hidden>{[...words, ...words].map((w, i) => <span key={i}>{w} <span className="not-italic text-accent">✦</span></span>)}</div>
      </div>
    </section>
  );
}

export function Proposition({ s, brands }: { s: Section; brands: { slug: string; name: string; tagline: string; priceBand: string }[] }) {
  return (
    <section className="container-x py-24">
      <div className="grid gap-10 md:grid-cols-[1fr_1.4fr]">
        <div className="reveal"><p className="eyebrow">{s.subtitle}</p><h2 className="display mt-3 text-5xl md:text-6xl">{s.title}</h2></div>
        <div className="reveal"><p className="lede max-w-none text-2xl">{s.body}</p>
          <div className="mt-10 grid gap-px bg-line sm:grid-cols-3">
            {brands.map((b) => (
              <Link key={b.slug} href={`/${b.slug}`} className="group bg-bg p-6 transition hover:bg-surface">
                <p className="display text-3xl">{b.name}</p><p className="mt-1 text-xs uppercase tracking-widest text-muted">{b.priceBand}</p>
                <p className="mt-3 text-sm text-muted">{b.tagline}</p><p className="mt-4 text-sm font-semibold text-accent opacity-0 transition group-hover:opacity-100">Enter →</p>
              </Link>
            ))}
          </div>
        </div>
      </div>
    </section>
  );
}

export function FinderCta({ s }: { s: Section }) {
  const steps = ["Families you love", "Notes to avoid", "Mood & occasion", "Climate & intensity", "Format & budget"];
  return (
    <section className="bg-ink py-24 text-bg">
      <div className="container-x grid gap-12 md:grid-cols-2 md:items-center">
        <div className="reveal">
          <p className="eyebrow !text-bg/60">The Scent Finder</p>
          <h2 className="display mt-3 text-4xl md:text-6xl">{s.title}</h2>
          <p className="mt-5 max-w-lg text-lg text-bg/70">{s.subtitle}</p>
          {s.ctaHref && <Link href={s.ctaHref} className="btn btn-accent mt-8">{s.ctaLabel}</Link>}
        </div>
        <ol className="grid gap-3">
          {steps.map((t, i) => (
            <li key={t} className="reveal flex items-center gap-5 border-b border-bg/15 pb-3" style={{ transitionDelay: `${i * 90}ms` }}>
              <span className="display text-4xl text-bg/30">{String(i + 1).padStart(2, "0")}</span><span className="text-lg">{t}</span>
            </li>
          ))}
        </ol>
      </div>
    </section>
  );
}

export function Carousel({ s, products, note }: { s: Section; products: ProductCard[]; note?: string }) {
  if (!products.length) return null;
  return (
    <section className="container-x py-20">
      <SectionHead s={s} />
      {note && <p className="-mt-6 mb-6 text-xs text-muted">{note}</p>}
      <div className="no-scrollbar -mx-4 flex snap-x snap-mandatory gap-4 overflow-x-auto px-4 pb-4 md:mx-0 md:grid md:grid-cols-4 md:gap-6 md:overflow-visible md:px-0">
        {products.map((p, i) => <div key={p.id} className="w-[70vw] shrink-0 snap-start sm:w-[42vw] md:w-auto"><ProductCardView p={p} position={i} list={s.key} compact /></div>)}
      </div>
    </section>
  );
}

export function BrandWorlds({ s, brands }: { s: Section; brands: { slug: string; name: string; tagline: string; positioning: string; priceBand: string }[] }) {
  const look: Record<string, string> = { dhun: "bg-[#fff] text-[#121212]", vasana: "bg-[#e9dcc6] text-[#241f1b]", anvaya: "bg-[#141312] text-[#ede6d8]" };
  const font: Record<string, string> = { dhun: "font-[family-name:var(--font-nunito)] lowercase font-extrabold tracking-tight", vasana: "font-[family-name:var(--font-cormorant)] italic", anvaya: "font-[family-name:var(--font-cinzel)] uppercase tracking-[0.2em]" };
  return (
    <section className="py-20">
      <div className="container-x"><SectionHead s={s} /></div>
      <div className="grid md:grid-cols-3">
        {brands.map((b) => (
          <Link key={b.slug} href={`/${b.slug}`} className={`group relative flex min-h-[28rem] flex-col justify-between overflow-hidden p-8 md:p-10 ${look[b.slug]}`}>
            {b.slug === "dhun" && <div aria-hidden className="absolute -right-10 -top-10 grid grid-cols-3 gap-2 opacity-90 transition duration-500 group-hover:rotate-6">{["#3D6FB6", "#6B4226", "#E4EC3A", "#F0B3C4", "#1F3A93", "#1C1A19"].map((c) => <span key={c} className="h-16 w-16 rounded-full" style={{ background: c }} />)}</div>}
            {b.slug === "vasana" && <div aria-hidden className="absolute inset-x-0 bottom-0 h-1/2 bg-gradient-to-t from-[#b5725a]/30 to-transparent transition duration-700 group-hover:from-[#b5725a]/50" />}
            {b.slug === "anvaya" && <div aria-hidden className="absolute inset-8 border border-[#b08a4e]/40 transition duration-[1400ms] group-hover:inset-6" />}
            <p className="relative text-xs uppercase tracking-[0.2em] opacity-70">{b.priceBand}</p>
            <div className="relative">
              <p className={`text-6xl md:text-7xl ${font[b.slug]}`}>{b.name}</p>
              <p className="mt-3 max-w-xs text-lg opacity-80">{b.tagline}</p>
              <p className="mt-6 text-sm font-semibold underline-offset-4 group-hover:underline">Enter the house →</p>
            </div>
          </Link>
        ))}
      </div>
    </section>
  );
}

export function DiscoveryBand({ s, sets, creditDays }: { s: Section; sets: ProductCard[]; creditDays: number }) {
  return (
    <section className="bg-surface-2 py-24">
      <div className="container-x grid gap-12 lg:grid-cols-[1fr_1.6fr] lg:items-center">
        <div className="reveal">
          <p className="eyebrow">Discovery Studio</p>
          <h2 className="display mt-3 text-5xl">{s.title}</h2>
          <p className="lede mt-4">{s.subtitle}</p>
          <ol className="mt-8 grid gap-3 text-sm">
            <li>1 · Buy a discovery set and wear-test at home.</li>
            <li>2 · Its price becomes a credit once your payment is confirmed (signed-in customers).</li>
            <li>3 · Use the credit on your first eligible full size within {creditDays} days.</li>
          </ol>
          {s.ctaHref && <Link href={s.ctaHref} className="btn btn-primary mt-8">{s.ctaLabel}</Link>}
        </div>
        <div className="grid grid-cols-2 gap-4 md:grid-cols-4">{sets.map((p, i) => <ProductCardView key={p.id} p={p} position={i} list="home-discovery" compact />)}</div>
      </div>
    </section>
  );
}

export function StoryBand({ s, tone = "story" }: { s: Section; tone?: "story" | "craft" }) {
  const facts = tone === "craft"
    ? [["IFRA", "certificate for every SKU"], ["IS 4707-2", "allergen review (2025)"], ["Batch", "documentation per release"], ["Original", "briefs, screened against famous perfumes"]]
    : [["32", "original scent concepts"], ["69", "Phase-One products"], ["3", "houses, one supply chain"], ["0", "dupes or 'inspired by' claims"]];
  return (
    <section className={`relative overflow-hidden py-28 ${tone === "story" ? "bg-[#2a211b] text-[#f3ead9]" : ""}`}>
      {tone === "story" && <div aria-hidden className="absolute inset-0 opacity-30" style={{ background: "radial-gradient(60% 80% at 80% 20%, #b5725a 0%, transparent 60%), radial-gradient(50% 60% at 10% 90%, #9c7a3c 0%, transparent 60%)" }} />}
      <div className="container-x relative grid gap-12 md:grid-cols-2">
        <div className="reveal">
          <p className={`eyebrow ${tone === "story" ? "!text-[#f3ead9]/60" : ""}`}>{tone === "story" ? "Heritage, made modern" : "Craft with proof"}</p>
          <h2 className="display mt-3 text-5xl md:text-6xl">{s.title}</h2>
          {s.subtitle && <p className="mt-5 text-xl italic opacity-80">{s.subtitle}</p>}
          {s.body && <p className="mt-6 max-w-xl text-lg opacity-80">{s.body}</p>}
          {s.ctaHref && <Link href={s.ctaHref} className={`btn mt-8 ${tone === "story" ? "btn-accent" : "btn-outline"}`}>{s.ctaLabel}</Link>}
        </div>
        <dl className="grid grid-cols-2 gap-px self-end bg-current/10">
          {facts.map(([k, v], i) => (
            <div key={k} className={`reveal p-6 ${tone === "story" ? "bg-[#2a211b]" : "bg-bg"}`} style={{ transitionDelay: `${i * 120}ms` }}>
              <dt className="display text-5xl">{k}</dt><dd className="mt-2 text-sm opacity-70">{v}</dd>
            </div>
          ))}
        </dl>
      </div>
    </section>
  );
}

export function FamiliesSection({ s, families }: { s: Section; families: { slug: string; name: string; colour: string; description: string; count: number }[] }) {
  return (
    <section className="container-x py-24" id="families">
      <SectionHead s={s} />
      <ScentWheel families={families} />
    </section>
  );
}

export function GiftingBand({ s }: { s: Section }) {
  const occasions = [["Weddings", "/gifting/weddings"], ["Diwali & festivals", "/gifting/festivals"], ["Birthdays", "/gifting/birthdays"], ["Anniversaries", "/gifting/anniversaries"], ["Corporate", "/gifting/corporate"], ["Something special", "/gifting/special-occasions"]];
  return (
    <section className="container-x py-24">
      <div className="grid gap-10 rounded-[var(--radius)] border border-line bg-surface p-8 md:grid-cols-[1.2fr_1fr] md:p-14">
        <div className="reveal"><p className="eyebrow">The Gifting Atelier</p><h2 className="display mt-3 text-5xl">{s.title}</h2><p className="lede mt-4">{s.subtitle}</p>{s.ctaHref && <Link href={s.ctaHref} className="btn btn-primary mt-8">{s.ctaLabel}</Link>}</div>
        <ul className="grid grid-cols-2 gap-3 self-center">{occasions.map(([l, h]) => <li key={h}><Link href={h} className="lift block border border-line bg-bg p-5 text-center font-semibold">{l}</Link></li>)}</ul>
      </div>
    </section>
  );
}

export function ReviewsSection({ s, reviews }: { s: Section; reviews: { id: string; rating: number; title: string; body: string; isVerifiedPurchase: boolean; createdAt: Date; product: { name: string; slug: string }; user: { name: string | null } }[] }) {
  return (
    <section className="container-x py-20">
      <SectionHead s={s} />
      {reviews.length === 0 ? (
        <div className="rounded-[var(--radius)] border border-dashed border-line p-10 text-center">
          <p className="display text-2xl">No reviews yet</p>
          <p className="mx-auto mt-2 max-w-md text-muted">We don't publish invented testimonials. Reviews from verified customers will appear here once they've been moderated.</p>
        </div>
      ) : (
        <div className="grid gap-6 md:grid-cols-3">
          {reviews.map((r) => (
            <figure key={r.id} className="card p-6">
              <Stars value={r.rating} />
              <blockquote className="mt-3"><p className="font-semibold">{r.title}</p><p className="mt-2 text-muted">{r.body}</p></blockquote>
              <figcaption className="mt-4 text-sm">{r.user.name ?? "Customer"}{r.isVerifiedPurchase && <span className="badge badge-ok ml-2">Verified purchase</span>} · <Link className="underline" href={`/product/${r.product.slug}`}>{r.product.name}</Link> · {formatDate(r.createdAt)}</figcaption>
            </figure>
          ))}
        </div>
      )}
    </section>
  );
}

export function LayeringBand({ s, pairs }: { s: Section; pairs: { id: string; title: string; rationale: string; productA: { slug: string; name: string; subtitle: string }; productB: { slug: string; name: string; subtitle: string } }[] }) {
  return (
    <section className="bg-surface-2 py-20">
      <div className="container-x">
        <SectionHead s={s} />
        <div className="grid gap-6 md:grid-cols-2">
          {pairs.slice(0, 2).map((p) => (
            <Link key={p.id} href={`/layering?pair=${p.id}`} className="lift card flex flex-col gap-3 p-8">
              <p className="display text-3xl">{p.productA.name} <span className="text-accent">+</span> {p.productB.name}</p>
              <p className="text-sm text-muted">{p.productA.subtitle} · {p.productB.subtitle}</p>
              <p>{p.rationale}</p>
            </Link>
          ))}
        </div>
      </div>
    </section>
  );
}

export function JournalSection({ s, posts }: { s: Section; posts: { slug: string; title: string; excerpt: string; publishedAt: Date; brand: { name: string } | null }[] }) {
  return (
    <section className="container-x py-20">
      <SectionHead s={{ ...s, ctaLabel: "All stories", ctaHref: "/journal" }} />
      <div className="grid gap-8 md:grid-cols-3">
        {posts.slice(0, 3).map((p, i) => (
          <Link key={p.slug} href={`/journal/${p.slug}`} className="group reveal" style={{ transitionDelay: `${i * 100}ms` }}>
            <div className="reveal-img aspect-[3/2] overflow-hidden rounded-[var(--radius)]" style={{ background: ["linear-gradient(135deg,#b5725a,#e6d6b0)", "linear-gradient(135deg,#e6d6b0,#8fa889)", "linear-gradient(135deg,#3b2a20,#c9a24a)"][i % 3] }} />
            <p className="eyebrow mt-4">{p.brand?.name ?? "The house"} · {formatDate(p.publishedAt)}</p>
            <h3 className="display mt-2 text-2xl group-hover:text-accent">{p.title}</h3>
            <p className="mt-2 text-muted">{p.excerpt}</p>
          </Link>
        ))}
      </div>
    </section>
  );
}

export function LoyaltyBand({ s }: { s: Section }) {
  return (
    <section className="container-x py-16">
      <div className="grid items-center gap-8 border-y border-line py-14 md:grid-cols-[1.4fr_1fr]">
        <div className="reveal"><h2 className="display text-4xl md:text-5xl">{s.title}</h2><p className="lede mt-3">{s.subtitle}</p></div>
        <div className="flex flex-wrap gap-3 md:justify-end">{s.ctaHref && <Link href={s.ctaHref} className="btn btn-primary">{s.ctaLabel}</Link>}<Link href="/account/login" className="btn btn-ghost">Sign in</Link></div>
      </div>
    </section>
  );
}

export function NewsletterBand({ s }: { s: Section }) {
  return (
    <section className="container-x py-16">
      <div className="mx-auto max-w-2xl text-center"><h2 className="display text-4xl">{s.title}</h2><p className="mt-3 text-muted">{s.subtitle}</p><div className="mt-6 text-left"><NewsletterForm /></div></div>
    </section>
  );
}

export function priceFrom(p: ProductCard) { return formatINR(p.minPricePaise); }
