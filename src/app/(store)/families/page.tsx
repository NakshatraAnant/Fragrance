import type { Metadata } from "next";
import Link from "next/link";
import { getFamiliesWithCounts } from "@/lib/content";
import { PageHeader } from "@/components/listing/listing";
import { ScentWheel } from "@/components/discovery/scent-wheel";

export const metadata: Metadata = { title: "Fragrance families", description: "Explore scents by family: petrichor, white florals, rose, spice, oud accords, tea, citrus and more.", alternates: { canonical: "/families" } };

export default async function FamiliesPage() {
  const families = (await getFamiliesWithCounts()).filter((f) => f.count > 0);
  return (
    <>
      <PageHeader eyebrow="Discover" title="Fragrance families" intro="Every scent in the house belongs to one or more families. Start with the ones you already love." crumbs={[{ name: "Fragrance families", href: "/families" }]} />
      <section className="container-x py-8"><ScentWheel families={families} /></section>
      <section className="container-x grid gap-4 py-16 sm:grid-cols-2 lg:grid-cols-4">
        {families.map((f) => (
          <Link key={f.slug} href={`/families/${f.slug}`} className="lift card overflow-hidden">
            <div className="h-28" style={{ background: `linear-gradient(135deg, ${f.colour}, color-mix(in oklab, ${f.colour} 30%, white))` }} />
            <div className="p-5"><h2 className="display text-2xl">{f.name}</h2><p className="mt-1 text-sm text-muted">{f.description}</p><p className="mt-3 text-xs font-semibold">{f.count} products →</p></div>
          </Link>
        ))}
      </section>
    </>
  );
}
