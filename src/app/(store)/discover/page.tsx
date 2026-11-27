import type { Metadata } from "next";
import Link from "next/link";
import { db } from "@/lib/db";
import { PageHeader } from "@/components/listing/listing";

export const metadata: Metadata = { title: "Discover", description: "Ways to find your scent: Scent Finder, discovery sets, families, layering and the journal.", alternates: { canonical: "/discover" } };

const PATHS = [
  ["Scent Finder", "Ten questions, with every recommendation explained.", "/scent-finder"],
  ["Discovery Studio", "Wear-test at home. The set price is credited on a full size.", "/discovery"],
  ["Fragrance families", "Explore the scent wheel.", "/families"],
  ["Layering Studio", "Curated pairings and the order to wear them in.", "/layering"],
  ["Gifting Atelier", "Gifts by recipient, occasion and budget.", "/gifting"],
  ["The Scent Journal", "Stories behind the briefs.", "/journal"],
];

export default async function DiscoverPage() {
  const brands = await db.brand.findMany({ orderBy: { sortOrder: "asc" } });
  return (
    <>
      <PageHeader eyebrow="Discover" title="Find your way in" intro="You can't smell online, so we've built several ways to choose with confidence." crumbs={[{ name: "Discover", href: "/discover" }]} />
      <section className="container-x grid gap-4 md:grid-cols-3">
        {PATHS.map(([t, d, h], i) => (
          <Link key={h} href={h} className="lift card reveal flex min-h-48 flex-col justify-between p-7" style={{ transitionDelay: `${i * 70}ms` }}>
            <span className="display text-3xl">{t}</span><span className="text-muted">{d}</span>
          </Link>
        ))}
      </section>
      <section className="container-x py-20">
        <h2 className="display mb-8 text-4xl">The houses</h2>
        <div className="grid gap-6 md:grid-cols-3">
          {brands.map((b) => (
            <Link key={b.slug} href={`/${b.slug}`} className="border-t border-line pt-6">
              <p className="display text-4xl">{b.name}</p>
              <p className="mt-1 text-xs uppercase tracking-widest text-muted">{b.priceBand}</p>
              <p className="mt-3 text-muted">{b.positioning}</p>
            </Link>
          ))}
        </div>
      </section>
    </>
  );
}
