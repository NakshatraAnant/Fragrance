"use client";
import { createContext, useCallback, useContext, useEffect, useState } from "react";
import { usePathname } from "next/navigation";
import { useToast } from "@/components/ui/toast";
import { track } from "@/components/analytics-tracker";
import type { CartView } from "@/lib/cart";

type CartCtx = {
  cart: CartView | null;
  loading: boolean;
  open: boolean;
  setOpen: (o: boolean) => void;
  mutate: (body: Record<string, unknown>, opts?: { openDrawer?: boolean; success?: string }) => Promise<boolean>;
  refresh: () => Promise<void>;
};

const Ctx = createContext<CartCtx | null>(null);

export function CartProvider({ children }: { children: React.ReactNode }) {
  const [cart, setCart] = useState<CartView | null>(null);
  const [loading, setLoading] = useState(false);
  const [open, setOpen] = useState(false);
  const { toast } = useToast();

  const refresh = useCallback(async () => {
    const res = await fetch("/api/cart", { cache: "no-store" });
    if (res.ok) setCart(await res.json());
  }, []);

  const pathname = usePathname();
  // Re-sync after navigations (e.g. checkout empties the bag server-side).
  useEffect(() => { refresh(); }, [refresh, pathname]);

  const mutate = useCallback(async (body: Record<string, unknown>, opts: { openDrawer?: boolean; success?: string } = {}) => {
    setLoading(true);
    try {
      const res = await fetch("/api/cart", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(body) });
      const data = await res.json();
      if (!res.ok) {
        if (data.cart) setCart(data.cart);
        toast(data.error ?? "Something went wrong.", "error");
        return false;
      }
      setCart(data);
      if (body.action === "add") track("add_to_cart", { props: { variantId: body.variantId } });
      if (opts.success) toast(opts.success, "success");
      if (opts.openDrawer) setOpen(true);
      return true;
    } catch {
      toast("You appear to be offline. Please try again.", "error");
      return false;
    } finally {
      setLoading(false);
    }
  }, [toast]);

  return <Ctx.Provider value={{ cart, loading, open, setOpen, mutate, refresh }}>{children}</Ctx.Provider>;
}

export function useCart() {
  const c = useContext(Ctx);
  if (!c) throw new Error("useCart must be used inside CartProvider");
  return c;
}
