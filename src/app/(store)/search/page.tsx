import type { Metadata } from "next";
import Link from "next/link";
import { getAllCards } from "@/lib/catalog";
import { searchCatalogue, POPULAR_SEARCHES } from "@/lib/search";
import { ProductGrid } from "@/components/product/product-card";
import { PageHeader } from "@/components/listing/listing";
import { EmptyState } from "@/components/ui/empty-state";
import { SearchBox } from "@/components/listing/search-box";
import { recordServerEvent } from "@/lib/analytics";
import { getCurrentUser } from "@/lib/auth";

export const metadata: Metadata = { title: "Search", robots: { index: false } };

export default async function SearchPage({ searchParams }: { searchParams: Promise<{ q?: string }> }) {
  const q = ((await searchParams).q ?? "").slice(0, 120);
  const cards = await getAllCards();
  const res = q ? searchCatalogue(q, cards) : null;
  if (res) await recordServerEvent("search", { userId: (await getCurrentUser())?.id, props: { q, results: res.results.length, zero: res.results.length === 0 } });
  return (
    <>
      <PageHeader eyebrow="Search" title={q ? `“${q}”` : "Search the house"}>
        <div className="mt-6 max-w-2xl"><SearchBox initial={q} /></div>
        {res && res.interpretation.length > 0 && <p className="mt-3 text-sm text-muted">Searching for: {res.interpretation.join(" · ")}</p>}
      </PageHeader>
      <div className="container-x">
        {!q && <div className="flex flex-wrap gap-2">{POPULAR_SEARCHES.map((s) => <Link key={s} href={`/search?q=${encodeURIComponent(s)}`} className="chip">{s}</Link>)}</div>}
        {res && res.results.length > 0 && (
          <>
            <p className="mb-6 text-sm text-muted" data-testid="search-count">{res.results.length} result{res.results.length === 1 ? "" : "s"}</p>
            <ProductGrid products={res.results} list="search" />
          </>
        )}
        {res && res.results.length === 0 && (
          <>
            <EmptyState title="No exact matches" body="Try a note (mogra, khus, saffron), a mood (fresh, warm) or an occasion (office, wedding). Or let us recommend something.">
              <Link href="/scent-finder" className="btn btn-primary">Take the Scent Finder</Link>
            </EmptyState>
            {res.zeroResultRecovery.length > 0 && (
              <section className="mt-12"><h2 className="display mb-6 text-3xl">You might like</h2><ProductGrid products={res.zeroResultRecovery} list="search-recovery" /></section>
            )}
          </>
        )}
      </div>
    </>
  );
}
