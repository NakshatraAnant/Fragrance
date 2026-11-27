"use client";
import { createContext, useCallback, useContext, useEffect, useState } from "react";
import { useToast } from "@/components/ui/toast";
import { track } from "@/components/analytics-tracker";

const Ctx = createContext<{ ids: Set<string>; toggle: (id: string, name?: string) => Promise<void> }>({ ids: new Set(), toggle: async () => {} });

export function WishlistProvider({ children }: { children: React.ReactNode }) {
  const [ids, setIds] = useState<Set<string>>(new Set());
  const { toast } = useToast();
  useEffect(() => { fetch("/api/wishlist").then((r) => r.json()).then((d) => setIds(new Set(d.productIds))).catch(() => {}); }, []);
  const toggle = useCallback(async (productId: string, name?: string) => {
    const res = await fetch("/api/wishlist", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ productId }) });
    const d = await res.json();
    if (!res.ok) { toast(d.error ?? "Couldn't update your wishlist.", "error"); return; }
    setIds(new Set(d.productIds));
    if (d.saved) track("wishlist_add", { productId });
    toast(d.saved ? `${name ?? "Saved"} added to your wishlist` : "Removed from your wishlist", "success", d.saved ? { label: "View", href: "/wishlist" } : undefined);
  }, [toast]);
  return <Ctx.Provider value={{ ids, toggle }}>{children}</Ctx.Provider>;
}

export const useWishlist = () => useContext(Ctx);

export function WishlistButton({ productId, name, className = "" }: { productId: string; name: string; className?: string }) {
  const { ids, toggle } = useWishlist();
  const saved = ids.has(productId);
  return (
    <button type="button" onClick={(e) => { e.preventDefault(); e.stopPropagation(); toggle(productId, name); }} aria-pressed={saved}
      aria-label={saved ? `Remove ${name} from wishlist` : `Add ${name} to wishlist`}
      className={`grid h-10 w-10 place-items-center rounded-full bg-surface/90 text-ink shadow-sm backdrop-blur transition hover:scale-110 ${className}`}>
      <svg viewBox="0 0 24 24" width="18" height="18" fill={saved ? "currentColor" : "none"} stroke="currentColor" strokeWidth="1.8" className={saved ? "animate-[pop_400ms_ease] text-accent" : ""}>
        <path d="M12 20.5s-7.5-4.6-7.5-10.2A4.3 4.3 0 0 1 12 7.6a4.3 4.3 0 0 1 7.5 2.7c0 5.6-7.5 10.2-7.5 10.2Z" strokeLinejoin="round" />
      </svg>
    </button>
  );
}
