import Link from "next/link";
import { redirect } from "next/navigation";
import { db } from "@/lib/db";
import { getCurrentUser } from "@/lib/auth";
import { can } from "@/lib/auth-core";
import { coreMetrics, discoveryConversion, periodFromDays } from "@/lib/metrics";
import { availabilityFor } from "@/lib/inventory";
import { formatINR, formatDate } from "@/lib/money";
import { AdminHeader, Pill, Section, Stat, Table, statusTone } from "@/components/admin/ui";
import { integrationStatuses } from "@/lib/env";

const pct = (x: number | null) => (x === null ? "—" : `${(x * 100).toFixed(1)}%`);

export default async function Dashboard({ searchParams }: { searchParams: Promise<{ days?: string }> }) {
  const user = await getCurrentUser();
  if (!can(user, "dashboard:read")) redirect(can(user, "b2b:read") ? "/admin/b2b" : "/admin/forbidden?need=dashboard:read");
  const days = [7, 30, 90, 365].includes(Number((await searchParams).days)) ? Number((await searchParams).days) : 30;
  const p = periodFromDays(days);
  const [m, disc, recent, variants, b2bOpen, pendingReviews, openTickets, testStock] = await Promise.all([
    coreMetrics(p), discoveryConversion(),
    db.order.findMany({ orderBy: { createdAt: "desc" }, take: 8 }),
    db.variant.findMany({ include: { product: { select: { name: true, slug: true, id: true } } } }),
    db.b2BEnquiry.count({ where: { stage: { notIn: ["LOST", "REPEAT_BUSINESS"] } } }),
    db.review.count({ where: { status: "PENDING" } }),
    db.supportTicket.count({ where: { status: { not: "RESOLVED" } } }),
    db.inventory.aggregate({ where: { warehouse: { isTest: true } }, _sum: { onHand: true } }),
  ]);
  const avail = await availabilityFor(variants.map((v) => v.id));
  const low = variants.filter((v) => (avail[v.id] ?? 0) <= 5).sort((a, b) => (avail[a.id] ?? 0) - (avail[b.id] ?? 0)).slice(0, 10);
  const integrations = integrationStatuses();
  return (
    <>
      <AdminHeader title="Dashboard" sub={`Actual data recorded on this platform · last ${days} days`}>
        {[7, 30, 90, 365].map((d) => <Link key={d} href={`/admin?days=${d}`} className={`btn btn-sm ${d === days ? "btn-primary" : "btn-outline"}`}>{d}d</Link>)}
      </AdminHeader>
      {(testStock._sum.onHand ?? 0) > 0 && <p className="mb-4 rounded-md bg-warn/10 p-3 text-sm text-warn">Test stock is loaded in the <strong>DEV-TEST</strong> warehouse so checkout can be exercised. Remove it before launch (seed with SEED_TEST_DATA=false).</p>}
      <div className="grid grid-cols-2 gap-3 md:grid-cols-4 xl:grid-cols-6">
        <Stat label="Revenue" value={formatINR(m.revenuePaise)} note="Paid orders, incl. GST" />
        <Stat label="Orders" value={m.orders} href="/admin/orders" />
        <Stat label="AOV" value={formatINR(m.aovPaise)} />
        <Stat label="Sessions" value={m.sessions} note="First-party page views" />
        <Stat label="Conversion" value={pct(m.conversionRate)} note="Orders ÷ sessions" />
        <Stat label="Revenue / visitor" value={m.revenuePerVisitorPaise === null ? "—" : formatINR(m.revenuePerVisitorPaise)} />
        <Stat label="New customers" value={m.newCustomers} />
        <Stat label="Repeat customers" value={m.repeatCustomers} note={`Repeat rate ${pct(m.repeatRate)}`} />
        <Stat label="Discovery → full size" value={pct(disc.rate)} note={`${disc.converted}/${disc.discoveryCustomers} customers`} />
        <Stat label="Credits redeemed" value={formatINR(m.creditsRedeemedPaise)} />
        <Stat label="Refunds" value={formatINR(m.refundsPaise)} note={`${m.refundCount} refunds`} />
        <Stat label="CAC" value="—" note={m.cacNote} />
      </div>
      <div className="mt-8 grid gap-8 xl:grid-cols-2">
        <Section title="Brand performance">
          <Table head={["Brand", "Revenue", "Units"]} empty="No paid orders in this period.">{m.byBrand.map((b) => <tr key={b.brand}><td className="px-3 py-2 capitalize">{b.brand}</td><td className="px-3 py-2">{formatINR(b.revenue)}</td><td className="px-3 py-2">{b.units}</td></tr>)}</Table>
        </Section>
        <Section title="Top SKUs">
          <Table head={["SKU", "Product", "Revenue", "Units"]} empty="No paid orders in this period.">{m.bySku.slice(0, 8).map((s) => <tr key={s.sku}><td className="px-3 py-2 font-mono text-xs">{s.sku}</td><td className="px-3 py-2">{s.name}</td><td className="px-3 py-2">{formatINR(s.revenue)}</td><td className="px-3 py-2">{s.units}</td></tr>)}</Table>
        </Section>
        <Section title="Recent orders" aside={<Link href="/admin/orders" className="text-sm underline">All</Link>}>
          <Table head={["Order", "Customer", "Total", "Status", "Placed"]}>{recent.map((o) => <tr key={o.id}><td className="px-3 py-2"><Link href={`/admin/orders/${o.id}`} className="font-mono text-xs underline">{o.number}</Link></td><td className="px-3 py-2">{o.email}</td><td className="px-3 py-2">{formatINR(o.totalPaise)}</td><td className="px-3 py-2"><Pill tone={statusTone(o.status)}>{o.status}</Pill></td><td className="px-3 py-2 text-xs">{formatDate(o.createdAt, true)}</td></tr>)}</Table>
        </Section>
        <Section title="Inventory alerts" aside={<Link href="/admin/inventory" className="text-sm underline">Inventory</Link>}>
          <Table head={["SKU", "Product", "Available"]} empty="No low-stock SKUs.">{low.map((v) => <tr key={v.id}><td className="px-3 py-2 font-mono text-xs">{v.sku}</td><td className="px-3 py-2">{v.product.name} · {v.label}</td><td className="px-3 py-2"><Pill tone={(avail[v.id] ?? 0) === 0 ? "danger" : "warn"}>{avail[v.id] ?? 0}</Pill></td></tr>)}</Table>
        </Section>
      </div>
      <div className="mt-2 grid grid-cols-2 gap-3 md:grid-cols-4">
        <Stat label="Open B2B enquiries" value={b2bOpen} href="/admin/b2b" />
        <Stat label="Reviews awaiting moderation" value={pendingReviews} href="/admin/reviews" />
        <Stat label="Open support tickets" value={openTickets} href="/admin/support" />
        <Stat label="Integrations configured" value={`${integrations.filter((i) => i.status === "CONFIGURED").length}/${integrations.length - 1}`} href="/admin/system" note="Excluding the sandbox" />
      </div>
    </>
  );
}
