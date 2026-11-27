/**
 * Founder intelligence — every number here is computed from records in this platform's database
 * (paid orders, analytics events). Nothing is estimated or extrapolated. Metrics that need data
 * we don't have (e.g. CAC needs marketing spend) are returned as null with a reason.
 */
import { db } from "./db";

export type Period = { from: Date; to: Date; days: number };
export function periodFromDays(days: number): Period {
  const to = new Date();
  return { from: new Date(to.getTime() - days * 86400_000), to, days };
}

export async function coreMetrics(p: Period) {
  const paid = { paymentStatus: { in: ["PAID", "PARTIALLY_REFUNDED", "REFUNDED"] }, paidAt: { gte: p.from, lte: p.to } };
  const [orders, sessionsRows, purchasers, items, refunds] = await Promise.all([
    db.order.findMany({ where: paid, select: { id: true, totalPaise: true, userId: true, email: true, creditPaise: true, discountPaise: true, status: true } }),
    db.analyticsEvent.groupBy({ by: ["sessionId"], where: { name: "page_view", createdAt: { gte: p.from, lte: p.to } } }),
    db.order.groupBy({ by: ["email"], where: { paymentStatus: "PAID" }, _count: { _all: true }, _min: { paidAt: true } }),
    db.orderItem.findMany({ where: { order: paid }, select: { sku: true, productName: true, brandSlug: true, format: true, quantity: true, lineTotalPaise: true, variantId: true } }),
    db.refund.aggregate({ where: { createdAt: { gte: p.from, lte: p.to }, status: { in: ["COMPLETED", "PROCESSING"] } }, _sum: { amountPaise: true }, _count: { _all: true } }),
  ]);
  const revenue = orders.reduce((s, o) => s + o.totalPaise, 0);
  const sessions = sessionsRows.length;
  const repeatCustomers = purchasers.filter((x) => x._count._all > 1).length;
  const newCustomers = purchasers.filter((x) => x._min.paidAt && x._min.paidAt >= p.from).length;
  const byBrand: Record<string, { revenue: number; units: number }> = {};
  const bySku: Record<string, { name: string; brand: string; revenue: number; units: number }> = {};
  for (const i of items) {
    byBrand[i.brandSlug] ??= { revenue: 0, units: 0 };
    byBrand[i.brandSlug].revenue += i.lineTotalPaise; byBrand[i.brandSlug].units += i.quantity;
    bySku[i.sku] ??= { name: i.productName, brand: i.brandSlug, revenue: 0, units: 0 };
    bySku[i.sku].revenue += i.lineTotalPaise; bySku[i.sku].units += i.quantity;
  }
  return {
    revenuePaise: revenue,
    orders: orders.length,
    aovPaise: orders.length ? Math.round(revenue / orders.length) : 0,
    sessions,
    conversionRate: sessions ? orders.length / sessions : null,
    revenuePerVisitorPaise: sessions ? Math.round(revenue / sessions) : null,
    newCustomers,
    repeatCustomers,
    totalCustomers: purchasers.length,
    repeatRate: purchasers.length ? repeatCustomers / purchasers.length : null,
    refundsPaise: refunds._sum.amountPaise ?? 0,
    refundCount: refunds._count._all,
    returnRate: orders.length ? refunds._count._all / orders.length : null,
    creditsRedeemedPaise: orders.reduce((s, o) => s + o.creditPaise, 0),
    discountsPaise: orders.reduce((s, o) => s + o.discountPaise, 0),
    byBrand: Object.entries(byBrand).map(([brand, v]) => ({ brand, ...v })).sort((a, b) => b.revenue - a.revenue),
    bySku: Object.entries(bySku).map(([sku, v]) => ({ sku, ...v })).sort((a, b) => b.revenue - a.revenue),
    cac: null as null, cacNote: "CAC needs marketing spend and attribution data. Neither is connected yet.",
  };
}

