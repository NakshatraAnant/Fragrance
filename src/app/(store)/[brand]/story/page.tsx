import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { db } from "@/lib/db";
import { PageHeader } from "@/components/listing/listing";

type P = { params: Promise<{ brand: string }> };

export async function generateMetadata({ params }: P): Promise<Metadata> {
  const b = await db.brand.findUnique({ where: { slug: (await params).brand } });
  return b ? { title: `The story of ${b.name}`, description: b.positioning } : {};
}

const VOICE: Record<string, { personality: string[]; look: string; promise: string }> = {
  dhun: { personality: ["Playful", "Urban", "Quick", "Expressive"], look: "Six scent colours on white, rounded lowercase type, and flash-lit street and campus life.", promise: "Original scents at an everyday price, made for quick commerce and the way you actually live." },
  vasana: { personality: ["Warm", "Cultured", "Crafted", "Quietly confident"], look: "Champagne, clay, charcoal and muted gold. High-contrast serif type, Indian light, textures and the hands of makers.", promise: "Original Indian scents, made properly, easy to try." },
  anvaya: { personality: ["Rare", "Ceremonial", "Quiet", "Refined"], look: "Charcoal, brass and ivory. Engraved serif type, still life, stone, brass and shadow.", promise: "Extraits and ruh with Indian naturals as the reason to buy. Shown by appointment, never discounted." },
};

export default async function BrandStory({ params }: P) {
  const { brand } = await params;
  const b = await db.brand.findUnique({ where: { slug: brand }, include: { concepts: { where: { phase: "PHASE_ONE" }, orderBy: { code: "asc" } } } });
  if (!b || !VOICE[brand]) notFound();
  const v = VOICE[brand];
  return (
    <>
      <PageHeader eyebrow={`${b.name} · ${b.priceBand}`} title={`The story of ${b.name}`} intro={b.description} crumbs={[{ name: b.name, href: `/${brand}` }, { name: "Story", href: `/${brand}/story` }]} />
      <section className="container-x grid gap-12 py-12 md:grid-cols-3">
        <div><p className="eyebrow">Promise</p><p className="display mt-3 text-3xl">{v.promise}</p></div>
        <div><p className="eyebrow">Personality</p><ul className="mt-3 grid gap-1 text-xl">{v.personality.map((x) => <li key={x}>{x}</li>)}</ul></div>
        <div><p className="eyebrow">Look & feel</p><p className="mt-3 text-muted">{v.look}</p></div>
      </section>
      <section className="container-x py-12">
        <h2 className="display mb-8 text-4xl">The scent stories</h2>
        <div className="grid gap-4 md:grid-cols-2">
          {b.concepts.map((c) => (
            <article key={c.code} className="card p-6" style={{ borderTop: `4px solid ${c.colour ?? "var(--accent)"}` }}>
              <p className="eyebrow">{c.familyLabel}</p>
              <h3 className="display mt-2 text-2xl">{c.name}</h3>
              {c.story && <p className="mt-2 text-muted">{c.story.replace(". Story: ", " — ")}</p>}
              {c.marketingConcept && c.marketingConcept !== "—" && <p className="mt-3 text-sm italic">{c.marketingConcept}</p>}
            </article>
          ))}
        </div>
        <p className="mt-6 text-xs text-muted">Each scent starts from a creative brief in our concept library. Names are working names until legal clearance.</p>
        <Link href={`/${brand}`} className="btn btn-outline mt-8">Shop {b.name}</Link>
      </section>
    </>
  );
}
