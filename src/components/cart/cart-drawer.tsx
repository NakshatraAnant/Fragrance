"use client";
import Link from "next/link";
import { useCart } from "./cart-provider";
import { Modal } from "@/components/ui/modal";
import { formatINR } from "@/lib/money";
import { ProductVisual } from "@/components/product/product-visual";

export function CartDrawer() {
  const { cart, open, setOpen, mutate, loading } = useCart();
  const items = cart?.items ?? [];
  return (
    <Modal open={open} onClose={() => setOpen(false)} title="Your bag" variant="right">
      <div className="flex h-full flex-col" data-testid="cart-drawer">
        <div className="flex items-center justify-between border-b border-line px-6 py-5">
          <h2 className="display text-2xl">Your bag {cart?.count ? <span className="text-base text-muted">({cart.count})</span> : null}</h2>
          <button className="btn btn-ghost btn-sm" onClick={() => setOpen(false)} aria-label="Close bag">✕</button>
        </div>
        {items.length === 0 ? (
          <div className="grid flex-1 place-content-center gap-4 p-8 text-center">
            <p className="display text-2xl">Your bag is empty</p>
            <p className="text-muted">Not sure where to start? The Scent Finder takes two minutes.</p>
            <Link href="/scent-finder" className="btn btn-primary" onClick={() => setOpen(false)}>Find your scent</Link>
            <Link href="/discovery" className="btn btn-ghost" onClick={() => setOpen(false)}>Or try a discovery set</Link>
          </div>
        ) : (
          <>
            {cart!.totals.freeShippingRemainingPaise > 0 && (
              <div className="border-b border-line px-6 py-3 text-sm">
                Add <strong>{formatINR(cart!.totals.freeShippingRemainingPaise)}</strong> more for free shipping.
                <div className="mt-2 h-1 overflow-hidden rounded bg-surface-2"><div className="h-full origin-left bg-accent transition-all" style={{ width: `${Math.max(5, 100 - (cart!.totals.freeShippingRemainingPaise / (cart!.totals.freeShippingRemainingPaise + cart!.totals.subtotalPaise - cart!.totals.discountPaise)) * 100)}%` }} /></div>
              </div>
            )}
            <ul className="flex-1 divide-y divide-line overflow-y-auto px-6">
              {items.map((i) => (
                <li key={i.variantId} className="flex gap-4 py-4" data-testid="cart-line">
                  <ProductVisual name={i.name} format={i.format} brand={i.brand} colour={i.colour} className="h-24 w-20 shrink-0 rounded-[var(--radius)]" label={false} />
                  <div className="flex min-w-0 flex-1 flex-col">
                    <Link href={`/product/${i.slug}`} onClick={() => setOpen(false)} className="font-semibold leading-tight">{i.name}</Link>
                    <p className="text-sm text-muted">{i.brandName} · {i.subtitle} · {i.label}</p>
                    {i.quantity > i.available && <p className="text-xs text-danger">Only {i.available} available — please reduce.</p>}
                    <div className="mt-auto flex items-center justify-between pt-2">
                      <div className="inline-flex items-center rounded-full border border-line">
                        <button className="h-8 w-8" aria-label={`Decrease ${i.name}`} disabled={loading} onClick={() => mutate({ action: "set", variantId: i.variantId, quantity: i.quantity - 1 })}>−</button>
                        <span className="w-6 text-center text-sm" aria-live="polite">{i.quantity}</span>
                        <button className="h-8 w-8" aria-label={`Increase ${i.name}`} disabled={loading || i.quantity >= Math.min(10, i.available)} onClick={() => mutate({ action: "set", variantId: i.variantId, quantity: i.quantity + 1 })}>+</button>
                      </div>
                      <div className="text-right">
                        <p className="font-semibold">{formatINR(i.lineSubtotalPaise)}</p>
                        <button className="text-xs text-muted underline" onClick={() => mutate({ action: "remove", variantId: i.variantId })}>Remove</button>
                      </div>
                    </div>
                  </div>
                </li>
              ))}
            </ul>
            <div className="border-t border-line px-6 py-5">
              <div className="flex justify-between text-sm"><span>Subtotal</span><span>{formatINR(cart!.totals.subtotalPaise)}</span></div>
              {cart!.totals.discountPaise > 0 && <div className="flex justify-between text-sm text-ok"><span>Discount</span><span>−{formatINR(cart!.totals.discountPaise)}</span></div>}
              {cart!.totals.creditPaise > 0 && <div className="flex justify-between text-sm text-ok"><span>Discovery credit</span><span>−{formatINR(cart!.totals.creditPaise)}</span></div>}
              <p className="mt-1 text-xs text-muted">Prices include GST. Shipping, coupons and credits are applied in your bag.</p>
              <div className="mt-4 grid gap-2">
                <Link href="/checkout" className="btn btn-primary btn-block" onClick={() => setOpen(false)} data-testid="drawer-checkout">Checkout · {formatINR(cart!.totals.totalPaise)}</Link>
                <Link href="/cart" className="btn btn-outline btn-block" onClick={() => setOpen(false)}>View bag</Link>
              </div>
            </div>
          </>
        )}
      </div>
    </Modal>
  );
}