/** Discovery-to-full-size: share of customers who bought a discovery set and later bought an eligible full size. */
export async function discoveryConversion() {
  const discBuyers = await db.order.findMany({ where: { paymentStatus: "PAID", items: { some: { format: "DISCOVERY" } } }, select: { email: true, paidAt: true } });
  const firstDisc = new Map<string, Date>();
  for (const o of discBuyers) if (o.paidAt && (!firstDisc.has(o.email) || o.paidAt < firstDisc.get(o.email)!)) firstDisc.set(o.email, o.paidAt);
  let converted = 0;
  for (const [email, at] of firstDisc) {
    const n = await db.order.count({ where: { email, paymentStatus: "PAID", paidAt: { gt: at }, items: { some: { format: { in: ["EDP", "EXTRAIT", "ATTAR"] } } } } });
    if (n) converted++;
  }
  const credits = await db.discoveryCredit.groupBy({ by: ["status"], _count: { _all: true }, _sum: { amountPaise: true } });
  return { discoveryCustomers: firstDisc.size, converted, rate: firstDisc.size ? converted / firstDisc.size : null, credits };
}

export async function funnel(p: Period) {
  const names = ["page_view", "product_view", "add_to_cart", "checkout_start", "purchase", "finder_start", "finder_complete", "recommendation_click", "search", "payment_failure", "wishlist_add", "review_submit", "b2b_enquiry", "filter_use", "brand_visit", "product_click", "layering_save", "newsletter_signup", "discovery_set_purchase", "discovery_credit_redeemed"];
  const rows = await db.analyticsEvent.groupBy({ by: ["name"], where: { createdAt: { gte: p.from, lte: p.to }, name: { in: names } }, _count: { _all: true } });
  const sessionsBy = await Promise.all(["page_view", "product_view", "add_to_cart", "checkout_start", "purchase"].map(async (n) => [n, (await db.analyticsEvent.groupBy({ by: ["sessionId"], where: { name: n, createdAt: { gte: p.from, lte: p.to } } })).length] as const));
  return { counts: Object.fromEntries(rows.map((r) => [r.name, r._count._all])) as Record<string, number>, sessions: Object.fromEntries(sessionsBy) as Record<string, number> };
}

export async function searchAnalytics(p: Period) {
  const rows = await db.analyticsEvent.findMany({ where: { name: "search", createdAt: { gte: p.from, lte: p.to } }, select: { props: true }, take: 5000 });
  const tally: Record<string, { q: string; count: number; zero: number }> = {};
  for (const r of rows) {
    const pr = JSON.parse(r.props) as { q?: string; zero?: boolean };
    if (!pr.q) continue;
    const k = pr.q.toLowerCase().trim();
    tally[k] ??= { q: k, count: 0, zero: 0 };
    tally[k].count++; if (pr.zero) tally[k].zero++;
  }
  const all = Object.values(tally).sort((a, b) => b.count - a.count);
  return { total: rows.length, top: all.slice(0, 15), zero: all.filter((x) => x.zero > 0).slice(0, 15) };
}

export async function channelPerformance(p: Period) {
  const views = await db.analyticsEvent.findMany({ where: { name: "page_view", createdAt: { gte: p.from, lte: p.to } }, select: { sessionId: true, referrer: true }, orderBy: { createdAt: "asc" }, take: 20000 });
  const firstRef = new Map<string, string>();
  for (const v of views) if (!firstRef.has(v.sessionId)) { let host = "direct"; try { if (v.referrer) host = new URL(v.referrer).hostname || "direct"; } catch {} firstRef.set(v.sessionId, host); }
  const purchases = await db.analyticsEvent.findMany({ where: { name: "checkout_start", createdAt: { gte: p.from, lte: p.to } }, select: { sessionId: true } });
  const out: Record<string, { sessions: number; checkouts: number }> = {};
  for (const [, ref] of firstRef) { out[ref] ??= { sessions: 0, checkouts: 0 }; out[ref].sessions++; }
  for (const pu of purchases) { const ref = firstRef.get(pu.sessionId); if (ref) out[ref].checkouts++; }
  return Object.entries(out).map(([channel, v]) => ({ channel, ...v })).sort((a, b) => b.sessions - a.sessions).slice(0, 12);
}

export async function customerLifetimeValue() {
  const rows = await db.order.groupBy({ by: ["email"], where: { paymentStatus: "PAID" }, _sum: { totalPaise: true } });
  const total = rows.reduce((s, r) => s + (r._sum.totalPaise ?? 0), 0);
  return { customers: rows.length, averagePaise: rows.length ? Math.round(total / rows.length) : 0, note: "Historical average revenue per paying customer to date. Not a predictive LTV." };
}
