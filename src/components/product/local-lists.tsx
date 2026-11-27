"use client";
import { useEffect, useState, useSyncExternalStore } from "react";
import Link from "next/link";
import type { ProductCard } from "@/lib/catalog";

/** Per-viewer conveniences kept in localStorage: recently viewed and the compare tray. */
const KEYS = { recent: "fh_recent", compare: "fh_compare" } as const;
const listeners = new Set<() => void>();
const read = (k: string): string[] => { try { return JSON.parse(localStorage.getItem(k) ?? "[]"); } catch { return []; } };
const write = (k: string, v: string[]) => { try { localStorage.setItem(k, JSON.stringify(v)); } catch {} listeners.forEach((l) => l()); };
const subscribe = (l: () => void) => { listeners.add(l); window.addEventListener("storage", l); return () => { listeners.delete(l); window.removeEventListener("storage", l); }; };
function useList(k: string) {
  const raw = useSyncExternalStore(subscribe, () => { try { return localStorage.getItem(k) ?? "[]"; } catch { return "[]"; } }, () => "[]");
  return JSON.parse(raw) as string[];
}

export function recordRecentlyViewed(productId: string) {
  write(KEYS.recent, [productId, ...read(KEYS.recent).filter((x) => x !== productId)].slice(0, 12));
}
export function RecordView({ productId }: { productId: string }) {
  useEffect(() => { recordRecentlyViewed(productId); }, [productId]);
  return null;
}

export function useCompare() {
  const ids = useList(KEYS.compare);
  return {
    ids,
    toggle: (id: string) => write(KEYS.compare, ids.includes(id) ? ids.filter((x) => x !== id) : [...ids, id].slice(-4)),
    clear: () => write(KEYS.compare, []),
  };
}

export function CompareToggle({ productId }: { productId: string }) {
  const { ids, toggle } = useCompare();
  const on = ids.includes(productId);
  return (
    <label className="inline-flex cursor-pointer items-center gap-1.5 text-xs text-muted" onClick={(e) => e.stopPropagation()}>
      <input type="checkbox" checked={on} onChange={() => toggle(productId)} className="accent-[var(--accent)]" /> Compare
    </label>
  );
}

export function CompareTray() {
  const { ids, clear } = useCompare();
  if (ids.length === 0) return null;
  return (
    <div className="fixed inset-x-0 bottom-16 z-40 mx-auto flex w-[min(92vw,34rem)] items-center justify-between gap-3 rounded-full border border-line bg-surface px-5 py-2.5 shadow-2xl md:bottom-6">
      <span className="text-sm">{ids.length} selected to compare{ids.length < 2 ? " (pick at least 2)" : ""}</span>
      <div className="flex items-center gap-2">
        <button className="btn btn-ghost btn-sm" onClick={clear}>Clear</button>
        <Link href={`/compare?ids=${ids.join(",")}`} className="btn btn-primary btn-sm" aria-disabled={ids.length < 2}>Compare</Link>
      </div>
    </div>
  );
}

export function RecentlyViewed({ excludeId, title = "Recently viewed" }: { excludeId?: string; title?: string }) {
  const ids = useList(KEYS.recent).filter((x) => x !== excludeId).slice(0, 6);
  const [items, setItems] = useState<ProductCard[]>([]);
  const key = ids.join(",");
  useEffect(() => {
    if (!key) { setItems([]); return; }
    fetch(`/api/products?ids=${key}`).then((r) => r.json()).then((d) => setItems(d.products)).catch(() => {});
  }, [key]);
  if (!items.length) return null;
  return (
    <section className="container-x py-12" aria-labelledby="recent-h">
      <h2 id="recent-h" className="display mb-6 text-2xl">{title}</h2>
      <div className="no-scrollbar flex gap-4 overflow-x-auto pb-2">
        {items.map((p) => (
          <Link key={p.id} href={`/product/${p.slug}`} className="w-40 shrink-0">
            <div className="aspect-[4/5] overflow-hidden rounded-[var(--radius)] bg-surface-2" style={{ background: `linear-gradient(160deg, ${p.colour ?? "#ddd"}33, transparent)` }}>
              <div className="grid h-full place-items-center p-4 text-center text-xs text-muted">{p.subtitle}</div>
            </div>
            <p className="mt-2 text-sm font-semibold">{p.name}</p>
            <p className="text-xs text-muted">{p.brand.name}</p>
          </Link>
        ))}
      </div>
    </section>
  );
}
