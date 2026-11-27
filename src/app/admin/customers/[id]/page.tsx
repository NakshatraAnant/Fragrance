import Link from "next/link";
import { notFound } from "next/navigation";
import { db } from "@/lib/db";
import { requireStaff } from "@/lib/auth";
import { can } from "@/lib/auth-core";
import { adjustLoyalty } from "@/app/actions/admin/crm";
import { formatINR, formatDate } from "@/lib/money";
import { AdminHeader, Btn, Flash, In, Pill, Section, Stat, Table, statusTone } from "@/components/admin/ui";

export default async function Customer({ params, searchParams }: { params: Promise<{ id: string }>; searchParams: Promise<{ msg?: string; err?: string }> }) {
  const staff = await requireStaff("customers:read", "/admin/customers");
  const { id } = await params;
  const sp = await searchParams;
  const c = await db.user.findUnique({
    where: { id },
    include: {
      orders: { orderBy: { createdAt: "desc" } }, addresses: true, preferences: true, scentProfiles: { orderBy: { createdAt: "desc" } }, reviews: { include: { product: true } },
      loyaltyAccount: { include: { transactions: { orderBy: { createdAt: "desc" }, take: 10 } } }, consents: { orderBy: { createdAt: "desc" } }, tickets: true, discoveryCredits: true, crmEvents: { orderBy: { createdAt: "desc" }, take: 10 },
    },
  });
  if (!c || c.roleId) notFound();
  const paid = c.orders.filter((o) => o.paymentStatus === "PAID");
  return (
    <>
      <AdminHeader title={c.name ?? c.email} sub={`${c.email} · ${c.phone ?? "no phone"} · joined ${formatDate(c.createdAt)}${c.referralCode ? ` · referral ${c.referralCode}` : ""}`} />
      <Flash msg={sp.msg} err={sp.err} />
      <div className="grid grid-cols-2 gap-3 md:grid-cols-5">
        <Stat label="Paid orders" value={paid.length} /><Stat label="Lifetime spend" value={formatINR(paid.reduce((s, o) => s + o.totalPaise, 0))} />
        <Stat label="Tier" value={c.loyaltyAccount?.tierKey ?? "MEMBER"} /><Stat label="Points" value={c.loyaltyAccount?.pointsBalance ?? 0} /><Stat label="Credits" value={c.discoveryCredits.filter((d) => d.status === "AVAILABLE").length} note="available" />
      </div>
      <div className="mt-8 grid gap-8 xl:grid-cols-2">
        <Section title="Orders"><Table head={["Order", "Total", "Status", "Placed"]} empty="No orders.">{c.orders.map((o) => <tr key={o.id}><td className="px-3 py-2"><Link href={`/admin/orders/${o.id}`} className="font-mono text-xs underline">{o.number}</Link></td><td className="px-3 py-2">{formatINR(o.totalPaise)}</td><td className="px-3 py-2"><Pill tone={statusTone(o.status)}>{o.status}</Pill></td><td className="px-3 py-2 text-xs">{formatDate(o.createdAt)}</td></tr>)}</Table></Section>
        <Section title="Scent Finder results"><Table head={["Personality", "When", ""]} empty="No quiz results.">{c.scentProfiles.map((p) => <tr key={p.id}><td className="px-3 py-2">{p.personalityTitle}</td><td className="px-3 py-2 text-xs">{formatDate(p.createdAt)}</td><td className="px-3 py-2"><Link href={`/scent-finder/results/${p.shareId}`} className="text-xs underline" target="_blank">Open</Link></td></tr>)}</Table></Section>
        <Section title="Preferences & consent">
          <div className="card p-4 text-sm">
            <p>Favourite families: {c.preferences?.favouriteFamilies || "—"}</p><p>Avoid: {c.preferences?.dislikedNotes || "—"}</p><p>Personalisation consent: {c.preferences?.profilingConsent ? "yes" : "no"}</p>
            <p className="mt-2 font-semibold">Consent log</p><ul className="text-xs text-muted">{c.consents.map((x) => <li key={x.id}>{formatDate(x.createdAt, true)} · {x.channel} · {x.granted ? "granted" : "withdrawn"} · {x.source}</li>)}{!c.consents.length && <li>No consent records.</li>}</ul>
          </div>
        </Section>
        <Section title="Loyalty">
          <Table head={["Type", "Points", "Note", "When"]} empty="No loyalty activity.">{c.loyaltyAccount?.transactions.map((t) => <tr key={t.id}><td className="px-3 py-2">{t.type}</td><td className="px-3 py-2">{t.points}</td><td className="px-3 py-2 text-xs">{t.note}</td><td className="px-3 py-2 text-xs">{formatDate(t.createdAt)}</td></tr>)}</Table>
          {can(staff, "customers:write") && <form action={adjustLoyalty} className="card mt-3 grid items-end gap-3 p-4 md:grid-cols-3"><input type="hidden" name="userId" value={c.id} /><In label="Points (+/−)" name="points" type="number" required /><In label="Reason" name="note" required /><Btn>Adjust</Btn></form>}
        </Section>
        <Section title="Reviews"><Table head={["Product", "Rating", "Status"]} empty="No reviews.">{c.reviews.map((r) => <tr key={r.id}><td className="px-3 py-2">{r.product.name}</td><td className="px-3 py-2">{r.rating}★</td><td className="px-3 py-2"><Pill tone={statusTone(r.status)}>{r.status}</Pill></td></tr>)}</Table></Section>
        <Section title="Support & lifecycle">
          <Table head={["Item", "Status", "When"]} empty="No tickets or lifecycle events.">
            {[...c.tickets.map((t) => <tr key={t.id}><td className="px-3 py-2">Ticket {t.number}: {t.topic}</td><td className="px-3 py-2"><Pill tone={statusTone(t.status)}>{t.status}</Pill></td><td className="px-3 py-2 text-xs">{formatDate(t.createdAt)}</td></tr>),
              ...c.crmEvents.map((e) => <tr key={e.id}><td className="px-3 py-2">CRM · {e.type}</td><td className="px-3 py-2">{e.processedAt ? "sent" : `due ${formatDate(e.dueAt)}`}</td><td className="px-3 py-2 text-xs">{formatDate(e.createdAt)}</td></tr>)]}
          </Table>
        </Section>
      </div>
    </>
  );
}
