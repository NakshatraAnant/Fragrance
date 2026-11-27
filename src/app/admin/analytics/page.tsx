import Link from "next/link";
import { requireStaff } from "@/lib/auth";
import { channelPerformance, coreMetrics, customerLifetimeValue, discoveryConversion, funnel, periodFromDays, searchAnalytics } from "@/lib/metrics";
import { db } from "@/lib/db";
import { formatINR } from "@/lib/money";
import { AdminHeader, Section, Stat, Table } from "@/components/admin/ui";

const pct = (a: number, b: number) => (b ? `${((a / b) * 100).toFixed(1)}%` : "—");

export default async function AnalyticsPage({ searchParams }: { searchParams: Promise<{ days?: string }> }) {
  await requireStaff("analytics:read", "/admin/analytics");
  const days = [7, 30, 90, 365].includes(Number((await searchParams).days)) ? Number((await searchParams).days) : 30;
  const p = periodFromDays(days);
  const [m, f, s, ch, disc, ltv, finderTop] = await Promise.all([coreMetrics(p), funnel(p), searchAnalytics(p), channelPerformance(p), discoveryConversion(), customerLifetimeValue(), db.scentProfile.groupBy({ by: ["personalityTitle"], where: { createdAt: { gte: p.from } }, _count: { _all: true }, orderBy: { _count: { personalityTitle: "desc" } }, take: 8 })]);
  const steps = ["page_view", "product_view", "add_to_cart", "checkout_start", "purchase"] as const;
  return (
    <>
      <AdminHeader title="Analytics & founder intelligence" sub={`First-party data from this platform · last ${days} days. Estimates are never mixed with actuals. Metrics needing data we don't hold are marked unavailable.`}>
        {[7, 30, 90, 365].map((d) => <Link key={d} href={`/admin/analytics?days=${d}`} className={`btn btn-sm ${d === days ? "btn-primary" : "btn-outline"}`}>{d}d</Link>)}
      </AdminHeader>
      <div className="grid grid-cols-2 gap-3 md:grid-cols-4 xl:grid-cols-6">
        <Stat label="Sessions" value={m.sessions} /><Stat label="Revenue" value={formatINR(m.revenuePaise)} /><Stat label="AOV" value={formatINR(m.aovPaise)} />
        <Stat label="Revenue / visitor" value={m.revenuePerVisitorPaise === null ? "—" : formatINR(m.revenuePerVisitorPaise)} /><Stat label="Return rate" value={m.returnRate === null ? "—" : `${(m.returnRate * 100).toFixed(1)}%`} note="Refunds ÷ orders" />
        <Stat label="Avg revenue / customer" value={formatINR(ltv.averagePaise)} note={ltv.note} />
      </div>
      <div className="mt-8 grid gap-8 xl:grid-cols-2">
        <Section title="Conversion funnel (unique sessions)">
          <Table head={["Step", "Sessions", "From previous"]}>{steps.map((k, i) => <tr key={k}><td className="px-3 py-2 font-mono text-xs">{k}</td><td className="px-3 py-2">{f.sessions[k] ?? 0}</td><td className="px-3 py-2">{i ? pct(f.sessions[k] ?? 0, f.sessions[steps[i - 1]] ?? 0) : "—"}</td></tr>)}</Table>
        </Section>
        <Section title="Discovery engine">
          <Table head={["Metric", "Value"]}>
            <tr><td className="px-3 py-2">Scent Finder starts</td><td className="px-3 py-2">{f.counts.finder_start ?? 0}</td></tr>
            <tr><td className="px-3 py-2">Scent Finder completions</td><td className="px-3 py-2">{f.counts.finder_complete ?? 0} ({pct(f.counts.finder_complete ?? 0, f.counts.finder_start ?? 0)})</td></tr>
            <tr><td className="px-3 py-2">Discovery-set purchases</td><td className="px-3 py-2">{f.counts.discovery_set_purchase ?? 0}</td></tr>
            <tr><td className="px-3 py-2">Credits redeemed</td><td className="px-3 py-2">{f.counts.discovery_credit_redeemed ?? 0}</td></tr>
            <tr><td className="px-3 py-2">Discovery → full-size (all time)</td><td className="px-3 py-2">{disc.converted}/{disc.discoveryCustomers} {disc.rate === null ? "" : `(${(disc.rate * 100).toFixed(1)}%)`}</td></tr>
            <tr><td className="px-3 py-2">Layering saves</td><td className="px-3 py-2">{f.counts.layering_save ?? 0}</td></tr>
          </Table>
          {finderTop.length > 0 && <p className="mt-2 text-xs text-muted">Top personalities: {finderTop.map((x) => `${x.personalityTitle} (${x._count._all})`).join(", ")}</p>}
        </Section>
        <Section title="Brand performance"><Table head={["Brand", "Revenue", "Units"]} empty="No sales in period.">{m.byBrand.map((b) => <tr key={b.brand}><td className="px-3 py-2 capitalize">{b.brand}</td><td className="px-3 py-2">{formatINR(b.revenue)}</td><td className="px-3 py-2">{b.units}</td></tr>)}</Table></Section>
        <Section title="SKU performance"><Table head={["SKU", "Product", "Brand", "Revenue", "Units"]} empty="No sales in period.">{m.bySku.map((x) => <tr key={x.sku}><td className="px-3 py-2 font-mono text-xs">{x.sku}</td><td className="px-3 py-2">{x.name}</td><td className="px-3 py-2 capitalize">{x.brand}</td><td className="px-3 py-2">{formatINR(x.revenue)}</td><td className="px-3 py-2">{x.units}</td></tr>)}</Table></Section>
        <Section title="Search">
          <p className="mb-2 text-sm">{s.total} searches · {s.zero.length} queries with zero results</p>
          <Table head={["Query", "Count", "Zero-result"]} empty="No searches yet.">{s.top.map((q) => <tr key={q.q}><td className="px-3 py-2">{q.q}</td><td className="px-3 py-2">{q.count}</td><td className="px-3 py-2">{q.zero}</td></tr>)}</Table>
        </Section>
        <Section title="Channel performance (first referrer)">
          <Table head={["Channel", "Sessions", "Checkouts"]} empty="No sessions yet.">{ch.map((c) => <tr key={c.channel}><td className="px-3 py-2">{c.channel}</td><td className="px-3 py-2">{c.sessions}</td><td className="px-3 py-2">{c.checkouts}</td></tr>)}</Table>
          <p className="mt-2 text-xs text-muted">CAC: unavailable. {m.cacNote}</p>
        </Section>
        <Section title="Engagement events">
          <Table head={["Event", "Count"]}>{Object.entries(f.counts).sort((a, b) => b[1] - a[1]).map(([k, v]) => <tr key={k}><td className="px-3 py-2 font-mono text-xs">{k}</td><td className="px-3 py-2">{v}</td></tr>)}</Table>
        </Section>
      </div>
    </>
  );
}
