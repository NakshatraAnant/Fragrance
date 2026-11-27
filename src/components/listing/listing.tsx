import Link from "next/link";
import { Suspense } from "react";
import { applyFilters, getAllCards, parseListingParams, type ListingFilters, type ProductCard } from "@/lib/catalog";
import { db } from "@/lib/db";
import { ProductGrid } from "@/components/product/product-card";
import { FilterSidebar, ListingToolbar, type Facet } from "./filter-panel";
import { Breadcrumbs } from "@/components/ui/breadcrumbs";
import { EmptyState } from "@/components/ui/empty-state";

const PAGE_SIZE = 24;
const FORMAT_LABEL: Record<string, string> = { EDP: "Eau de parfum", EXTRAIT: "Extrait", MIST: "Body & hair mist", ATTAR: "Perfume oil", RUH: "Ruh", TRAVEL: "Travel spray", SOLID: "Solid", DISCOVERY: "Discovery set", CANDLE: "Candle", REED: "Reed diffuser", ROOM_SPRAY: "Room & linen spray", CAR: "Car", BAKHOOR: "Bakhoor", GIFT: "Coffret" };
const title = (s: string) => s.replace(/-/g, " ").replace(/^\w/, (c) => c.toUpperCase());

export async function buildFacets(base: ProductCard[], hide: string[] = []): Promise<Facet[]> {
  const [fams, brands, cats] = await Promise.all([db.fragranceFamily.findMany({ orderBy: { sortOrder: "asc" } }), db.brand.findMany({ orderBy: { sortOrder: "asc" } }), db.category.findMany({ orderBy: { sortOrder: "asc" } })]);
  const count = (pred: (c: ProductCard) => boolean) => base.filter(pred).length;
  const uniq = (xs: string[]) => [...new Set(xs)];
  const facets: Facet[] = [
    { key: "brand", label: "House", options: brands.map((b) => ({ value: b.slug, label: b.name, count: count((c) => c.brand.slug === b.slug) })) },
    { key: "category", label: "Category", options: cats.map((c) => ({ value: c.slug, label: c.name, count: count((x) => x.category === c.slug) })).filter((o) => o.count) },
    { key: "family", label: "Fragrance family", options: fams.map((f) => ({ value: f.slug, label: f.name, colour: f.colour, count: count((c) => c.families.some((x) => x.slug === f.slug)) })).filter((o) => o.count) },
    { key: "format", label: "Format", options: uniq(base.map((c) => c.format)).map((f) => ({ value: f, label: FORMAT_LABEL[f] ?? f, count: count((c) => c.format === f) })) },
    { key: "occasion", label: "Occasion", options: uniq(base.flatMap((c) => c.occasions)).sort().map((o) => ({ value: o, label: title(o), count: count((c) => c.occasions.includes(o)) })) },
    { key: "season", label: "Season & climate", options: ["summer", "monsoon", "winter", "all-season"].map((s) => ({ value: s, label: title(s), count: count((c) => c.seasons.includes(s)) })).filter((o) => o.count) },
    { key: "mood", label: "Mood", options: uniq(base.flatMap((c) => c.moods)).sort().map((m) => ({ value: m, label: title(m), count: count((c) => c.moods.includes(m)) })) },
    { key: "intensity", label: "Intensity (concentration guide)", options: [["SOFT", "Soft"], ["MODERATE", "Moderate"], ["RICH", "Rich"], ["AMBIENT", "Home / ambient"]].map(([v, l]) => ({ value: v, label: l, count: count((c) => c.intensity === v) })).filter((o) => o.count) },
    { key: "size", label: "Size", options: uniq(base.flatMap((c) => c.variants.map((v) => v.label))).sort((a, b) => parseFloat(a) - parseFloat(b)).map((s) => ({ value: s, label: s, count: count((c) => c.variants.some((v) => v.label === s)) })) },
    { key: "note", label: "Notes", options: uniq(base.flatMap((c) => c.noteSlugs)).map((n) => ({ value: n, label: title(n), count: count((c) => c.noteSlugs.includes(n)) })).sort((a, b) => b.count - a.count).slice(0, 24) },
  ];
  return facets.filter((f) => !hide.includes(f.key));
}

export async function Listing({ searchParams, base, hideFacets = [], basePath, emptyHint }: { searchParams: Record<string, string | string[] | undefined>; base?: ListingFilters; hideFacets?: string[]; basePath: string; emptyHint?: React.ReactNode }) {
  const all = await getAllCards();
  const scoped = base ? applyFilters(all, base) : all;
  const f = parseListingParams(searchParams);
  const results = applyFilters(scoped, f);
  const facets = await buildFacets(scoped, hideFacets);
  const page = Math.max(1, Number(searchParams.page ?? 1) || 1);
  const pages = Math.max(1, Math.ceil(results.length / PAGE_SIZE));
  const slice = results.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE);
  const qs = (p: number) => { const u = new URLSearchParams(Object.entries(searchParams).flatMap(([k, v]) => (v === undefined ? [] : [[k, Array.isArray(v) ? v.join(",") : v]]))); u.set("page", String(p)); return `${basePath}?${u}`; };
  return (
    <div className="grid gap-10 lg:grid-cols-[16rem_1fr]">
      <FilterSidebar facets={facets} />
      <div>
        <Suspense><ListingToolbar facets={facets} total={results.length} /></Suspense>
        {slice.length ? <ProductGrid products={slice} list={basePath} cols={3} /> : (
          <EmptyState title="Nothing matches those filters" body="Try removing a filter, or let the Scent Finder suggest something.">
            <Link href={basePath} className="btn btn-outline">Clear filters</Link><Link href="/scent-finder" className="btn btn-primary">Scent Finder</Link>{emptyHint}
          </EmptyState>
        )}
        {pages > 1 && (
          <nav aria-label="Pagination" className="mt-12 flex items-center justify-center gap-2">
            {page > 1 && <Link className="btn btn-outline btn-sm" href={qs(page - 1)} rel="prev">Previous</Link>}
            <span className="text-sm text-muted">Page {page} of {pages}</span>
            {page < pages && <Link className="btn btn-outline btn-sm" href={qs(page + 1)} rel="next">Next</Link>}
          </nav>
        )}
      </div>
    </div>
  );
}

export function PageHeader({ eyebrow, title, intro, crumbs, children }: { eyebrow?: string; title: string; intro?: string | null; crumbs?: { name: string; href: string }[]; children?: React.ReactNode }) {
  return (
    <header className="container-x pb-8 pt-10 md:pt-14">
      {crumbs && <Breadcrumbs items={crumbs} />}
      {eyebrow && <p className="eyebrow mt-6">{eyebrow}</p>}
      <h1 className="display mt-3 text-5xl md:text-7xl">{title}</h1>
      {intro && <p className="lede mt-4">{intro}</p>}
      {children}
    </header>
  );
}
