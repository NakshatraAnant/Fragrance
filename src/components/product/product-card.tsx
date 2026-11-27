"use client";
import Link from "next/link";
import { useState } from "react";
import type { ProductCard } from "@/lib/catalog";
import { formatINR, perUnit } from "@/lib/money";
import { ProductVisual } from "./product-visual";
import { WishlistButton } from "./wishlist";
import { CompareToggle } from "./local-lists";
import { useCart } from "@/components/cart/cart-provider";
import { Stars } from "@/components/ui/stars";
import { Modal } from "@/components/ui/modal";
import { track } from "@/components/analytics-tracker";

export function priceLabel(p: Pick<ProductCard, "minPricePaise" | "maxPricePaise">) {
  return p.minPricePaise === p.maxPricePaise ? formatINR(p.minPricePaise) : `From ${formatINR(p.minPricePaise)}`;
}

export function ProductCardView({ p, position, list, compact }: { p: ProductCard; position?: number; list?: string; compact?: boolean }) {
  const { mutate, loading } = useCart();
  const [quick, setQuick] = useState(false);
  const first = p.variants.find((v) => v.available > 0) ?? p.variants[0];
  const href = `/product/${p.slug}`;
  const onClick = () => track("product_click", { productId: p.id, brand: p.brand.slug, props: { list, position } });
  return (
    <article className="group relative flex flex-col" data-testid="product-card" data-slug={p.slug}>
      <Link href={href} onClick={onClick} className="relative block overflow-hidden rounded-[var(--radius)]">
        <ProductVisual name={p.name} format={p.format} brand={p.brand.slug} colour={p.colour} image={p.image} className="aspect-[4/5] transition duration-700 group-hover:scale-[1.03]" />
        <div className="absolute left-2 top-2 flex flex-wrap gap-1">
          {p.badges.slice(0, 2).map((b) => <span key={b} className={`badge ${b === "Out of stock" ? "badge-danger" : b === "New" ? "badge-accent" : ""}`}>{b}</span>)}
        </div>
      </Link>
      <WishlistButton productId={p.id} name={p.name} className="absolute right-2 top-2" />
      <div className="mt-3 flex flex-1 flex-col gap-1">
        <div className="flex items-center justify-between gap-2 text-[11px] uppercase tracking-[0.16em] text-muted">
          <span>{p.brand.name}{p.families[0] ? ` · ${p.families[0].name}` : ""}</span>
        </div>
        <Link href={href} onClick={onClick} className="leading-tight">
          <h3 className="display text-xl">{p.name}</h3>
          <p className="text-sm text-muted">{p.subtitle}{p.variants.length > 1 ? ` · ${p.variants.map((v) => v.label).join(" / ")}` : ` · ${first?.label ?? ""}`}</p>
        </Link>
        {!compact && <p className="line-clamp-2 text-sm text-muted">{p.shortDescription}</p>}
        {p.rating && <Stars value={p.rating.average} count={p.rating.count} />}
        <div className="mt-auto flex items-end justify-between gap-2 pt-2">
          <div>
            <p className="font-semibold">{priceLabel(p)}</p>
            {first && <p className="text-[11px] text-muted">{perUnit(first.pricePaise, first.netQuantity, first.netUnit)} · incl. GST</p>}
          </div>
          <div className="flex items-center gap-1">
            <button type="button" className="btn btn-ghost btn-sm hidden md:inline-flex" onClick={() => setQuick(true)} aria-label={`Quick view ${p.name}`}>View</button>
            <button type="button" className="btn btn-primary btn-sm" disabled={!first || first.available <= 0 || loading}
              onClick={() => first && mutate({ action: "add", variantId: first.id, quantity: 1 }, { openDrawer: true })}
              aria-label={`Add ${p.name} ${first?.label ?? ""} to bag`}>
              {first && first.available > 0 ? "Add" : "Sold out"}
            </button>
          </div>
        </div>
        {!compact && <CompareToggle productId={p.id} />}
      </div>
      {quick && <QuickView p={p} onClose={() => setQuick(false)} />}
    </article>
  );
}

function QuickView({ p, onClose }: { p: ProductCard; onClose: () => void }) {
  const { mutate, loading } = useCart();
  const [vid, setVid] = useState((p.variants.find((v) => v.available > 0) ?? p.variants[0])?.id);
  const v = p.variants.find((x) => x.id === vid);
  return (
    <Modal open onClose={onClose} title={p.name} wide>
      <div className="grid gap-6 md:grid-cols-2">
        <ProductVisual name={p.name} format={p.format} brand={p.brand.slug} colour={p.colour} image={p.image} className="aspect-[4/5] rounded-[var(--radius)]" />
        <div className="flex flex-col gap-3">
          <p className="eyebrow">{p.brand.name} · {p.subtitle}</p>
          <p className="text-muted">{p.shortDescription}</p>
          {(p.notes.top.length > 0) && (
            <dl className="grid grid-cols-[5rem_1fr] gap-y-1 text-sm">
              <dt className="text-muted">Top</dt><dd>{p.notes.top.join(", ")}</dd>
              <dt className="text-muted">Heart</dt><dd>{p.notes.heart.join(", ")}</dd>
              <dt className="text-muted">Base</dt><dd>{p.notes.base.join(", ")}</dd>
            </dl>
          )}
          <div className="flex flex-wrap gap-2" role="radiogroup" aria-label="Size">
            {p.variants.map((x) => (
              <button key={x.id} role="radio" aria-checked={x.id === vid} className="chip" data-active={x.id === vid} onClick={() => setVid(x.id)} disabled={x.available <= 0}>
                {x.label} · {formatINR(x.pricePaise)}{x.available <= 0 ? " · sold out" : ""}
              </button>
            ))}
          </div>
          <button className="btn btn-primary btn-block mt-2" disabled={!v || v.available <= 0 || loading} onClick={async () => { if (v && (await mutate({ action: "add", variantId: v.id, quantity: 1 }, { openDrawer: true }))) onClose(); }}>
            Add to bag{v ? ` — ${formatINR(v.pricePaise)}` : ""}
          </button>
          <Link href={`/product/${p.slug}`} className="btn btn-ghost">See full details</Link>
        </div>
      </div>
    </Modal>
  );
}

export function ProductGrid({ products, list, cols = 4 }: { products: ProductCard[]; list?: string; cols?: 3 | 4 }) {
  return (
    <div className={`grid grid-cols-2 gap-x-4 gap-y-10 md:gap-x-6 ${cols === 4 ? "lg:grid-cols-4" : "lg:grid-cols-3"}`}>
      {products.map((p, i) => <ProductCardView key={p.id} p={p} position={i} list={list} />)}
    </div>
  );
}
