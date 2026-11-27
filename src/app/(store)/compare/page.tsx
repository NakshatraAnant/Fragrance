import type { Metadata } from "next";
import Link from "next/link";
import { cardsByIds } from "@/lib/catalog";
import { formatINR, perUnit } from "@/lib/money";
import { PageHeader } from "@/components/listing/listing";
import { EmptyState } from "@/components/ui/empty-state";
import { ProductVisual } from "@/components/product/product-visual";
import { AddAllButton } from "@/components/product/add-all";

export const metadata: Metadata = { title: "Compare", robots: { index: false } };

export default async function ComparePage({ searchParams }: { searchParams: Promise<{ ids?: string }> }) {
  const ids = ((await searchParams).ids ?? "").split(",").filter(Boolean).slice(0, 4);
  const items = await cardsByIds(ids);
  const rows: [string, (c: (typeof items)[number]) => React.ReactNode][] = [
    ["House", (c) => c.brand.name], ["Format", (c) => c.subtitle], ["Sizes & prices", (c) => c.variants.map((v) => `${v.label} · ${formatINR(v.pricePaise)}`).join(" / ")],
    ["Price per unit", (c) => c.variants[0] ? perUnit(c.variants[0].pricePaise, c.variants[0].netQuantity, c.variants[0].netUnit) : "—"],
    ["Families", (c) => c.families.map((f) => f.name).join(", ") || "—"], ["Top notes", (c) => c.notes.top.join(", ") || "—"], ["Heart notes", (c) => c.notes.heart.join(", ") || "—"], ["Base notes", (c) => c.notes.base.join(", ") || "—"],
    ["Mood", (c) => c.moods.join(", ") || "—"], ["Occasion", (c) => c.occasions.join(", ") || "—"], ["Season", (c) => c.seasons.join(", ") || "—"], ["Intensity guide", (c) => c.intensity.toLowerCase()],
    ["Rating", (c) => (c.rating ? `${c.rating.average} (${c.rating.count})` : "No reviews yet")], ["Availability", (c) => (c.available ? "In stock" : "Out of stock")],
  ];
  return (
    <>
      <PageHeader eyebrow="Compare" title="Side by side" crumbs={[{ name: "Compare", href: "/compare" }]} />
      <div className="container-x pb-16">
        {items.length < 2 ? <EmptyState title="Pick at least two products" body="Tick “Compare” on any product card to add it here (up to four)."><Link href="/shop" className="btn btn-primary">Browse</Link></EmptyState> : (
          <div className="overflow-x-auto">
            <table className="w-full min-w-[40rem] border-collapse text-left text-sm">
              <thead><tr><th className="w-40" />{items.map((c) => <th key={c.id} className="p-3 align-top"><Link href={`/product/${c.slug}`}><ProductVisual name={c.name} format={c.format} brand={c.brand.slug} colour={c.colour} image={c.image} className="aspect-[4/5] w-full max-w-48 rounded-[var(--radius)]" label={false} /><p className="display mt-2 text-xl">{c.name}</p></Link></th>)}</tr></thead>
              <tbody className="divide-y divide-line">
                {rows.map(([label, fn]) => <tr key={label}><th scope="row" className="p-3 font-semibold text-muted">{label}</th>{items.map((c) => <td key={c.id} className="p-3 capitalize-first">{fn(c)}</td>)}</tr>)}
                <tr><th />{items.map((c) => <td key={c.id} className="p-3">{c.available && <AddAllButton variantIds={[c.variants.find((v) => v.available > 0)!.id]} label="Add to bag" className="btn btn-primary btn-sm" />}</td>)}</tr>
              </tbody>
            </table>
          </div>
        )}
      </div>
    </>
  );
}
