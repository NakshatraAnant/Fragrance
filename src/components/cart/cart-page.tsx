"use client";
import Link from "next/link";
import { useEffect, useState } from "react";
import { useCart } from "./cart-provider";
import { formatINR, formatDate } from "@/lib/money";
import { ProductVisual } from "@/components/product/product-visual";
import { ProductCardView } from "@/components/product/product-card";
import { EmptyState } from "@/components/ui/empty-state";
import type { ProductCard } from "@/lib/catalog";

export function OrderSummary({ totals, compact }: { totals: { subtotalPaise: number; discountPaise: number; creditPaise: number; shippingPaise: number; giftWrapPaise: number; taxPaise: number; totalPaise: number }; compact?: boolean }) {
  return (
    <dl className="grid gap-2 text-sm" data-testid="order-summary">
      <div className="flex justify-between"><dt>Subtotal</dt><dd>{formatINR(totals.subtotalPaise)}</dd></div>
      {totals.discountPaise > 0 && <div className="flex justify-between text-ok"><dt>Coupon discount</dt><dd>−{formatINR(totals.discountPaise)}</dd></div>}
      {totals.creditPaise > 0 && <div className="flex justify-between text-ok"><dt>Discovery credit</dt><dd data-testid="credit-applied">−{formatINR(totals.creditPaise)}</dd></div>}
      <div className="flex justify-between"><dt>Shipping</dt><dd>{totals.shippingPaise ? formatINR(totals.shippingPaise) : "Free"}</dd></div>
      {totals.giftWrapPaise > 0 && <div className="flex justify-between"><dt>Gift wrap</dt><dd>{formatINR(totals.giftWrapPaise)}</dd></div>}
      <div className="mt-2 flex justify-between border-t border-line pt-3 text-base font-semibold"><dt>Total</dt><dd data-testid="order-total">{formatINR(totals.totalPaise)}</dd></div>
      {!compact && <div className="flex justify-between text-xs text-muted"><dt>Includes GST of</dt><dd>{formatINR(totals.taxPaise, { exact: true })}</dd></div>}
    </dl>
  );
}

