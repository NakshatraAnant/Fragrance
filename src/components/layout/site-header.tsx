"use client";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import { useCart } from "@/components/cart/cart-provider";
import { Modal } from "@/components/ui/modal";
import { track } from "@/components/analytics-tracker";

const NAV = [
  { label: "Shop", href: "/shop", children: [
    { label: "Shop all", href: "/shop" }, { label: "New arrivals", href: "/new" }, { label: "Bestsellers", href: "/bestsellers" },
    { label: "Discovery sets", href: "/discovery" }, { label: "Attar & oils", href: "/shop?category=attar-oils" }, { label: "Home fragrance", href: "/shop?category=home-fragrance" }, { label: "Gifting", href: "/gifting" },
  ] },
  { label: "The Houses", href: "/discover", children: [
    { label: "Dhun — everyday, ₹299+", href: "/dhun" }, { label: "Vasana — India's perfume house", href: "/vasana" }, { label: "Anvaya — extraits & ruh", href: "/anvaya" },
  ] },
  { label: "Scent Finder", href: "/scent-finder" },
  { label: "Discover", href: "/discover", children: [
    { label: "Fragrance families", href: "/families" }, { label: "Layering Studio", href: "/layering" }, { label: "The Scent Journal", href: "/journal" }, { label: "Our craft", href: "/craft" }, { label: "Ingredients", href: "/ingredients" },
  ] },
  { label: "Gifting", href: "/gifting" },
];

export function SiteHeader({ signedIn, isStaff }: { signedIn: boolean; isStaff: boolean }) {
  const { cart, setOpen } = useCart();
  const [menu, setMenu] = useState(false);
  const [search, setSearch] = useState(false);
  const [scrolled, setScrolled] = useState(false);
  const pathname = usePathname();
  useEffect(() => { setMenu(false); setSearch(false); }, [pathname]);
  useEffect(() => {
    const on = () => setScrolled(window.scrollY > 8);
    on(); window.addEventListener("scroll", on, { passive: true });
    return () => window.removeEventListener("scroll", on);
  }, []);
  const count = cart?.count ?? 0;
  return (
    <header className={`sticky top-0 z-50 border-b transition-colors duration-300 ${scrolled ? "border-line bg-bg/92 backdrop-blur-md" : "border-transparent bg-bg"}`}>
      <div className="container-x flex h-16 items-center gap-4">
        <button className="btn btn-ghost -ml-3 lg:hidden" onClick={() => setMenu(true)} aria-label="Open menu" aria-expanded={menu}>
          <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6"><path d="M3 7h18M3 12h18M3 17h18" /></svg>
        </button>
        <Link href="/" className="display text-2xl tracking-tight" aria-label="Vasana House home">Vasana <span className="italic text-accent">House</span></Link>
        <nav aria-label="Primary" className="ml-6 hidden items-center gap-1 lg:flex">
          {NAV.map((n) => (
            <div key={n.label} className="group relative">
              <Link href={n.href} className={`inline-flex h-16 items-center px-3 text-sm font-semibold tracking-wide transition hover:text-accent ${pathname === n.href ? "text-accent" : ""}`} aria-haspopup={n.children ? "true" : undefined}>{n.label}</Link>
              {n.children && (
                <div className="invisible absolute left-0 top-full min-w-64 translate-y-2 border border-line bg-surface p-3 opacity-0 shadow-xl transition duration-200 group-focus-within:visible group-focus-within:translate-y-0 group-focus-within:opacity-100 group-hover:visible group-hover:translate-y-0 group-hover:opacity-100">
                  {n.children.map((c) => <Link key={c.href + c.label} href={c.href} className="block rounded px-3 py-2 text-sm hover:bg-surface-2">{c.label}</Link>)}
                </div>
              )}
            </div>
          ))}
        </nav>
        <div className="ml-auto flex items-center gap-1">
          <button className="btn btn-ghost" onClick={() => setSearch(true)} aria-label="Search">
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7"><circle cx="11" cy="11" r="7" /><path d="m20 20-3.5-3.5" /></svg>
          </button>
          {isStaff && <Link href="/admin" className="btn btn-ghost hidden text-xs md:inline-flex">Admin</Link>}
          <Link href={signedIn ? "/account" : "/account/login"} className="btn btn-ghost hidden md:inline-flex" aria-label={signedIn ? "Your account" : "Sign in"}>
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7"><circle cx="12" cy="8" r="4" /><path d="M4 21c1.5-4 4.5-6 8-6s6.5 2 8 6" /></svg>
          </Link>
          <Link href="/wishlist" className="btn btn-ghost hidden md:inline-flex" aria-label="Wishlist">
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7"><path d="M12 20.5s-7.5-4.6-7.5-10.2A4.3 4.3 0 0 1 12 7.6a4.3 4.3 0 0 1 7.5 2.7c0 5.6-7.5 10.2-7.5 10.2Z" /></svg>
          </Link>
          <button className="btn btn-ghost relative" onClick={() => setOpen(true)} aria-label={`Bag, ${count} item${count === 1 ? "" : "s"}`} data-testid="open-cart">
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7"><path d="M5 8h14l-1.2 12H6.2L5 8Z" /><path d="M9 8V6a3 3 0 0 1 6 0v2" /></svg>
            {count > 0 && <span key={count} className="absolute right-1 top-1 grid h-5 min-w-5 place-items-center rounded-full bg-accent px-1 text-[11px] font-bold text-accent-ink animate-[pop_400ms_ease]" data-testid="cart-count">{count}</span>}
          </button>
        </div>
      </div>
      <Modal open={menu} onClose={() => setMenu(false)} title="Menu" variant="right">
        <div className="flex h-full flex-col overflow-y-auto p-6">
          <div className="mb-6 flex items-center justify-between"><span className="display text-2xl">Menu</span><button className="btn btn-ghost btn-sm" onClick={() => setMenu(false)} aria-label="Close menu">✕</button></div>
          {NAV.map((n) => (
            <details key={n.label} className="border-b border-line py-2" open={n.label === "Shop"}>
              <summary className="flex cursor-pointer list-none items-center justify-between py-2 text-lg font-semibold">{n.label}{n.children && <span aria-hidden>+</span>}</summary>
              <div className="grid pb-2">
                {(n.children ?? [{ label: n.label, href: n.href }]).map((c) => <Link key={c.href + c.label} href={c.href} className="py-2 text-muted">{c.label}</Link>)}
              </div>
            </details>
          ))}
          <div className="mt-6 grid gap-2">
            <Link href={signedIn ? "/account" : "/account/login"} className="btn btn-outline">{signedIn ? "Your account" : "Sign in / Register"}</Link>
            <Link href="/odaya" className="btn btn-ghost">Odaya — for business</Link>
          </div>
        </div>
      </Modal>
      <SearchOverlay open={search} onClose={() => setSearch(false)} />
    </header>
  );
}

