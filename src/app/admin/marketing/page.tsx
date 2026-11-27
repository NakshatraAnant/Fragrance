import { db } from "@/lib/db";
import { requireStaff } from "@/lib/auth";
import { getSetting } from "@/lib/settings";
import { couponAction, templateAction } from "@/app/actions/admin/growth";
import { formatINR, formatDate } from "@/lib/money";
import { AdminHeader, Btn, Check, Flash, In, Pill, Section, Sel, Table, statusTone } from "@/components/admin/ui";
import { SettingEditor } from "@/components/admin/setting-editor";

export default async function Marketing({ searchParams }: { searchParams: Promise<{ msg?: string; err?: string }> }) {
  await requireStaff("marketing:write", "/admin/marketing");
  const sp = await searchParams;
  const [coupons, templates, credit, loyalty, shipping, cod, repl, reviews, orders, referrals, crmQueue, creditStats] = await Promise.all([
    db.coupon.findMany({ include: { _count: { select: { redemptions: true } } }, orderBy: { createdAt: "desc" } }),
    db.messageTemplate.findMany({ orderBy: [{ key: "asc" }, { channel: "asc" }] }),
    getSetting("discoveryCredit"), getSetting("loyalty"), getSetting("shipping"), getSetting("cod"), getSetting("replenishmentDays"), getSetting("reviews"), getSetting("orders"),
    db.referral.findMany({ include: { referrer: { select: { email: true } } }, orderBy: { createdAt: "desc" }, take: 20 }),
    db.crmEvent.groupBy({ by: ["type"], where: { processedAt: null }, _count: { _all: true } }),
    db.discoveryCredit.groupBy({ by: ["status"], _count: { _all: true }, _sum: { amountPaise: true } }),
  ]);
  return (
    <>
      <AdminHeader title="Marketing & commercial rules" sub="Coupons, discovery credits, loyalty, shipping, lifecycle messaging and referrals. Every rule is validated before saving and changes are audited." />
      <Flash msg={sp.msg} err={sp.err} />
      {shipping.placeholder && <p className="mb-4 rounded-md bg-warn/10 p-3 text-sm text-warn">The shipping fees are placeholders. The blueprint doesn't set them. Approve real values and set <code>placeholder</code> to false.</p>}
      {!loyalty.enabled && <p className="mb-4 rounded-md bg-warn/10 p-3 text-sm text-warn">The loyalty programme is disabled because its reward economics aren't approved. Purchases still count towards tiers.</p>}
      <Section title="Coupons">
        <Table head={["Code", "Offer", "Scope", "Used", "Window", "Status", ""]} empty="No coupons.">
          {coupons.map((c) => <tr key={c.id}><td className="px-3 py-2 font-mono">{c.code}</td><td className="px-3 py-2 text-xs">{c.type === "PERCENT" ? `${c.value}%` : formatINR(c.value)} off · min {formatINR(c.minSubtotalPaise)}<p className="text-muted">{c.description}</p></td><td className="px-3 py-2 text-xs">{c.brandScope || "all eligible"}</td><td className="px-3 py-2">{c._count.redemptions}{c.maxRedemptions ? `/${c.maxRedemptions}` : ""}</td><td className="px-3 py-2 text-xs">{c.startsAt ? formatDate(c.startsAt) : "—"} → {c.endsAt ? formatDate(c.endsAt) : "—"}</td><td className="px-3 py-2"><Pill tone={c.isActive ? "ok" : "warn"}>{c.isActive ? "Active" : "Paused"}</Pill></td><td className="px-3 py-2"><form action={couponAction}><input type="hidden" name="op" value="toggle" /><input type="hidden" name="id" value={c.id} /><button className="text-xs underline">{c.isActive ? "Pause" : "Activate"}</button></form></td></tr>)}
        </Table>
        <form action={couponAction} className="card mt-3 grid items-end gap-3 p-4 md:grid-cols-4">
          <input type="hidden" name="op" value="create" />
          <In label="Code" name="code" required /><Sel label="Type" name="type" options={[["PERCENT", "Percent"], ["FIXED", "Fixed ₹"]]} /><In label="Value (% or ₹)" name="value" type="number" step="0.01" required /><In label="Min subtotal ₹" name="minSubtotal" type="number" defaultValue={0} />
          <In label="Description" name="description" required className="md:col-span-2" /><In label="Max redemptions" name="maxRedemptions" type="number" /><In label="Per customer" name="perCustomerLimit" type="number" defaultValue={1} />
          <In label="Starts" name="startsAt" type="datetime-local" /><In label="Ends" name="endsAt" type="datetime-local" />
          <div className="flex flex-wrap gap-3">{["dhun", "vasana"].map((b) => <label key={b} className="flex items-center gap-2 text-sm capitalize"><input type="checkbox" name="brandScope" value={b} className="accent-[var(--accent)]" />{b}</label>)}</div><Check label="Active" name="isActive" defaultChecked />
          <p className="text-xs text-muted md:col-span-4">Brand checkboxes limit scope (leave both unticked for all eligible brands). Anvaya is never discounted.</p>
          <div><Btn>Create coupon</Btn></div>
        </form>
      </Section>
      <Section title="Discovery credits">
        <div className="mb-3 flex flex-wrap gap-2">{creditStats.map((s) => <Pill key={s.status} tone={statusTone(s.status)}>{s.status}: {s._count._all} · {formatINR(s._sum.amountPaise ?? 0)}</Pill>)}{creditStats.length === 0 && <span className="text-sm text-muted">No credits issued yet.</span>}</div>
        <SettingEditor k="discoveryCredit" value={credit} back="/admin/marketing" note="sourceSkus earn credits on verified payment. eligibleFormats/excludedBrands control redemption." />
      </Section>
      <div className="grid gap-6 xl:grid-cols-2">
        <SettingEditor k="loyalty" value={loyalty} back="/admin/marketing" rows={16} note="Set earn/burn rates and tiers once approved, then enable." />
        <div className="grid gap-6">
          <SettingEditor k="shipping" value={shipping} back="/admin/marketing" rows={7} />
          <SettingEditor k="cod" value={cod} back="/admin/marketing" rows={5} note="COD also requires codAllowed on the PIN-code rule." />
          <SettingEditor k="orders" value={orders} back="/admin/marketing" rows={3} note="How long stock is reserved while awaiting payment." />
        </div>
        <SettingEditor k="replenishmentDays" value={repl} back="/admin/marketing" rows={12} note="Days after purchase before a replenishment reminder (blueprint slides 45, 46, 84)." />
        <SettingEditor k="reviews" value={reviews} back="/admin/marketing" rows={5} />
      </div>
      <Section title="Lifecycle queue">
        <div className="flex flex-wrap gap-2">{crmQueue.map((q) => <Pill key={q.type}>{q.type}: {q._count._all} pending</Pill>)}{crmQueue.length === 0 && <span className="text-sm text-muted">Nothing queued.</span>}</div>
        <p className="mt-2 text-xs text-muted">Run due events from System → Jobs, or schedule <code>npm run jobs:expire</code>. Marketing templates are sent only with consent.</p>
      </Section>
      <Section title="Email & WhatsApp templates">
        <div className="grid gap-3 xl:grid-cols-2">
          {templates.map((t) => (
            <form key={t.id} action={templateAction} className="card grid gap-2 p-4">
              <input type="hidden" name="id" value={t.id} />
              <div className="flex items-center justify-between"><p className="font-mono text-sm font-semibold">{t.key} · {t.channel}</p><Pill tone={t.isMarketing ? "warn" : "default"}>{t.isMarketing ? "marketing (consent)" : "transactional"}</Pill></div>
              {t.channel === "EMAIL" && <input name="subject" defaultValue={t.subject ?? ""} className="input !min-h-9 !py-1 text-sm" aria-label="Subject" />}
              <textarea name="body" defaultValue={t.body} rows={3} className="textarea !min-h-0 text-sm" aria-label="Body" />
              <div className="flex items-center justify-between"><Check label="Active" name="isActive" defaultChecked={t.isActive} /><Btn tone="outline">Save</Btn></div>
            </form>
          ))}
        </div>
      </Section>
      <Section title="Referrals">
        <Table head={["Referrer", "Referee", "Status", "When"]} empty="No referrals yet.">{referrals.map((r) => <tr key={r.id}><td className="px-3 py-2">{r.referrer.email}</td><td className="px-3 py-2">{r.refereeEmail}</td><td className="px-3 py-2"><Pill tone={statusTone(r.status)}>{r.status}</Pill></td><td className="px-3 py-2 text-xs">{formatDate(r.createdAt)}</td></tr>)}</Table>
      </Section>
    </>
  );
}
