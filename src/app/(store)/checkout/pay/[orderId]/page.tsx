import type { Metadata } from "next";
import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { db } from "@/lib/db";
import { getCurrentUser } from "@/lib/auth";
import { isStaff } from "@/lib/auth-core";
import { canAccessOrder, orderAccessToken } from "@/lib/order-access";
import { activePaymentMode, preparePayment } from "@/lib/payments";
import { sandboxPay } from "@/app/actions/checkout";
import { restoreOrderToCart } from "@/app/actions/orders";
import { formatINR, formatDate } from "@/lib/money";
import { RazorpayButton } from "@/components/checkout/razorpay-button";
import { AppError } from "@/lib/logger";

export const metadata: Metadata = { title: "Payment", robots: { index: false } };
export const dynamic = "force-dynamic";

type P = { params: Promise<{ orderId: string }>; searchParams: Promise<{ t?: string; failed?: string }> };

export default async function PayPage({ params, searchParams }: P) {
  const { orderId } = await params;
  const { t, failed } = await searchParams;
  const user = await getCurrentUser();
  const order = await db.order.findUnique({ where: { id: orderId }, include: { items: true, payments: { orderBy: { createdAt: "desc" } } } });
  if (!order || !canAccessOrder(order, { userId: user?.id ?? null, token: t, isStaff: isStaff(user) })) notFound();
  const token = orderAccessToken(order.id);
  if (order.paymentStatus === "PAID") redirect(`/order/${order.number}?t=${token}`);

  const expired = order.status === "EXPIRED" || order.status === "CANCELLED" || (order.expiresAt && order.expiresAt < new Date());
  let rp: { keyId: string; providerOrderId: string; amount: number } | null = null;
  let prepError: string | null = null;
  const mode = activePaymentMode();
  if (!expired && mode === "RAZORPAY") {
    try { const prep = await preparePayment(order.id); if ("razorpay" in prep && prep.razorpay) rp = prep.razorpay; } catch (e) { prepError = e instanceof AppError ? e.message : "Payment provider unavailable."; }
  }
  const lastFailure = order.payments.find((p) => p.status === "FAILED");

  return (
    <div className="container-x max-w-3xl py-12">
      <p className="eyebrow">Order {order.number}</p>
      <h1 className="display mt-2 text-5xl">Complete your payment</h1>
      <p className="mt-3 text-muted">Total due <strong className="text-ink" data-testid="pay-total">{formatINR(order.totalPaise)}</strong>{order.expiresAt && !expired ? ` · items reserved until ${formatDate(order.expiresAt, true)}` : ""}</p>

      {(failed || order.paymentStatus === "FAILED") && !expired && (
        <div role="alert" className="mt-6 rounded-[var(--radius)] border border-danger/40 bg-danger/5 p-4" data-testid="payment-failed">
          <p className="font-semibold">Your payment didn't go through.</p>
          <p className="text-sm text-muted">{lastFailure?.failureReason ?? "The payment was declined."} You haven't been charged. You can try again below.</p>
        </div>
      )}

      {expired ? (
        <div className="card mt-8 p-6">
          <p className="display text-2xl">This order has expired</p>
          <p className="mt-2 text-muted">We released the reserved items and any discovery credit. You can put the items back in your bag and try again.</p>
          <form action={restoreOrderToCart} className="mt-4"><input type="hidden" name="orderId" value={order.id} /><input type="hidden" name="t" value={token} /><button className="btn btn-primary">Restore my bag</button></form>
        </div>
      ) : mode === "SANDBOX" ? (
        <section className="mt-8 rounded-[var(--radius)] border-2 border-dashed border-warn p-6" aria-labelledby="sbx" data-testid="sandbox">
          <p className="badge badge-warn">Sandbox · test mode</p>
          <h2 id="sbx" className="display mt-3 text-3xl">Local payment sandbox</h2>
          <p className="mt-2 text-sm text-muted">No real payment provider is configured, so this environment uses a local sandbox. <strong>No money moves and no bank is contacted.</strong> Your choice produces a signed test event, which the server verifies before the order is updated. Once Razorpay keys are set, this screen is replaced by Razorpay Checkout.</p>
          <form action={sandboxPay} className="mt-5 grid gap-4">
            <input type="hidden" name="orderId" value={order.id} /><input type="hidden" name="t" value={token} />
            <fieldset className="flex flex-wrap gap-3"><legend className="label mb-2">Test method</legend>
              {[["upi", "UPI"], ["card", "Card"], ["netbanking", "Net banking"]].map(([v, l], i) => <label key={v} className="chip"><input type="radio" name="method" value={v} defaultChecked={i === 0} className="accent-[var(--accent)]" /> {l}</label>)}
            </fieldset>
            <div className="flex flex-wrap gap-3">
              <button name="outcome" value="success" className="btn btn-primary" data-testid="sandbox-success">Simulate successful payment</button>
              <button name="outcome" value="failure" className="btn btn-outline" data-testid="sandbox-failure">Simulate failed payment</button>
            </div>
          </form>
        </section>
      ) : mode === "RAZORPAY" && rp ? (
        <section className="card mt-8 p-6"><RazorpayButton orderId={order.id} token={token} keyId={rp.keyId} providerOrderId={rp.providerOrderId} amount={rp.amount} name={order.shipName} email={order.email} contact={order.phone} /></section>
      ) : (
        <div role="alert" className="card mt-8 p-6"><p className="font-semibold">Online payment is unavailable</p><p className="text-sm text-muted">{prepError ?? "No payment provider is configured on this environment. Your items stay reserved until the order expires."}</p></div>
      )}

      <section className="mt-10">
        <h2 className="display text-2xl">Items</h2>
        <ul className="mt-3 divide-y divide-line text-sm">{order.items.map((i) => <li key={i.id} className="flex justify-between py-2"><span>{i.productName} · {i.variantLabel} × {i.quantity}</span><span>{formatINR(i.lineTotalPaise)}</span></li>)}</ul>
        <p className="mt-4 text-sm text-muted">Delivering to {order.shipName}, {order.shipCity} {order.shipPincode}. {order.deliveryEstimate}</p>
        <Link href="/support" className="mt-4 inline-block text-sm underline">Need help?</Link>
      </section>
    </div>
  );
}
