import type { Metadata } from "next";
import { db } from "@/lib/db";
import { requireUser } from "@/lib/auth";
import { getSetting } from "@/lib/settings";
import { tierFor } from "@/lib/loyalty";
import { creditStatusAt } from "@/lib/credits";
import { formatINR, formatDate } from "@/lib/money";

export const metadata: Metadata = { title: "Loyalty & credits", robots: { index: false } };

export default async function LoyaltyPage() {
  const user = await requireUser("/account/loyalty");
  const [cfg, account, credits, rule, referrals, me] = await Promise.all([
    getSetting("loyalty"), db.loyaltyAccount.findUnique({ where: { userId: user.id }, include: { transactions: { orderBy: { createdAt: "desc" }, take: 20 } } }),
    db.discoveryCredit.findMany({ where: { OR: [{ userId: user.id }, { email: user.email, userId: null }] }, orderBy: { issuedAt: "desc" }, include: { sourceOrderItem: { include: { order: { select: { number: true } } } } } }),
    getSetting("discoveryCredit"), db.referral.findMany({ where: { referrerId: user.id } }), db.user.findUniqueOrThrow({ where: { id: user.id }, select: { referralCode: true } }),
  ]);
  const tier = tierFor(account?.lifetimeSpendPaise ?? 0, cfg);
  const redeemedNums = await db.order.findMany({ where: { id: { in: credits.map((c) => c.redeemedOrderId).filter(Boolean) as string[] } }, select: { id: true, number: true } });
  return (
    <div className="grid gap-12">
      <h1 className="display text-5xl">Loyalty & credits</h1>
      <section className="grid gap-4 md:grid-cols-3">
        <div className="card p-6"><p className="eyebrow">Tier</p><p className="display mt-2 text-3xl">{tier.name}</p><p className="mt-2 text-sm text-muted">{tier.benefits.join(" · ")}</p></div>
        <div className="card p-6"><p className="eyebrow">Points</p><p className="display mt-2 text-3xl">{cfg.enabled ? account?.pointsBalance ?? 0 : "—"}</p><p className="mt-2 text-sm text-muted">{cfg.enabled ? `Points expire ${cfg.expiryMonths} months after they're earned.` : "Our points programme hasn't launched yet. Your purchases still count towards your tier."}</p></div>
        <div className="card p-6"><p className="eyebrow">Lifetime spend</p><p className="display mt-2 text-3xl">{formatINR(account?.lifetimeSpendPaise ?? 0)}</p></div>
      </section>
      <section>
        <h2 className="display text-3xl">Discovery credits</h2>
        <p className="mt-2 text-sm text-muted">{rule.enabled ? `When you buy a discovery set, its price becomes a credit once payment is confirmed. Use it on your first eligible full size (${rule.eligibleFormats.join(", ").toLowerCase()}) within ${rule.validityDays} days.${rule.excludedBrands.length ? ` Not valid on ${rule.excludedBrands.join(", ")}.` : ""} Each credit can be used once.` : "Discovery credits are currently paused."}</p>
        {credits.length === 0 ? <p className="mt-4 text-muted">No credits yet.</p> : (
          <table className="mt-4 w-full text-left text-sm">
            <thead className="text-muted"><tr><th className="py-2">Amount</th><th>From order</th><th>Issued</th><th>Expires</th><th>Status</th></tr></thead>
            <tbody className="divide-y divide-line">{credits.map((c) => <tr key={c.id}><td className="py-2">{formatINR(c.amountPaise)}</td><td>{c.sourceOrderItem.order.number}</td><td>{formatDate(c.issuedAt)}</td><td>{formatDate(c.expiresAt)}</td><td>{creditStatusAt(c).toLowerCase()}{c.redeemedOrderId ? ` on ${redeemedNums.find((o) => o.id === c.redeemedOrderId)?.number ?? ""}` : ""}</td></tr>)}</tbody>
          </table>
        )}
      </section>
      {cfg.enabled && account && account.transactions.length > 0 && (
        <section><h2 className="display text-3xl">Reward history</h2><ul className="mt-4 divide-y divide-line text-sm">{account.transactions.map((t) => <li key={t.id} className="flex justify-between py-2"><span>{t.type.toLowerCase()} · {t.note}</span><span>{t.points > 0 ? "+" : ""}{t.points}</span></li>)}</ul></section>
      )}
      <section className="card p-6">
        <h2 className="display text-2xl">Refer a friend</h2>
        <p className="mt-2 text-sm text-muted">Share your code. Friends enter it when they create an account.{cfg.referralPoints ? ` You earn ${cfg.referralPoints} points when their first order is confirmed.` : " Referral rewards will be announced when the programme launches."}</p>
        <p className="display mt-4 text-3xl tracking-widest">{me.referralCode}</p>
        <p className="mt-2 text-sm">{referrals.length} referral{referrals.length === 1 ? "" : "s"} · {referrals.filter((r) => r.status === "QUALIFIED" || r.status === "REWARDED").length} qualified</p>
      </section>
    </div>
  );
}
