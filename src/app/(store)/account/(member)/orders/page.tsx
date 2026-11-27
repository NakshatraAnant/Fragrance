import type { Metadata } from "next";
import Link from "next/link";
import { db } from "@/lib/db";
import { requireUser } from "@/lib/auth";
import { formatINR, formatDate } from "@/lib/money";
import { EmptyState } from "@/components/ui/empty-state";

export const metadata: Metadata = { title: "Order history", robots: { index: false } };

export default async function OrdersPage() {
  const user = await requireUser("/account/orders");
  const orders = await db.order.findMany({ where: { userId: user.id }, orderBy: { createdAt: "desc" }, include: { items: true } });
  return (
    <div>
      <h1 className="display text-5xl">Order history</h1>
      {orders.length === 0 ? <div className="mt-8"><EmptyState title="No orders yet" body="When you place an order it will appear here."><Link href="/shop" className="btn btn-primary">Start shopping</Link></EmptyState></div> : (
        <ul className="mt-8 grid gap-4" data-testid="order-history">
          {orders.map((o) => (
            <li key={o.id} className="card p-5">
              <div className="flex flex-wrap items-baseline justify-between gap-2">
                <Link href={`/order/${o.number}`} className="display text-2xl underline-offset-4 hover:underline">{o.number}</Link>
                <span className="text-sm text-muted">{formatDate(o.createdAt, true)}</span>
              </div>
              <p className="mt-1 text-sm"><span className="badge">{o.status.replace(/_/g, " ").toLowerCase()}</span> <span className="badge">{o.fulfilmentStatus.toLowerCase()}</span></p>
              <p className="mt-2 text-sm text-muted">{o.items.map((i) => `${i.productName} (${i.variantLabel}) × ${i.quantity}`).join(", ")}</p>
              <p className="mt-2 font-semibold">{formatINR(o.totalPaise)}</p>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
