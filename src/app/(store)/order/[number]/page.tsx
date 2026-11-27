import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { db } from "@/lib/db";
import { getCurrentUser } from "@/lib/auth";
import { isStaff } from "@/lib/auth-core";
import { canAccessOrder, orderAccessToken } from "@/lib/order-access";
import { formatINR, formatDate } from "@/lib/money";
import { OrderSummary } from "@/components/cart/cart-page";

export const metadata: Metadata = { title: "Your order", robots: { index: false } };
export const dynamic = "force-dynamic";

const STEPS = [["PLACED", "Order placed"], ["CONFIRMED", "Payment confirmed"], ["PACKED", "Packed"], ["SHIPPED", "Shipped"], ["DELIVERED", "Delivered"]] as const;

function orderStepIndex(o: { paymentStatus: string; fulfilmentStatus: string }) {
  if (o.fulfilmentStatus === "DELIVERED") return 4;
  if (o.fulfilmentStatus === "SHIPPED") return 3;
  if (o.fulfilmentStatus === "PACKED") return 2;
  if (o.paymentStatus === "PAID" || o.paymentStatus === "COD_PENDING") return 1;
  return 0;
}

export default async function OrderPage({ params, searchParams }: { params: Promise<{ number: string }>; searchParams: Promise<{ t?: string; placed?: string }> }) {
  const { number } = await params;
  const { t, placed } = await searchParams;
  const user = await getCurrentUser();
  const o = await db.order.findUnique({ where: { number }, include: { items: true, shipments: { orderBy: { createdAt: "desc" } }, refunds: true, payments: { orderBy: { createdAt: "desc" } } } });
  if (!o || !canAccessOrder(o, { userId: user?.id ?? null, token: t, isStaff: isStaff(user) })) notFound();
  const credits = await db.discoveryCredit.findMany({ where: { sourceOrderItem: { orderId: o.id } } });
  const step = orderStepIndex(o);
  const unpaid = o.paymentStatus !== "PAID" && o.paymentStatus !== "COD_PENDING" && !["EXPIRED", "CANCELLED", "REFUNDED"].includes(o.status);
  return (
    <div className="container-x max-w-4xl py-12">
      {placed && o.paymentStatus === "PAID" && (
        <div className="mb-10 text-center animate-rise" data-testid="order-confirmed">
          <p className="eyebrow">Thank you</p>
          <h1 className="display mt-3 text-5xl md:text-6xl">Your order is confirmed</h1>
          <p className="mt-3 text-muted">We've emailed a confirmation to {o.email}.{o.deliveryEstimate ? ` ${o.deliveryEstimate}.` : ""}</p>
        </div>
      )}
      <div className="flex flex-wrap items-baseline justify-between gap-3">
        <h2 className="display text-3xl">Order {o.number}</h2>
        <p className="text-sm text-muted">Placed {formatDate(o.createdAt, true)}</p>
      </div>
      <p className="mt-1 text-sm" data-testid="order-status">Status: <strong>{o.status.replace(/_/g, " ").toLowerCase()}</strong> · Payment: <strong>{o.paymentStatus.replace(/_/g, " ").toLowerCase()}</strong></p>
      {unpaid && <Link href={`/checkout/pay/${o.id}?t=${orderAccessToken(o.id)}`} className="btn btn-primary mt-4">Complete payment</Link>}

      <ol className="mt-8 grid grid-cols-5 gap-2" aria-label="Order progress">
        {STEPS.map(([k, label], i) => (
          <li key={k} className="text-center text-xs">
            <div className={`h-1.5 rounded-full ${i <= step && !unpaid ? "bg-accent" : "bg-line"}`} />
            <p className={`mt-2 ${i <= step && !unpaid ? "font-semibold" : "text-muted"}`}>{label}</p>
          </li>
        ))}
      </ol>

      {o.shipments.map((s) => (
        <div key={s.id} className="card mt-6 p-5 text-sm"><p className="font-semibold">{s.carrier}{s.awb ? ` · AWB ${s.awb}` : ""} · {s.status.replace(/_/g, " ").toLowerCase()}</p>{s.trackingUrl && <a href={s.trackingUrl} className="underline" target="_blank" rel="noopener noreferrer">Track with carrier</a>}</div>
      ))}

      <div className="mt-10 grid gap-10 md:grid-cols-[1.4fr_1fr]">
        <section>
          <h3 className="display text-2xl">Items</h3>
          <ul className="mt-3 divide-y divide-line">{o.items.map((i) => <li key={i.id} className="flex justify-between gap-4 py-3 text-sm"><span><strong>{i.productName}</strong> · {i.variantLabel} · {i.sku} × {i.quantity}</span><span>{formatINR(i.lineTotalPaise)}</span></li>)}</ul>
          {credits.length > 0 && (
            <div className="mt-6 rounded-[var(--radius)] bg-surface-2 p-4 text-sm" data-testid="credit-issued">
              <p className="font-semibold">Discovery credit issued</p>
              {credits.map((c) => <p key={c.id}>{formatINR(c.amountPaise)} · valid until {formatDate(c.expiresAt)} · {c.status.toLowerCase()}</p>)}
              {!o.userId && <p className="mt-2">Your credit follows your email. <Link href="/account/register" className="underline">Create an account with {o.email}</Link> to use it.</p>}
            </div>
          )}
          {o.giftWrap && <p className="mt-6 text-sm">Gift wrapped{o.giftRecipient ? ` for ${o.giftRecipient}` : ""}{o.giftMessage ? `: “${o.giftMessage}”` : ""}</p>}
        </section>
        <section>
          <h3 className="display text-2xl">Summary</h3>
          <div className="mt-3"><OrderSummary totals={{ subtotalPaise: o.subtotalPaise, discountPaise: o.discountPaise, creditPaise: o.creditPaise, shippingPaise: o.shippingPaise, giftWrapPaise: o.giftWrapPaise, taxPaise: o.taxPaise, totalPaise: o.totalPaise }} /></div>
          {o.refunds.length > 0 && <div className="mt-4 text-sm"><p className="font-semibold">Refunds</p>{o.refunds.map((r) => <p key={r.id}>{formatINR(r.amountPaise)} · {r.status.replace(/_/g, " ").toLowerCase()}</p>)}</div>}
          <p className="mt-6 text-sm text-muted">Ship to: {o.shipName}, {o.shipLine1}{o.shipLine2 ? `, ${o.shipLine2}` : ""}, {o.shipCity}, {o.shipState} {o.shipPincode}</p>
        </section>
      </div>
      <div className="mt-12 flex flex-wrap gap-3">
        {user ? <Link href="/account/orders" className="btn btn-outline">All my orders</Link> : <Link href="/account/register" className="btn btn-outline">Create an account</Link>}
        <Link href="/shop" className="btn btn-ghost">Continue shopping</Link>
        <Link href="/support" className="btn btn-ghost">Help with this order</Link>
      </div>
    </div>
  );
}
