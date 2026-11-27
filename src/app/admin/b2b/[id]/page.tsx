import { notFound } from "next/navigation";
import { db } from "@/lib/db";
import { requireStaff } from "@/lib/auth";
import { can } from "@/lib/auth-core";
import { b2bAction } from "@/app/actions/admin/b2b";
import { B2B_STAGES, B2B_SERVICES } from "@/lib/b2b";
import { formatINR, formatDate } from "@/lib/money";
import { AdminHeader, Area, Btn, Flash, In, Pill, Section, Sel, Table, statusTone } from "@/components/admin/ui";

export default async function B2BEnquiryPage({ params, searchParams }: { params: Promise<{ id: string }>; searchParams: Promise<{ msg?: string; err?: string }> }) {
  const user = await requireStaff("b2b:read", "/admin/b2b");
  const { id } = await params;
  const sp = await searchParams;
  const e = await db.b2BEnquiry.findUnique({ where: { id }, include: { account: { include: { contacts: true, enquiries: { select: { id: true, number: true, stage: true } } } }, contact: true, briefs: true, samples: true, quotations: { orderBy: { createdAt: "desc" } }, attachments: true, activities: { include: { user: { select: { email: true } } }, orderBy: { createdAt: "desc" } }, owner: true } });
  if (!e) notFound();
  const staff = await db.user.findMany({ where: { role: { permissions: { contains: "b2b" } } }, select: { id: true, email: true } }).then(async (r) => [...r, ...(await db.user.findMany({ where: { role: { key: "SUPER_ADMIN" } }, select: { id: true, email: true } }))]);
  const write = can(user, "b2b:write");
  const details = JSON.parse(e.details) as { sampleAddress?: string | null };
  const F = ({ op, children, className = "" }: { op: string; children: React.ReactNode; className?: string }) => <form action={b2bAction} className={className}><input type="hidden" name="enquiryId" value={e.id} /><input type="hidden" name="op" value={op} />{children}</form>;
  return (
    <>
      <AdminHeader title={`${e.account.companyName} · ${e.number}`} sub={`${B2B_SERVICES.find((s) => s.key === e.service)?.name ?? e.service} · ${e.kind} · received ${formatDate(e.createdAt, true)} via ${e.source}`}><Pill tone={statusTone(e.stage)}>{e.stage}</Pill></AdminHeader>
      <Flash msg={sp.msg} err={sp.err} />
      <div className="grid gap-8 xl:grid-cols-[1.4fr_1fr]">
        <div>
          <Section title="Requirement"><div className="card p-4 text-sm"><p className="whitespace-pre-line">{e.summary}</p><dl className="mt-3 grid grid-cols-3 gap-2 text-xs"><div><dt className="text-muted">Volume</dt><dd>{e.quantity ?? "—"}</dd></div><div><dt className="text-muted">Budget</dt><dd>{e.budget ?? "—"}</dd></div><div><dt className="text-muted">Timeline</dt><dd>{e.timeline ?? "—"}</dd></div></dl>{details.sampleAddress && <p className="mt-2 text-xs">Sample address: {details.sampleAddress}</p>}
            {e.attachments.length > 0 && <ul className="mt-3 text-xs">{e.attachments.map((a) => <li key={a.id}><a href={a.url} className="underline" target="_blank" rel="noopener">{a.fileName}</a> ({Math.round(a.bytes / 1024)} KB)</li>)}</ul>}</div></Section>
          {write && (
            <Section title="Pipeline">
              <F op="stage" className="card grid items-end gap-3 p-4 md:grid-cols-3"><Sel label="Move to stage" name="stage" defaultValue={e.stage} options={[...B2B_STAGES]} /><In label="Note" name="note" /><Btn>Update stage</Btn></F>
              <F op="owner" className="card mt-2 grid items-end gap-3 p-4 md:grid-cols-3"><Sel label="Owner" name="ownerId" defaultValue={e.ownerId ?? ""} options={[["", "Unassigned"], ...staff.map((s) => [s.id, s.email] as [string, string])]} /><Btn tone="outline">Assign</Btn></F>
            </Section>
          )}
          <Section title="Briefs">
            {e.briefs.map((b) => <div key={b.id} className="card mb-2 p-4 text-sm"><p className="font-semibold">{b.title}</p><p className="whitespace-pre-line text-muted">{b.content}</p><p className="mt-1 text-xs text-muted">{formatDate(b.createdAt)}</p></div>)}
            {write && <F op="brief" className="card grid gap-2 p-4"><In label="Title" name="title" /><Area label="Brief" name="content" rows={4} /><div><Btn tone="outline">Add brief</Btn></div></F>}
          </Section>
          <Section title="Samples">
            <Table head={["Sample", "Status", "Dispatched", "Feedback", ""]} empty="No samples yet.">
              {e.samples.map((s) => <tr key={s.id}><td className="px-3 py-2 text-xs">{s.description}</td><td className="px-3 py-2"><Pill tone={statusTone(s.status)}>{s.status}</Pill></td><td className="px-3 py-2 text-xs">{s.dispatchedAt ? formatDate(s.dispatchedAt) : "—"}</td><td className="px-3 py-2 text-xs">{s.feedback}</td><td className="px-3 py-2">{write && <F op="sample" className="flex flex-wrap gap-1"><input type="hidden" name="sampleId" value={s.id} /><input name="feedback" placeholder="feedback" className="input !min-h-7 w-28 !py-0 text-xs" />{["PREPARING", "DISPATCHED", "FEEDBACK_RECEIVED"].map((st) => <button key={st} name="status" value={st} className="text-xs underline">{st.toLowerCase().replace("_", " ")}</button>)}</F>}</td></tr>)}
            </Table>
            {write && <F op="sample" className="card mt-2 grid items-end gap-3 p-4 md:grid-cols-[1fr_auto]"><In label="New sample" name="description" /><Btn tone="outline">Add sample</Btn></F>}
          </Section>
          <Section title="Quotations">
            <Table head={["Number", "Lines", "Total", "Valid until", "Status", ""]} empty="No quotations yet.">
              {e.quotations.map((q) => { const lines = JSON.parse(q.lines) as { description: string; qty: number; unitPaise: number }[]; return <tr key={q.id}><td className="px-3 py-2 font-mono text-xs">{q.number}</td><td className="px-3 py-2 text-xs">{lines.map((l, i) => <div key={i}>{l.qty} × {l.description} @ {formatINR(l.unitPaise, { exact: true })}</div>)}</td><td className="px-3 py-2">{formatINR(q.totalPaise)}</td><td className="px-3 py-2 text-xs">{q.validUntil ? formatDate(q.validUntil) : "—"}</td><td className="px-3 py-2"><Pill tone={statusTone(q.status)}>{q.status}</Pill></td><td className="px-3 py-2">{write && <F op="quote" className="flex gap-1"><input type="hidden" name="quoteId" value={q.id} />{["SENT", "ACCEPTED", "REJECTED"].map((st) => <button key={st} name="status" value={st} className="text-xs underline">{st.toLowerCase()}</button>)}</F>}</td></tr>; })}
            </Table>
            {write && (
              <F op="quote" className="card mt-2 grid gap-2 p-4">
                <p className="text-xs text-muted">Excl. GST. Amounts in ₹ per unit.</p>
                {[0, 1, 2, 3].map((i) => <div key={i} className="grid grid-cols-[1fr_6rem_8rem] gap-2"><input name={`d${i}`} placeholder="Description" className="input !min-h-9 !py-1 text-sm" aria-label={`Line ${i + 1} description`} /><input name={`q${i}`} type="number" placeholder="Qty" className="input !min-h-9 !py-1 text-sm" aria-label={`Line ${i + 1} quantity`} /><input name={`u${i}`} type="number" step="0.01" placeholder="Unit ₹" className="input !min-h-9 !py-1 text-sm" aria-label={`Line ${i + 1} unit price`} /></div>)}
                <div className="grid grid-cols-[1fr_auto] items-end gap-2"><In label="Valid until" name="validUntil" type="date" /><Btn>Create quotation</Btn></div>
              </F>
            )}
          </Section>
        </div>
        <div>
          <Section title="Account & contact">
            <div className="card p-4 text-sm"><p className="font-semibold">{e.account.companyName}</p><p className="text-muted">{e.account.industry ?? "—"} · {e.account.city ?? "—"} · GSTIN {e.account.gstin ?? "—"}</p>{e.account.website && <p className="text-xs">{e.account.website}</p>}
              <p className="mt-3 font-semibold">{e.contact.name}</p><p className="text-muted">{e.contact.designation ?? ""} · {e.contact.email} · {e.contact.phone ?? ""}</p>
              {e.account.enquiries.length > 1 && <p className="mt-3 text-xs">Other enquiries: {e.account.enquiries.filter((x) => x.id !== e.id).map((x) => `${x.number} (${x.stage})`).join(", ")}</p>}</div>
          </Section>
          <Section title="Activity & follow-ups">
            {write && <F op="activity" className="card mb-3 grid gap-2 p-4"><Sel label="Type" name="type" options={["NOTE", "CALL", "EMAIL", "MEETING", "FOLLOW_UP"]} /><Area label="Details" name="body" rows={2} /><In label="Follow-up due (optional)" name="dueAt" type="datetime-local" /><div><Btn tone="outline">Log activity</Btn></div></F>}
            <ul className="grid gap-2">{e.activities.map((a) => <li key={a.id} className="card p-3 text-xs"><div className="flex justify-between"><Pill>{a.type}</Pill><span className="text-muted">{formatDate(a.createdAt, true)} · {a.user?.email ?? "system"}</span></div><p className="mt-1 text-sm">{a.body}</p>{a.dueAt && <p className={`mt-1 ${!a.doneAt && a.dueAt < new Date() ? "text-danger" : "text-muted"}`}>Due {formatDate(a.dueAt, true)}{a.doneAt ? " · done" : ""}{write && !a.doneAt && <F op="done" className="inline"><input type="hidden" name="activityId" value={a.id} /> <button className="underline">mark done</button></F>}</p>}</li>)}</ul>
          </Section>
        </div>
      </div>
    </>
  );
}