type Suggest = { products: { id: string; slug: string; name: string; subtitle: string; brand: { name: string } }[]; terms: string[]; popular: string[]; recent?: string[] };

function SearchOverlay({ open, onClose }: { open: boolean; onClose: () => void }) {
  const [q, setQ] = useState("");
  const [data, setData] = useState<Suggest | null>(null);
  const [recent, setRecent] = useState<string[]>([]);
  const router = useRouter();
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);
  useEffect(() => { if (open) { try { setRecent(JSON.parse(localStorage.getItem("fh_recent_searches") ?? "[]")); } catch {} } }, [open]);
  useEffect(() => {
    if (!open) return;
    if (timer.current) clearTimeout(timer.current);
    timer.current = setTimeout(() => { fetch(`/api/search/suggest?q=${encodeURIComponent(q)}`).then((r) => r.json()).then(setData).catch(() => {}); }, 140);
  }, [q, open]);
  const go = (term: string) => {
    if (!term.trim()) return;
    try { localStorage.setItem("fh_recent_searches", JSON.stringify([term, ...recent.filter((r) => r !== term)].slice(0, 6))); } catch {}
    track("search", { props: { q: term, source: "overlay" } });
    onClose();
    router.push(`/search?q=${encodeURIComponent(term)}`);
  };
  return (
    <Modal open={open} onClose={onClose} title="Search" wide>
      <form role="search" onSubmit={(e) => { e.preventDefault(); go(q); }}>
        <label htmlFor="site-search" className="sr-only">Search fragrances</label>
        <input id="site-search" className="input text-lg" placeholder="Try “mogra”, “fresh for summer”, “gift under ₹3000”" value={q} onChange={(e) => setQ(e.target.value)} autoComplete="off" data-testid="search-input" />
      </form>
      <div className="mt-5 grid gap-6 md:grid-cols-2">
        <div>
          {data?.products?.length ? (
            <>
              <p className="eyebrow mb-2">Products</p>
              <ul className="grid gap-1">{data.products.map((p) => <li key={p.id}><Link href={`/product/${p.slug}`} onClick={onClose} className="block rounded px-2 py-2 hover:bg-surface-2"><span className="font-semibold">{p.name}</span> <span className="text-sm text-muted">{p.subtitle} · {p.brand.name}</span></Link></li>)}</ul>
            </>
          ) : q.length >= 2 ? <p className="text-sm text-muted">No direct product matches — press Enter to search notes, moods and occasions.</p> : null}
          {data?.terms?.length ? <div className="mt-4 flex flex-wrap gap-2">{data.terms.map((t) => <button key={t} className="chip" onClick={() => go(t)}>{t}</button>)}</div> : null}
        </div>
        <div className="grid content-start gap-4">
          {recent.length > 0 && <div><p className="eyebrow mb-2">Recent searches</p><div className="flex flex-wrap gap-2">{recent.map((t) => <button key={t} className="chip" onClick={() => go(t)}>{t}</button>)}</div></div>}
          <div><p className="eyebrow mb-2">Popular searches</p><div className="flex flex-wrap gap-2">{(data?.popular ?? []).map((t) => <button key={t} className="chip" onClick={() => go(t)}>{t}</button>)}</div></div>
        </div>
      </div>
    </Modal>
  );
}
