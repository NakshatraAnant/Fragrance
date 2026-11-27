import Link from "next/link";
import { notFound } from "next/navigation";
import { db } from "@/lib/db";
import { requireStaff } from "@/lib/auth";
import { can } from "@/lib/auth-core";
import { fulfilmentAction, refundAction } from "@/app/actions/admin/orders";
import { formatINR, formatDate } from "@/lib/money";
import { AdminHeader, Btn, Flash, In, Pill, Section, Table, statusTone } from "@/components/admin/ui";

export default async function AdminOrder({ params, searchParams }: { params: Promise<{ id: string }>; searchParams: Promise<{ msg?: string; err?: string }> }) {
  const user = await requireStaff("orders:read", "/admin/orders");
  const { id } = await params;
  const sp = await searchParams;
  const o = await db.order.findUnique({ where: { id }, include: { items: true, payments: { orderBy: { createdAt: "desc" } }, refunds: { orderBy: { createdAt: "desc" } }, shipments: true, couponRedemptions: { include: { coupon: true } } } });
  if (!o) notFound();
  const [issued, used, events] = await Promise.all([
    db.discoveryCredit.findMany({ where: { sourceOrderItem: { orderId: o.id } } }),
    o.creditId ? db.discoveryCredit.findUnique({ where: { id: o.creditId } }) : null,
    db.auditLog.findMany({ where: { entity: "Order", entityId: o.id }, orderBy: { createdAt: "desc" }, include: { actor: { select: { email: true } } } }),
  ]);
  const write = can(user, "orders:write");
  const refunded = o.refunds.filter((r) => ["COMPLETED", "PROCESSING"].includes(r.status)).reduce((s, r) => s + r.amountPaise, 0);
  const paidLike = o.paymentStatus === "PAID" || o.paymentStatus === "COD_PENDING";
  const Op = ({ op, label, tone = "outline" }: { op: string; label: string; tone?: "outline" | "danger" | "primary" }) => <form action={fulfilmentAction}><input type="hidden" name="orderId" value={o.id} /><input type="hidden" name="op" value={op} /><Btn tone={tone}>{label}</Btn></form>;
  return (
    <>
      <AdminHeader title={`Order ${o.number}`} sub={`Placed ${formatDate(o.createdAt, true)} · ${o.email}${o.userId ? "" : " (guest)"}`}>
        <Pill tone={statusTone(o.status)}>{o.status}</Pill><Pill tone={statusTone(o.paymentStatus)}>{o.paymentStatus}</Pill><Pill tone={statusTone(o.fulfilmentStatus)}>{o.fulfilmentStatus}</Pill>
      </AdminHeader>
      <Flash msg={sp.msg} err={sp.err} />
      {write && (
        <div className="mb-6 flex flex-wrap gap-2">
          {paidLike && o.fulfilmentStatus === "UNFULFILLED" && <Op op="pack" label="Mark packed" />}
          {o.fulfilmentStatus === "SHIPPED" && <Op op="deliver" label="Mark delivered" />}
          {o.paymentStatus === "COD_PENDING" && <Op op="cod-collected" label="Cash collected" tone="primary" />}
          {!["PAID", "REFUNDED", "PARTIALLY_REFUNDED"].includes(o.paymentStatus) && !["CANCELLED", "EXPIRED"].includes(o.status) && <Op op="cancel" label="Cancel & release stock" tone="danger" />}
        </div>
      )}
      <div className="grid gap-8 xl:grid-cols-[1.5fr_1fr]">
        <div>
          <Section title="Items">
            <Table head={["SKU", "Product", "Qty", "Unit", "Discount+credit", "GST", "Line total", "Warehouse"]}>
              {o.items.map((i) => <tr key={i.id}><td className="px-3 py-2 font-mono text-xs">{i.sku}</td><td className="px-3 py-2">{i.productName} · {i.variantLabel}</td><td className="px-3 py-2">{i.quantity}</td><td className="px-3 py-2">{formatINR(i.unitPricePaise)}</td><td className="px-3 py-2">{formatINR(i.discountPaise)}</td><td className="px-3 py-2">{i.gstRatePct}% · {formatINR(i.taxPaise, { exact: true })}</td><td className="px-3 py-2">{formatINR(i.lineTotalPaise)}</td><td className="px-3 py-2 font-mono text-xs">{i.warehouseId?.slice(-6)}</td></tr>)}
            </Table>
            <dl className="mt-3 grid max-w-sm grid-cols-2 gap-1 text-sm">
              <dt>Subtotal</dt><dd>{formatINR(o.subtotalPaise)}</dd><dt>Coupon {o.couponCode ?? ""}</dt><dd>−{formatINR(o.discountPaise)}</dd><dt>Discovery credit</dt><dd>−{formatINR(o.creditPaise)}</dd>
              <dt>Shipping</dt><dd>{formatINR(o.shippingPaise)}</dd><dt>Gift wrap</dt><dd>{formatINR(o.giftWrapPaise)}</dd><dt className="font-semibold">Total</dt><dd className="font-semibold">{formatINR(o.totalPaise)}</dd><dt className="text-muted">GST included</dt><dd className="text-muted">{formatINR(o.taxPaise, { exact: true })}</dd>
            </dl>
          </Section>
          <Section title="Payments">
            <Table head={["Provider", "Status", "Amount", "Method", "Provider IDs", "Verified", "When"]} empty="No payment attempts yet.">
              {o.payments.map((p) => <tr key={p.id}><td className="px-3 py-2">{p.provider}</td><td className="px-3 py-2"><Pill tone={statusTone(p.status)}>{p.status}</Pill>{p.failureReason && <p className="text-xs text-muted">{p.failureReason}</p>}</td><td className="px-3 py-2">{formatINR(p.amountPaise)}</td><td className="px-3 py-2">{p.method}</td><td className="px-3 py-2 font-mono text-xs">{p.providerOrderId}<br />{p.providerPaymentId}</td><td className="px-3 py-2">{p.signatureVerified ? "✓" : "—"}</td><td className="px-3 py-2 text-xs">{formatDate(p.createdAt, true)}</td></tr>)}
            </Table>
          </Section>
          <Section title="Refunds">
            <Table head={["Amount", "Status", "Reason", "Provider ref", "When"]} empty="No refunds.">
              {o.refunds.map((r) => <tr key={r.id}><td className="px-3 py-2">{formatINR(r.amountPaise)}</td><td className="px-3 py-2"><Pill tone={statusTone(r.status)}>{r.status}</Pill></td><td className="px-3 py-2">{r.reason}</td><td className="px-3 py-2 font-mono text-xs">{r.providerRefundId}</td><td className="px-3 py-2 text-xs">{formatDate(r.createdAt, true)}</td></tr>)}
            </Table>
            {write && ["PAID", "PARTIALLY_REFUNDED"].includes(o.paymentStatus) && (
              <form action={refundAction} className="card mt-3 grid items-end gap-3 p-4 md:grid-cols-4">
                <input type="hidden" name="orderId" value={o.id} />
                <In label={`Amount ₹ (max ${(o.totalPaise - refunded) / 100})`} name="amount" type="number" step="0.01" defaultValue={(o.totalPaise - refunded) / 100} required />
                <In label="Reason" name="reason" required className="md:col-span-2" />
                <Btn tone="danger">Issue refund</Btn>
              </form>
            )}
          </Section>
        </div>
        <div>
          <Section title="Delivery">
            <div className="card p-4 text-sm">
              <p className="font-semibold">{o.shipName} · {o.shipPhone}</p>
              <p className="text-muted">{o.shipLine1}{o.shipLine2 ? `, ${o.shipLine2}` : ""}{o.shipLandmark ? ` (near ${o.shipLandmark})` : ""}, {o.shipCity}, {o.shipState} {o.shipPincode}</p>
              {o.gstin && <p className="mt-1">GSTIN {o.gstin}</p>}
              <p className="mt-2 text-xs text-muted">{o.deliveryEstimate}</p>
              {o.giftWrap && <p className="mt-2">🎁 Gift wrap{o.giftRecipient ? ` for ${o.giftRecipient}` : ""}{o.giftMessage ? ` — “${o.giftMessage}”` : ""}</p>}
            </div>
            {o.shipments.map((s) => <div key={s.id} className="card mt-2 p-3 text-sm">{s.carrier} · {s.awb ?? "no AWB"} · <Pill tone={statusTone(s.status)}>{s.status}</Pill>{s.trackingUrl && <a href={s.trackingUrl} className="ml-2 underline" target="_blank" rel="noopener noreferrer">track</a>}</div>)}
            {write && paidLike && ["UNFULFILLED", "PACKED"].includes(o.fulfilmentStatus) && (
              <form action={fulfilmentAction} className="card mt-3 grid gap-3 p-4">
                <input type="hidden" name="orderId" value={o.id} /><input type="hidden" name="op" value="ship" />
                <In label="Carrier" name="carrier" required placeholder="e.g. Shiprocket / Delhivery" />
                <In label="AWB" name="awb" />
                <In label="Tracking URL (https)" name="trackingUrl" />
                <Btn>Mark shipped</Btn>
              </form>
            )}
          </Section>
          <Section title="Credits & coupons">
            <div className="card p-4 text-sm">
              {o.couponRedemptions.map((c) => <p key={c.id}>Coupon {c.coupon.code}: −{formatINR(c.amountPaise)}</p>)}
              {used && <p>Credit used: {formatINR(used.amountPaise)} ({used.status})</p>}
              {issued.map((c) => <p key={c.id}>Credit issued: {formatINR(c.amountPaise)} · {c.status} · expires {formatDate(c.expiresAt)}</p>)}
              {!o.couponRedemptions.length && !used && !issued.length && <p className="text-muted">None.</p>}
            </div>
          </Section>
          <Section title="Activity">
            <ul className="text-xs">{events.map((e) => <li key={e.id} className="border-b border-line py-1">{formatDate(e.createdAt, true)} · {e.actor?.email ?? "system"} · {e.action}</li>)}{o.paidAt && <li className="py-1">{formatDate(o.paidAt, true)} · payment verified</li>}</ul>
            {o.userId && <Link href={`/admin/customers/${o.userId}`} className="mt-2 inline-block text-sm underline">Customer profile</Link>}
          </Section>
        </div>
      </div>
    </>
  );
}