export function CartPageClient({ crossSell }: { crossSell: ProductCard[] }) {
  const { cart, mutate, loading } = useCart();
  const [code, setCode] = useState("");
  const [giftMsg, setGiftMsg] = useState("");
  useEffect(() => { if (cart) setGiftMsg(cart.giftMessage); }, [cart?.cartId]); // eslint-disable-line react-hooks/exhaustive-deps

  if (!cart) return <div className="container-x py-24"><div className="skeleton h-64" /></div>;
  if (cart.items.length === 0) return (
    <div className="container-x py-20"><EmptyState title="Your bag is empty" body="Start with the Scent Finder, or wear-test a discovery set before choosing a full size."><Link href="/scent-finder" className="btn btn-primary">Scent Finder</Link><Link href="/discovery" className="btn btn-outline">Discovery sets</Link></EmptyState></div>
  );
  const blocked = cart.items.some((i) => i.quantity > i.available);
  const suggestions = crossSell.filter((c) => !cart.items.some((i) => i.productId === c.id)).slice(0, 4);
  return (
    <div className="container-x py-10">
      <h1 className="display text-5xl">Your bag</h1>
      <div className="mt-8 grid gap-12 lg:grid-cols-[1.6fr_1fr]">
        <div>
          <ul className="divide-y divide-line border-y border-line">
            {cart.items.map((i) => (
              <li key={i.variantId} className="grid grid-cols-[5.5rem_1fr] gap-4 py-5 sm:grid-cols-[7rem_1fr_auto]" data-testid="cart-page-line">
                <ProductVisual name={i.name} format={i.format} brand={i.brand} colour={i.colour} className="aspect-[4/5] rounded-[var(--radius)]" label={false} />
                <div>
                  <p className="eyebrow">{i.brandName}</p>
                  <Link href={`/product/${i.slug}`} className="display text-2xl">{i.name}</Link>
                  <p className="text-sm text-muted">{i.subtitle} · {i.label} · {i.sku}</p>
                  <p className="mt-1 text-sm">{formatINR(i.unitPricePaise)} each</p>
                  {i.available <= 0 ? <p className="text-sm text-danger">Out of stock. Please remove it to continue.</p> : i.quantity > i.available && <p className="text-sm text-danger">Only {i.available} available.</p>}
                  {i.discountPaise > 0 && <p className="text-xs text-ok">−{formatINR(i.discountPaise)} coupon</p>}
                  {i.creditPaise > 0 && <p className="text-xs text-ok">−{formatINR(i.creditPaise)} discovery credit</p>}
                </div>
                <div className="col-span-2 flex items-center justify-between gap-4 sm:col-span-1 sm:flex-col sm:items-end">
                  <label className="flex items-center gap-2 text-sm">Qty
                    <select className="select !min-h-9 w-20 !py-1" value={i.quantity} disabled={loading} onChange={(e) => mutate({ action: "set", variantId: i.variantId, quantity: Number(e.target.value) })} aria-label={`Quantity for ${i.name}`}>
                      {Array.from({ length: Math.max(1, Math.min(10, Math.max(i.available, i.quantity))) }, (_, n) => n + 1).map((n) => <option key={n} value={n}>{n}</option>)}
                    </select>
                  </label>
                  <p className="font-semibold">{formatINR(i.lineSubtotalPaise)}</p>
                  <div className="flex gap-3 text-xs">
                    <Link href={`/product/${i.slug}?sku=${i.sku}`} className="underline">Edit</Link>
                    <button className="underline" onClick={() => mutate({ action: "remove", variantId: i.variantId })}>Remove</button>
                  </div>
                </div>
              </li>
            ))}
          </ul>
          <section className="mt-8 grid gap-4 md:grid-cols-2">
            <div className="card p-5">
              <label className="flex items-center gap-2 font-semibold"><input type="checkbox" className="accent-[var(--accent)]" checked={cart.giftWrap} onChange={(e) => mutate({ action: "gift", giftWrap: e.target.checked, giftMessage: giftMsg })} /> This is a gift</label>
              {cart.giftWrap && (
                <div className="mt-3 grid gap-2">
                  <label htmlFor="gm" className="label">Gift message (printed on a card, prices hidden on the invoice slip)</label>
                  <textarea id="gm" className="textarea !min-h-20" maxLength={300} value={giftMsg} onChange={(e) => setGiftMsg(e.target.value)} onBlur={() => mutate({ action: "gift", giftWrap: true, giftMessage: giftMsg })} />
                  <p className="text-xs text-muted">{300 - giftMsg.length} characters left. Engraving is offered in our boutiques.</p>
                </div>
              )}
            </div>
            <div className="card p-5">
              <p className="font-semibold">Coupon</p>
              {cart.couponCode ? (
                <div className="mt-2 flex items-center justify-between text-sm"><span>Applied: <strong>{cart.couponCode}</strong></span><button className="underline" onClick={() => mutate({ action: "coupon", code: null })}>Remove</button></div>
              ) : (
                <form className="mt-2 flex gap-2" onSubmit={(e) => { e.preventDefault(); if (code.trim()) mutate({ action: "coupon", code: code.trim() }, { success: "Coupon applied" }); }}>
                  <label htmlFor="coupon" className="sr-only">Coupon code</label>
                  <input id="coupon" className="input !min-h-10 uppercase" value={code} onChange={(e) => setCode(e.target.value)} placeholder="Code" data-testid="coupon-input" />
                  <button className="btn btn-outline btn-sm">Apply</button>
                </form>
              )}
              {cart.couponError && <p className="mt-2 text-sm text-danger" role="alert">{cart.couponError}</p>}
              <p className="mt-2 text-xs text-muted">Discounts respect brand limits. Anvaya is never discounted.</p>
            </div>
          </section>
          <section className="card mt-4 p-5" aria-labelledby="credit-h">
            <p id="credit-h" className="font-semibold">Discovery credit</p>
            {cart.availableCredits.length === 0 ? (
              <p className="mt-1 text-sm text-muted">You don't have an available credit. When you buy a discovery set while signed in, its price becomes a credit on an eligible full size. <Link href="/discovery" className="underline">How it works</Link></p>
            ) : (
              <div className="mt-2 grid gap-2">
                {cart.availableCredits.map((c) => (
                  <label key={c.id} className="flex items-center gap-3 text-sm">
                    <input type="radio" name="credit" className="accent-[var(--accent)]" checked={cart.creditId === c.id} onChange={() => mutate({ action: "credit", creditId: c.id })} data-testid="credit-option" />
                    {formatINR(c.amountPaise)} credit · valid until {formatDate(c.expiresAt)}
                  </label>
                ))}
                {cart.creditId && <button className="justify-self-start text-sm underline" onClick={() => mutate({ action: "credit", creditId: null })}>Don't use a credit</button>}
              </div>
            )}
            {cart.creditError && <p className="mt-2 text-sm text-danger" role="alert">{cart.creditError}</p>}
          </section>
        </div>
        <aside className="lg:sticky lg:top-24 lg:self-start">
          <div className="card p-6">
            <h2 className="display mb-4 text-2xl">Summary</h2>
            <OrderSummary totals={cart.totals} />
            {cart.totals.freeShippingRemainingPaise > 0 && <p className="mt-3 text-xs text-muted">Add {formatINR(cart.totals.freeShippingRemainingPaise)} more for free shipping.</p>}
            <p className="mt-2 text-xs text-muted">Delivery estimate is confirmed for your PIN code at checkout.</p>
            <Link href="/checkout" className="btn btn-primary btn-block mt-6" aria-disabled={blocked} onClick={(e) => blocked && e.preventDefault()} data-testid="go-checkout">Checkout</Link>
            {blocked && <p className="mt-2 text-sm text-danger">Please resolve the stock issues above.</p>}
          </div>
        </aside>
      </div>
      {suggestions.length > 0 && (
        <section className="mt-20"><h2 className="display mb-6 text-3xl">Complete the ritual</h2><div className="grid grid-cols-2 gap-6 lg:grid-cols-4">{suggestions.map((p, i) => <ProductCardView key={p.id} p={p} position={i} list="cart-cross-sell" compact />)}</div></section>
      )}
    </div>
  );
}
