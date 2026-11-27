"use client";
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { formatINR, perUnit } from "@/lib/money";
import { useCart } from "@/components/cart/cart-provider";
import { WishlistButton } from "./wishlist";
import { track } from "@/components/analytics-tracker";

export type PanelVariant = { id: string; sku: string; label: string; pricePaise: number; mrpPaise: number; available: number; netQuantity: number; netUnit: string; concentration: string | null };

export function PurchasePanel({ productId, name, subtitle, brand, variants, initialSku, discoveryHref, creditNote }: {
  productId: string; name: string; subtitle: string; brand: string; variants: PanelVariant[]; initialSku?: string; discoveryHref?: string | null; creditNote?: string | null;
}) {
  const router = useRouter();
  const { mutate, loading } = useCart();
  const [vid, setVid] = useState(() => (variants.find((v) => v.sku === initialSku) ?? variants.find((v) => v.available > 0) ?? variants[0]).id);
  const [qty, setQty] = useState(1);
  const v = variants.find((x) => x.id === vid)!;
  const soldOut = v.available <= 0;
  const maxQty = Math.max(1, Math.min(10, v.available));

  useEffect(() => {
    // Keep the URL in sync with the selected SKU so it is shareable and deep-linkable.
    const url = new URL(window.location.href);
    url.searchParams.set("sku", v.sku);
    window.history.replaceState(null, "", url.toString());
    if (qty > maxQty) setQty(maxQty);
  }, [v.sku, maxQty, qty]);
  useEffect(() => { track("product_view", { productId, sku: v.sku, brand }); }, [productId, v.sku, brand]);

  const add = async (buyNow = false) => {
    const ok = await mutate({ action: "add", variantId: v.id, quantity: qty }, { openDrawer: !buyNow, success: buyNow ? undefined : `${name} (${v.label}) added to your bag` });
    if (ok && buyNow) router.push("/checkout");
  };

  return (
    <div className="grid gap-5" data-testid="purchase-panel">
      <div>
        <p className="text-3xl font-semibold" data-testid="price">{formatINR(v.pricePaise)}</p>
        <p className="text-xs text-muted">MRP {formatINR(v.mrpPaise)} incl. of all taxes · {perUnit(v.pricePaise, v.netQuantity, v.netUnit)} · SKU {v.sku}</p>
      </div>
      {variants.length > 1 && (
        <fieldset>
          <legend className="label mb-2">Size</legend>
          <div className="flex flex-wrap gap-2" role="radiogroup" aria-label="Choose a size">
            {variants.map((x) => (
              <button key={x.id} type="button" role="radio" aria-checked={x.id === vid} data-active={x.id === vid} className="chip min-w-24 flex-col !items-start !gap-0 !rounded-[var(--radius)] !py-2"
                onClick={() => setVid(x.id)} data-testid={`variant-${x.sku}`}>
                <span className="font-semibold">{x.label}</span><span className="text-xs opacity-75">{formatINR(x.pricePaise)}{x.available <= 0 ? " · sold out" : ""}</span>
              </button>
            ))}
          </div>
        </fieldset>
      )}
      <p className={`text-sm ${soldOut ? "text-danger" : v.available <= 5 ? "text-warn" : "text-ok"}`} data-testid="stock">
        {soldOut ? "Out of stock" : v.available <= 5 ? `Only ${v.available} left` : "In stock"}{v.concentration ? ` · ${v.concentration}` : ""}
      </p>
      <div className="flex items-stretch gap-3">
        <div className="inline-flex items-center rounded-[var(--radius)] border border-line">
          <button className="h-12 w-10" aria-label="Decrease quantity" onClick={() => setQty((q) => Math.max(1, q - 1))} disabled={qty <= 1}>−</button>
          <span className="w-8 text-center" aria-live="polite" aria-label="Quantity">{qty}</span>
          <button className="h-12 w-10" aria-label="Increase quantity" onClick={() => setQty((q) => Math.min(maxQty, q + 1))} disabled={qty >= maxQty}>+</button>
        </div>
        <button className="btn btn-primary flex-1" disabled={soldOut || loading} onClick={() => add(false)} data-testid="add-to-cart">{soldOut ? "Sold out" : "Add to bag"}</button>
        <WishlistButton productId={productId} name={name} className="!h-12 !w-12 border border-line" />
      </div>
      {!soldOut && <button className="btn btn-outline" disabled={loading} onClick={() => add(true)}>Buy now</button>}
      {creditNote && <p className="rounded-[var(--radius)] bg-surface-2 p-3 text-sm">{creditNote}</p>}
      {discoveryHref && <a href={discoveryHref} className="text-sm underline underline-offset-4">Not sure yet? Try it in a discovery set first →</a>}
      <PincodeCheck />
      <p className="text-xs text-muted">{subtitle} · Gift wrap and a gift message can be added in your bag.</p>
    </div>
  );
}

export function PincodeCheck() {
  const [code, setCode] = useState("");
  const [res, setRes] = useState<{ ok: boolean; serviceable?: boolean; label?: string; message?: string; source?: string; codAllowed?: boolean } | null>(null);
  const [busy, setBusy] = useState(false);
  useEffect(() => { try { const c = localStorage.getItem("fh_pin"); if (c) setCode(c); } catch {} }, []);
  const check = async (e: React.FormEvent) => {
    e.preventDefault();
    setBusy(true);
    const r = await fetch(`/api/pincode?code=${encodeURIComponent(code)}`).then((x) => x.json()).catch(() => ({ ok: false, message: "Couldn't check right now." }));
    setRes(r); setBusy(false);
    try { localStorage.setItem("fh_pin", code); } catch {}
  };
  return (
    <form onSubmit={check} className="grid gap-2 border-t border-line pt-4" aria-label="Check delivery">
      <label htmlFor="pin" className="label">Delivery</label>
      <div className="flex gap-2">
        <input id="pin" inputMode="numeric" maxLength={6} className="input" placeholder="6-digit PIN code" value={code} onChange={(e) => setCode(e.target.value.replace(/\D/g, ""))} aria-describedby="pin-result" />
        <button className="btn btn-outline" disabled={busy || code.length !== 6}>Check</button>
      </div>
      <p id="pin-result" role="status" className="text-sm">
        {res && (res.ok && res.serviceable ? <><span className="text-ok">{res.label}</span><span className="block text-xs text-muted">{res.source}{res.codAllowed ? " · Cash on delivery available" : ""}</span></> : <span className={res.ok ? "text-warn" : "text-danger"}>{res.message}</span>)}
      </p>
    </form>
  );
}
