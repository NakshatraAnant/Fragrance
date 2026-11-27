import Link from "next/link";
import { db } from "@/lib/db";
import { requireStaff } from "@/lib/auth";
import { can } from "@/lib/auth-core";
import { processDataRequest } from "@/app/actions/admin/crm";
import { formatINR, formatDate } from "@/lib/money";
import { AdminHeader, Flash, Pill, Section, Table, statusTone } from "@/components/admin/ui";

export default async function Customers({ searchParams }: { searchParams: Promise<{ q?: string; msg?: string; err?: string }> }) {
  const user = await requireStaff("customers:read", "/admin/customers");
  const sp = await searchParams;
  const [customers, requests] = await Promise.all([
    db.user.findMany({ where: { roleId: null, deletedAt: null, ...(sp.q ? { OR: [{ email: { contains: sp.q.toLowerCase() } }, { name: { contains: sp.q } }, { phone: { contains: sp.q } }] } : {}) }, orderBy: { createdAt: "desc" }, take: 200, include: { orders: { where: { paymentStatus: "PAID" }, select: { totalPaise: true } }, loyaltyAccount: true, _count: { select: { reviews: true, scentProfiles: true } } } }),
    db.dataRequest.findMany({ where: { status: "REQUESTED" }, include: { user: { select: { email: true } } } }),
  ]);
  return (
    <>
      <AdminHeader title="Customers" sub={`${customers.length} shown. Guest orders are listed under Orders.`} />
      <Flash msg={sp.msg} err={sp.err} />
      {requests.length > 0 && (
        <Section title="Open data requests (DPDP)">
          <Table head={["Customer", "Type", "Requested", ""]}>
            {requests.map((r) => <tr key={r.id}><td className="px-3 py-2">{r.user.email}</td><td className="px-3 py-2"><Pill tone={r.type === "DELETION" ? "danger" : "warn"}>{r.type}</Pill></td><td className="px-3 py-2 text-xs">{formatDate(r.createdAt, true)}</td><td className="px-3 py-2">{can(user, "customers:write") && <form action={processDataRequest} className="flex gap-2"><input type="hidden" name="id" value={r.id} /><button name="op" value="complete" className="text-xs underline">{r.type === "DELETION" ? "Anonymise now" : "Mark completed"}</button><button name="op" value="reject" className="text-xs text-danger underline">Reject</button></form>}</td></tr>)}
          </Table>
        </Section>
      )}
      <form className="mb-4 flex gap-2"><input name="q" defaultValue={sp.q} placeholder="Email, name or phone" className="input !min-h-9 max-w-xs !py-1 text-sm" /><button className="btn btn-outline btn-sm">Search</button></form>
      <Table head={["Customer", "Joined", "Paid orders", "Lifetime spend", "Tier", "Profiles", "Reviews"]} empty="No customers yet.">
        {customers.map((c) => (
          <tr key={c.id}>
            <td className="px-3 py-2"><Link href={`/admin/customers/${c.id}`} className="font-semibold underline-offset-2 hover:underline">{c.name ?? "—"}</Link><p className="text-xs text-muted">{c.email}</p></td>
            <td className="px-3 py-2 text-xs">{formatDate(c.createdAt)}</td>
            <td className="px-3 py-2">{c.orders.length}</td>
            <td className="px-3 py-2">{formatINR(c.orders.reduce((s, o) => s + o.totalPaise, 0))}</td>
            <td className="px-3 py-2"><Pill tone={statusTone(c.loyaltyAccount?.tierKey ?? "MEMBER")}>{c.loyaltyAccount?.tierKey ?? "MEMBER"}</Pill></td>
            <td className="px-3 py-2">{c._count.scentProfiles}</td>
            <td className="px-3 py-2">{c._count.reviews}</td>
          </tr>
        ))}
      </Table>
    </>
  );
}
