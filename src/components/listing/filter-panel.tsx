"use client";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { useState, useTransition } from "react";
import { Modal } from "@/components/ui/modal";
import { track } from "@/components/analytics-tracker";

export type Facet = { key: string; label: string; options: { value: string; label: string; count: number; colour?: string }[] };

const SORTS = [["featured", "Featured"], ["new", "Newest"], ["price-asc", "Price: low to high"], ["price-desc", "Price: high to low"], ["rating", "Top rated"], ["name", "A–Z"]];

function useParamsState() {
  const router = useRouter();
  const pathname = usePathname();
  const sp = useSearchParams();
  const [pending, start] = useTransition();
  const set = (mut: (p: URLSearchParams) => void) => {
    const p = new URLSearchParams(sp.toString());
    mut(p);
    p.delete("page");
    start(() => router.push(`${pathname}${p.toString() ? `?${p}` : ""}`, { scroll: false }));
  };
  return { sp, set, pending };
}

function FacetGroups({ facets }: { facets: Facet[] }) {
  const { sp, set } = useParamsState();
  const toggle = (key: string, value: string) => set((p) => {
    const cur = (p.get(key) ?? "").split(",").filter(Boolean);
    const next = cur.includes(value) ? cur.filter((v) => v !== value) : [...cur, value];
    if (next.length) p.set(key, next.join(",")); else p.delete(key);
    track("filter_use", { props: { key, value } });
  });
  const [min, setMin] = useState(sp.get("min") ?? "");
  const [max, setMax] = useState(sp.get("max") ?? "");
  return (
    <div className="grid gap-6">
      {facets.filter((f) => f.options.length > 0).map((f) => {
        const active = (sp.get(f.key) ?? "").split(",");
        return (
          <fieldset key={f.key}>
            <legend className="eyebrow mb-3">{f.label}</legend>
            <div className="flex flex-wrap gap-2">
              {f.options.map((o) => (
                <button key={o.value} type="button" className="chip text-sm" aria-pressed={active.includes(o.value)} onClick={() => toggle(f.key, o.value)} disabled={o.count === 0 && !active.includes(o.value)}>
                  {o.colour && <span className="h-2.5 w-2.5 rounded-full" style={{ background: o.colour }} />}{o.label} <span className="text-xs opacity-60">{o.count}</span>
                </button>
              ))}
            </div>
          </fieldset>
        );
      })}
      <fieldset>
        <legend className="eyebrow mb-3">Price (₹)</legend>
        <form className="flex items-center gap-2" onSubmit={(e) => { e.preventDefault(); set((p) => { min ? p.set("min", min) : p.delete("min"); max ? p.set("max", max) : p.delete("max"); }); }}>
          <label className="sr-only" htmlFor="pmin">Minimum price</label>
          <input id="pmin" className="input !min-h-10" inputMode="numeric" placeholder="Min" value={min} onChange={(e) => setMin(e.target.value.replace(/\D/g, ""))} />
          <span>–</span>
          <label className="sr-only" htmlFor="pmax">Maximum price</label>
          <input id="pmax" className="input !min-h-10" inputMode="numeric" placeholder="Max" value={max} onChange={(e) => setMax(e.target.value.replace(/\D/g, ""))} />
          <button className="btn btn-outline btn-sm">Go</button>
        </form>
      </fieldset>
      <label className="flex items-center gap-2 text-sm">
        <input type="checkbox" className="accent-[var(--accent)]" checked={sp.get("instock") === "1"} onChange={(e) => set((p) => (e.target.checked ? p.set("instock", "1") : p.delete("instock")))} /> In stock only
      </label>
    </div>
  );
}

export function ListingToolbar({ facets, total }: { facets: Facet[]; total: number }) {
  const { sp, set, pending } = useParamsState();
  const [open, setOpen] = useState(false);
  const activeCount = facets.reduce((n, f) => n + (sp.get(f.key) ? sp.get(f.key)!.split(",").length : 0), 0) + (sp.get("min") || sp.get("max") ? 1 : 0) + (sp.get("instock") ? 1 : 0);
  return (
    <>
      <div className="sticky top-16 z-30 -mx-4 mb-8 flex items-center gap-3 border-b border-line bg-bg/95 px-4 py-3 backdrop-blur md:mx-0 md:px-0">
        <button className="btn btn-outline btn-sm lg:hidden" onClick={() => setOpen(true)} aria-expanded={open} data-testid="open-filters">Filters{activeCount ? ` (${activeCount})` : ""}</button>
        <p className="text-sm text-muted" aria-live="polite" data-testid="result-count">{pending ? "Updating…" : `${total} product${total === 1 ? "" : "s"}`}</p>
        {activeCount > 0 && <button className="text-sm underline" onClick={() => set((p) => { for (const f of facets) p.delete(f.key); ["min", "max", "instock"].forEach((k) => p.delete(k)); })}>Clear all</button>}
        <label className="ml-auto flex items-center gap-2 text-sm"><span className="hidden sm:inline">Sort</span>
          <select className="select !min-h-9 !py-1 text-sm" value={sp.get("sort") ?? "featured"} onChange={(e) => set((p) => p.set("sort", e.target.value))} aria-label="Sort products">
            {SORTS.map(([v, l]) => <option key={v} value={v}>{l}</option>)}
          </select>
        </label>
      </div>
      <Modal open={open} onClose={() => setOpen(false)} title="Filters" variant="bottom">
        <div className="p-6">
          <div className="mb-4 flex items-center justify-between"><h2 className="display text-2xl">Filters</h2><button className="btn btn-ghost btn-sm" onClick={() => setOpen(false)} aria-label="Close filters">✕</button></div>
          <FacetGroups facets={facets} />
          <button className="btn btn-primary btn-block mt-6" onClick={() => setOpen(false)}>Show {total} products</button>
        </div>
      </Modal>
    </>
  );
}

export function FilterSidebar({ facets }: { facets: Facet[] }) {
  return <aside className="hidden lg:block" aria-label="Filters"><FacetGroups facets={facets} /></aside>;
}
