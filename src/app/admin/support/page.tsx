import { db } from "@/lib/db";
import { requireStaff } from "@/lib/auth";
import { updateTicket } from "@/app/actions/admin/crm";
import { formatDate } from "@/lib/money";
import { AdminHeader, Flash, Pill, Section, Table, statusTone } from "@/components/admin/ui";

export default async function SupportAdmin({ searchParams }: { searchParams: Promise<{ msg?: string; err?: string }> }) {
  await requireStaff("support:write", "/admin/support");
  const sp = await searchParams;
  const [tickets, appts] = await Promise.all([db.supportTicket.findMany({ orderBy: [{ status: "asc" }, { createdAt: "desc" }], take: 200 }), db.appointmentRequest.findMany({ orderBy: { createdAt: "desc" }, take: 100 })]);
  return (
    <>
      <AdminHeader title="Support & appointments" sub="Customer tickets from the contact and support forms, plus Anvaya private appointment requests." />
      <Flash msg={sp.msg} err={sp.err} />
      <Section title="Support tickets">
        <Table head={["Ref", "Customer", "Topic", "Message", "Status", "Update"]} empty="No tickets yet.">
          {tickets.map((t) => (
            <tr key={t.id}><td className="px-3 py-2 font-mono text-xs">{t.number}<p className="text-muted">{formatDate(t.createdAt, true)}</p></td><td className="px-3 py-2">{t.name}<p className="text-xs text-muted">{t.email}{t.orderNumber ? ` · ${t.orderNumber}` : ""}</p></td><td className="px-3 py-2">{t.topic}</td><td className="max-w-sm px-3 py-2 text-xs">{t.message}</td><td className="px-3 py-2"><Pill tone={statusTone(t.status)}>{t.status}</Pill></td>
              <td className="px-3 py-2"><form action={updateTicket} className="grid gap-1"><input type="hidden" name="id" value={t.id} /><input type="hidden" name="kind" value="ticket" /><input name="note" defaultValue={t.internalNote ?? ""} placeholder="Internal note" className="input !min-h-8 !py-1 text-xs" /><div className="flex gap-1">{["OPEN", "IN_PROGRESS", "RESOLVED"].map((s) => <button key={s} name="status" value={s} className="text-xs underline">{s.toLowerCase().replace("_", " ")}</button>)}</div></form></td></tr>
          ))}
        </Table>
      </Section>
      <Section title="Anvaya appointment requests">
        <Table head={["Client", "City", "Preferred", "Interest", "Status", ""]} empty="No appointment requests.">
          {appts.map((a) => <tr key={a.id}><td className="px-3 py-2">{a.name}<p className="text-xs text-muted">{a.email} · {a.phone}</p></td><td className="px-3 py-2">{a.city}</td><td className="px-3 py-2">{a.preferredDate}</td><td className="px-3 py-2 text-xs">{a.interest}<br />{a.message}</td><td className="px-3 py-2"><Pill tone={statusTone(a.status)}>{a.status}</Pill></td><td className="px-3 py-2"><form action={updateTicket} className="flex gap-1"><input type="hidden" name="id" value={a.id} /><input type="hidden" name="kind" value="appointment" />{["CONFIRMED", "COMPLETED", "CANCELLED"].map((s) => <button key={s} name="status" value={s} className="text-xs underline">{s.toLowerCase()}</button>)}</form></td></tr>)}
        </Table>
      </Section>
    </>
  );
}
