import Link from "next/link";
import { db } from "@/lib/db";
import { requireStaff } from "@/lib/auth";
import { formatINR, formatDate } from "@/lib/money";
import { AdminHeader, Pill, Table, statusTone } from "@/components/admin/ui";

export default async function AdminOrders({ searchParams }: { searchParams: Promise<{ q?: string; status?: string; payment?: string; fulfilment?: string }> }) {
  await requireStaff("orders:read", "/admin/orders");
  const sp = await searchParams;
  const orders = await db.order.findMany({
    where: { ...(sp.status ? { status: sp.status } : {}), ...(sp.payment ? { paymentStatus: sp.payment } : {}), ...(sp.fulfilment ? { fulfilmentStatus: sp.fulfilment } : {}), ...(sp.q ? { OR: [{ number: { contains: sp.q.toUpperCase() } }, { email: { contains: sp.q.toLowerCase() } }, { shipName: { contains: sp.q } }] } : {}) },
    orderBy: { createdAt: "desc" }, take: 200, include: { _count: { select: { items: true } } },
  });
  const opt = (name: string, values: string[], cur?: string) => <select name={name} defaultValue={cur ?? ""} className="select !min-h-9 w-auto !py-1 text-sm"><option value="">Any {name}</option>{values.map((v) => <option key={v}>{v}</option>)}</select>;
  return (
    <>
      <AdminHeader title="Orders" sub={`${orders.length} shown (latest 200)`} />
      <form className="mb-4 flex flex-wrap gap-2">
        <input name="q" defaultValue={sp.q} placeholder="Order number, email or name" className="input !min-h-9 max-w-xs !py-1 text-sm" />
        {opt("status", ["PENDING_PAYMENT", "CONFIRMED", "PAYMENT_FAILED", "CANCELLED", "EXPIRED", "REFUNDED", "PARTIALLY_REFUNDED"], sp.status)}
        {opt("payment", ["UNPAID", "PAID", "FAILED", "COD_PENDING", "REFUNDED", "PARTIALLY_REFUNDED"], sp.payment)}
        {opt("fulfilment", ["UNFULFILLED", "PACKED", "SHIPPED", "DELIVERED"], sp.fulfilment)}
        <button className="btn btn-outline btn-sm">Filter</button>
      </form>
      <Table head={["Order", "Placed", "Customer", "Items", "Total", "Order", "Payment", "Fulfilment"]} empty="No orders match.">
        {orders.map((o) => (
          <tr key={o.id}>
            <td className="px-3 py-2"><Link href={`/admin/orders/${o.id}`} className="font-mono text-xs underline">{o.number}</Link></td>
            <td className="whitespace-nowrap px-3 py-2 text-xs">{formatDate(o.createdAt, true)}</td>
            <td className="px-3 py-2">{o.shipName}<p className="text-xs text-muted">{o.email}{o.userId ? "" : " · guest"}</p></td>
            <td className="px-3 py-2">{o._count.items}</td>
            <td className="px-3 py-2">{formatINR(o.totalPaise)}</td>
            <td className="px-3 py-2"><Pill tone={statusTone(o.status)}>{o.status}</Pill></td>
            <td className="px-3 py-2"><Pill tone={statusTone(o.paymentStatus)}>{o.paymentStatus}</Pill></td>
            <td className="px-3 py-2"><Pill tone={statusTone(o.fulfilmentStatus)}>{o.fulfilmentStatus}</Pill></td>
          </tr>
        ))}
      </Table>
    </>
  );
}
