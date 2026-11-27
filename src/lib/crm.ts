/**
 * Lifecycle CRM hooks (blueprint slides 45, 84, 139): welcome, discovery purchase, Day-21 discovery
 * check-in, favourite identified, full-size purchase, review request, replenishment, birthday,
 * loyalty milestone, lapsed customer. Events are queued in CrmEvent and processed by
 * `npm run jobs:expire` (or Admin → System → Run lifecycle jobs). Marketing templates respect consent.
 */
import { db, type Tx } from "./db";
import { sendTemplate } from "./messaging";
import { formatINR, formatDate } from "./money";
import { getSetting } from "./settings";

export type CrmType =
  | "WELCOME" | "DISCOVERY_PURCHASE" | "DISCOVERY_DELIVERED" | "FAVOURITE_IDENTIFIED" | "FULL_SIZE_PURCHASE"
  | "REVIEW_REQUEST" | "REPLENISHMENT" | "BIRTHDAY" | "LOYALTY_MILESTONE" | "LAPSED";

export async function emitCrmEvent(client: Tx, type: CrmType, data: { userId?: string | null; email?: string | null; payload?: Record<string, unknown>; dueAt?: Date }) {
  return client.crmEvent.create({ data: { type, userId: data.userId ?? null, email: data.email ?? null, payload: JSON.stringify(data.payload ?? {}), dueAt: data.dueAt ?? new Date() } });
}

const FULL_SIZE = new Set(["EDP", "EXTRAIT", "ATTAR"]);

/** Called inside the payment-confirmation transaction. */
export async function scheduleOrderLifecycle(tx: Tx, order: { id: string; userId: string | null; email: string; items: { sku: string; format: string; productName: string; variantId: string }[] }) {
  const days = await getSetting("replenishmentDays");
  const hasDiscovery = order.items.some((i) => i.format === "DISCOVERY");
  const fullSize = order.items.filter((i) => FULL_SIZE.has(i.format));
  if (hasDiscovery) {
    await emitCrmEvent(tx, "DISCOVERY_PURCHASE", { userId: order.userId, email: order.email, payload: { orderId: order.id } });
    await emitCrmEvent(tx, "DISCOVERY_DELIVERED", { userId: order.userId, email: order.email, payload: { orderId: order.id }, dueAt: new Date(Date.now() + (days.DISCOVERY ?? 21) * 86400_000) });
  }
  if (fullSize.length) {
    const priorDiscovery = order.userId ? await tx.orderItem.count({ where: { format: "DISCOVERY", order: { userId: order.userId, paymentStatus: "PAID", id: { not: order.id } } } }) : 0;
    if (priorDiscovery) await emitCrmEvent(tx, "FULL_SIZE_PURCHASE", { userId: order.userId, email: order.email, payload: { orderId: order.id, product: fullSize[0].productName } });
  }
  for (const i of order.items) {
    const d = days[i.format];
    if (d && i.format !== "DISCOVERY") await emitCrmEvent(tx, "REPLENISHMENT", { userId: order.userId, email: order.email, payload: { variantId: i.variantId, product: i.productName }, dueAt: new Date(Date.now() + d * 86400_000) });
  }
}

/** Process all due events. Returns counts by type. */
export async function processDueCrmEvents(limit = 200) {
  const due = await db.crmEvent.findMany({ where: { processedAt: null, dueAt: { lte: new Date() } }, take: limit, orderBy: { dueAt: "asc" } });
  const counts: Record<string, number> = {};
  for (const ev of due) {
    const p = JSON.parse(ev.payload) as Record<string, string>;
    const user = ev.userId ? await db.user.findUnique({ where: { id: ev.userId } }) : null;
    const to = { userId: ev.userId, email: ev.email ?? user?.email, phone: user?.phone };
    const name = user?.name ?? "there";
    switch (ev.type) {
      case "WELCOME": await sendTemplate("WELCOME", "EMAIL", to, { name }); break;
      case "DISCOVERY_PURCHASE":
      case "DISCOVERY_DELIVERED": {
        const credit = await db.discoveryCredit.findFirst({ where: { sourceOrderItem: { orderId: p.orderId } } });
        const vars = { name, credit: credit ? formatINR(credit.amountPaise) : "", expiry: credit ? formatDate(credit.expiresAt) : "" };
        if (ev.type === "DISCOVERY_PURCHASE") await sendTemplate("DISCOVERY_PURCHASE", "EMAIL", to, vars);
        else await sendTemplate("DISCOVERY_DELIVERED", "WHATSAPP", to, vars);
        break;
      }
      case "FULL_SIZE_PURCHASE": await sendTemplate("FULL_SIZE_PURCHASE", "EMAIL", to, { product: p.product }); break;
      case "REVIEW_REQUEST": await sendTemplate("REVIEW_REQUEST", "EMAIL", to, { product: p.product, slug: p.slug }); break;
      case "FAVOURITE_IDENTIFIED": await sendTemplate("FAVOURITE_IDENTIFIED", "EMAIL", to, { product: p.product, slug: p.slug }); break;
      case "REPLENISHMENT": {
        const v = p.variantId ? await db.variant.findUnique({ where: { id: p.variantId }, include: { product: true } }) : null;
        if (v) { await sendTemplate("REPLENISHMENT", "EMAIL", to, { product: v.product.name, slug: v.product.slug }); await sendTemplate("REPLENISHMENT", "WHATSAPP", to, { product: v.product.name, slug: v.product.slug }); }
        break;
      }
      case "BIRTHDAY": await sendTemplate("BIRTHDAY", "EMAIL", to, { name }); break;
      case "LOYALTY_MILESTONE": await sendTemplate("LOYALTY_MILESTONE", "EMAIL", to, { tier: p.tier, benefits: p.benefits }); break;
      case "LAPSED": await sendTemplate("LAPSED", "EMAIL", to, {}); break;
    }
    await db.crmEvent.update({ where: { id: ev.id }, data: { processedAt: new Date() } });
    counts[ev.type] = (counts[ev.type] ?? 0) + 1;
  }
  return counts;
}

/** Scans for birthdays today and lapsed customers (no paid order in 180 days). Idempotent per day. */
export async function scheduleScannedEvents() {
  const now = new Date();
  const dayKey = now.toISOString().slice(0, 10);
  const users = await db.user.findMany({ where: { roleId: null, deletedAt: null, birthday: { not: null } }, select: { id: true, email: true, birthday: true } });
  let birthdays = 0;
  for (const u of users) {
    if (u.birthday!.getMonth() === now.getMonth() && u.birthday!.getDate() === now.getDate()) {
      const exists = await db.crmEvent.findFirst({ where: { userId: u.id, type: "BIRTHDAY", payload: { contains: dayKey } } });
      if (!exists) { await emitCrmEvent(db, "BIRTHDAY", { userId: u.id, email: u.email, payload: { day: dayKey } }); birthdays++; }
    }
  }
  const cutoff = new Date(now.getTime() - 180 * 86400_000);
  const lapsed = await db.user.findMany({ where: { roleId: null, orders: { some: { paymentStatus: "PAID" }, none: { paymentStatus: "PAID", createdAt: { gte: cutoff } } } }, select: { id: true, email: true } });
  let lapsedCount = 0;
  for (const u of lapsed) {
    const recent = await db.crmEvent.findFirst({ where: { userId: u.id, type: "LAPSED", createdAt: { gte: cutoff } } });
    if (!recent) { await emitCrmEvent(db, "LAPSED", { userId: u.id, email: u.email }); lapsedCount++; }
  }
  return { birthdays, lapsed: lapsedCount };
}
