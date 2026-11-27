"use client";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useCart } from "@/components/cart/cart-provider";

const BRAND_THEMES = new Set(["dhun", "vasana", "anvaya"]);

/** Applies the brand theme for brand storefront routes so the whole shell adopts its design system. */
export function ThemeShell({ children }: { children: React.ReactNode }) {
  const seg = usePathname().split("/")[1];
  return <div data-theme={BRAND_THEMES.has(seg) ? seg : "house"} className="min-h-screen">{children}</div>;
}

export function MobileBottomNav() {
  const pathname = usePathname();
  const { cart, setOpen } = useCart();
  const items = [
    { href: "/", label: "Home", d: "M4 11l8-7 8 7v9h-5v-6H9v6H4z" },
    { href: "/shop", label: "Shop", d: "M4 6h16M4 12h16M4 18h10" },
    { href: "/scent-finder", label: "Finder", d: "M12 3v4M12 17v4M3 12h4M17 12h4M12 8a4 4 0 1 1 0 8 4 4 0 0 1 0-8z" },
    { href: "/account", label: "Account", d: "M12 12a4 4 0 1 0 0-8 4 4 0 0 0 0 8zM4 21c1.5-4 4.5-6 8-6s6.5 2 8 6" },
  ];
  if (pathname.startsWith("/checkout")) return null;
  return (
    <nav aria-label="Mobile" className="fixed inset-x-0 bottom-0 z-40 grid grid-cols-5 border-t border-line bg-bg/95 pb-[env(safe-area-inset-bottom)] backdrop-blur md:hidden">
      {items.map((i) => (
        <Link key={i.href} href={i.href} className={`flex flex-col items-center gap-0.5 py-2 text-[11px] ${pathname === i.href ? "text-accent" : "text-muted"}`} aria-current={pathname === i.href ? "page" : undefined}>
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinejoin="round"><path d={i.d} /></svg>{i.label}
        </Link>
      ))}
      <button onClick={() => setOpen(true)} className="flex flex-col items-center gap-0.5 py-2 text-[11px] text-muted" aria-label="Open bag">
        <span className="relative">
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7"><path d="M5 8h14l-1.2 12H6.2L5 8Z" /><path d="M9 8V6a3 3 0 0 1 6 0v2" /></svg>
          {!!cart?.count && <span className="absolute -right-2 -top-1 grid h-4 min-w-4 place-items-center rounded-full bg-accent px-1 text-[10px] font-bold text-accent-ink">{cart.count}</span>}
        </span>
        Bag
      </button>
    </nav>
  );
}

export function AnnouncementBar({ text, href, cta }: { text: string; href?: string | null; cta?: string | null }) {
  return (
    <div className="bg-ink text-bg">
      <p className="container-x py-2 text-center text-xs tracking-wide md:text-sm">
        {text} {href && <Link href={href} className="ml-1 font-semibold underline underline-offset-2">{cta ?? "Learn more"}</Link>}
      </p>
    </div>
  );
}
