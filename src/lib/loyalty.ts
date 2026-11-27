import type { Tx } from "./db";
import type { Settings } from "./settings-defaults";

type LoyaltyConfig = Settings["loyalty"];

/** Pure: points earned for an eligible spend. Returns 0 when the programme is disabled. */
export function pointsForSpend(eligibleSpendPaise: number, cfg: LoyaltyConfig): number {
  if (!cfg.enabled || cfg.pointsPerHundredRupees <= 0) return 0;
  return Math.floor((eligibleSpendPaise / 10_000) * cfg.pointsPerHundredRupees);
}

/** Pure: tier for a lifetime spend (highest threshold met). */
export function tierFor(lifetimeSpendPaise: number, cfg: LoyaltyConfig) {
  const sorted = [...cfg.tiers].sort((a, b) => b.minSpendPaise - a.minSpendPaise);
  return sorted.find((t) => lifetimeSpendPaise >= t.minSpendPaise) ?? cfg.tiers[0] ?? { key: "MEMBER", name: "Member", minSpendPaise: 0, benefits: [] };
}

/** Pure: maximum redeemable value for an order. */
export function maxRedeemablePaise(orderTotalPaise: number, balance: number, cfg: LoyaltyConfig) {
  if (!cfg.enabled || cfg.pointValuePaise <= 0) return 0;
  return Math.min(balance * cfg.pointValuePaise, Math.floor((orderTotalPaise * cfg.maxRedeemPct) / 100));
}

/** Records spend (always, for tiers) and earns points (only if enabled) for a paid order. Idempotent. */
export async function recordOrderForLoyalty(tx: Tx, order: { id: string; userId: string | null; items: { brandSlug: string; lineTotalPaise: number }[] }, cfg: LoyaltyConfig) {
  if (!order.userId) return null;
  const eligible = order.items.filter((i) => !cfg.excludedBrands.includes(i.brandSlug)).reduce((s, i) => s + i.lineTotalPaise, 0);
  const allSpend = order.items.reduce((s, i) => s + i.lineTotalPaise, 0);
  const account = await tx.loyaltyAccount.upsert({ where: { userId: order.userId }, update: {}, create: { userId: order.userId } });
  const already = await tx.loyaltyTransaction.findUnique({ where: { accountId_type_orderId: { accountId: account.id, type: "EARN", orderId: order.id } } });
  if (already) return account;
  const points = pointsForSpend(eligible, cfg);
  const lifetimeSpend = account.lifetimeSpendPaise + allSpend;
  await tx.loyaltyTransaction.create({
    data: { accountId: account.id, type: "EARN", points, orderId: order.id, note: cfg.enabled ? `Earned on order` : "Spend recorded (programme not yet enabled)", expiresAt: points ? new Date(Date.now() + cfg.expiryMonths * 30 * 86400_000) : null },
  });
  return tx.loyaltyAccount.update({
    where: { id: account.id },
    data: { pointsBalance: { increment: points }, lifetimePoints: { increment: points }, lifetimeSpendPaise: lifetimeSpend, tierKey: tierFor(lifetimeSpend, cfg).key },
  });
}

export async function reverseLoyaltyForOrder(tx: Tx, orderId: string) {
  const earn = await tx.loyaltyTransaction.findFirst({ where: { type: "EARN", orderId }, include: { account: true } });
  if (!earn) return;
  const exists = await tx.loyaltyTransaction.findUnique({ where: { accountId_type_orderId: { accountId: earn.accountId, type: "REVERSAL", orderId } } });
  if (exists) return;
  await tx.loyaltyTransaction.create({ data: { accountId: earn.accountId, type: "REVERSAL", points: -earn.points, orderId, note: "Order refunded" } });
  await tx.loyaltyAccount.update({ where: { id: earn.accountId }, data: { pointsBalance: { decrement: Math.min(earn.points, earn.account.pointsBalance) } } });
}
