import { db } from "@/lib/db";
import { requireStaff } from "@/lib/auth";
import { integrationStatuses } from "@/lib/env";
import { PERMISSIONS } from "@/lib/permissions";
import { runJobs, staffAction } from "@/app/actions/admin/system";
import { savePincodeRule } from "@/app/actions/admin/content";
import { formatDate } from "@/lib/money";
import { AdminHeader, Btn, Check, Flash, In, Pill, Section, Sel, Table, statusTone } from "@/components/admin/ui";

export default async function SystemPage({ searchParams }: { searchParams: Promise<{ msg?: string; err?: string; tab?: string }> }) {
  const me = await requireStaff("system:write", "/admin/system");
  const sp = await searchParams;
  const [roles, staff, audits, outbox, errors, rules, payEvents] = await Promise.all([
    db.role.findMany({ orderBy: { name: "asc" } }),
    db.user.findMany({ where: { roleId: { not: null } }, include: { role: true }, orderBy: { createdAt: "asc" } }),
    db.auditLog.findMany({ orderBy: { createdAt: "desc" }, take: 40, include: { actor: { select: { email: true } } } }),
    db.messageLog.findMany({ orderBy: { createdAt: "desc" }, take: 25 }),
    db.errorLog.findMany({ orderBy: { createdAt: "desc" }, take: 20 }),
    db.pincodeRule.findMany({ orderBy: { prefix: "asc" } }),
    db.paymentEvent.findMany({ orderBy: { createdAt: "desc" }, take: 15 }),
  ]);
  const roleOpts = roles.map((r) => [r.id, r.name] as [string, string]);
  return (
    <>
      <AdminHeader title="System" sub="Staff and permissions, integrations, jobs, logistics rules, outbox, payment events, audit and error logs." />
      <Flash msg={sp.msg} err={sp.err} />
      <Section title="Integrations">
        <Table head={["Integration", "Status", "Detail", "Environment variables"]}>
          {integrationStatuses().map((i) => <tr key={i.key}><td className="px-3 py-2 font-semibold">{i.name}</td><td className="px-3 py-2"><Pill tone={statusTone(i.status)}>{i.status.replace("_", " ")}</Pill></td><td className="px-3 py-2 text-xs">{i.detail}</td><td className="px-3 py-2 font-mono text-xs">{i.envVars.join(", ")}</td></tr>)}
        </Table>
        <p className="mt-2 text-xs text-muted">Secret values are never shown here, only whether they're present.</p>
      </Section>
      <Section title="Jobs" aside={<form action={runJobs}><Btn>Run now</Btn></form>}>
        <p className="text-sm text-muted">This expires unpaid orders past their reservation window (releasing stock, credits and coupons), queues birthday and lapsed-customer events, and sends due lifecycle messages. Schedule <code>npm run jobs:expire</code> every few minutes in production.</p>
      </Section>
      <Section title="Staff & roles">
        <Table head={["User", "Role", "Status", "Last login", ""]}>
          {staff.map((u) => (
            <tr key={u.id}><td className="px-3 py-2">{u.name ?? "—"}<p className="text-xs text-muted">{u.email}</p></td>
              <td className="px-3 py-2">{u.id === me.id ? u.role?.name : <form action={staffAction} className="flex gap-1"><input type="hidden" name="op" value="role" /><input type="hidden" name="id" value={u.id} /><select name="roleId" defaultValue={u.roleId ?? ""} className="select !min-h-8 !py-0 text-xs">{roleOpts.map(([v, l]) => <option key={v} value={v}>{l}</option>)}</select><button className="text-xs underline">Set</button></form>}</td>
              <td className="px-3 py-2"><Pill tone={u.isActive ? "ok" : "danger"}>{u.isActive ? "Active" : "Disabled"}</Pill></td><td className="px-3 py-2 text-xs">{u.lastLoginAt ? formatDate(u.lastLoginAt, true) : "—"}</td>
              <td className="px-3 py-2">{u.id !== me.id && <form action={staffAction}><input type="hidden" name="op" value="toggle" /><input type="hidden" name="id" value={u.id} /><button className="text-xs underline">{u.isActive ? "Deactivate" : "Activate"}</button></form>}</td></tr>
          ))}
        </Table>
        <form action={staffAction} className="card mt-3 grid items-end gap-3 p-4 md:grid-cols-5"><input type="hidden" name="op" value="create" /><In label="Name" name="name" /><In label="Email" name="email" type="email" required /><In label="Temporary password" name="password" type="password" required autoComplete="new-password" /><Sel label="Role" name="roleId" options={roleOpts} /><Btn>Add staff</Btn></form>
        <details className="card mt-3 p-4"><summary className="cursor-pointer font-semibold">Permission matrix</summary>
          <div className="mt-3 overflow-x-auto"><table className="text-xs"><thead><tr><th className="p-1 text-left">Permission</th>{roles.map((r) => <th key={r.id} className="p-1">{r.name}</th>)}</tr></thead><tbody>{PERMISSIONS.map((p) => <tr key={p}><td className="p-1 font-mono">{p}</td>{roles.map((r) => <td key={r.id} className="p-1 text-center">{r.permissions === "*" || r.permissions.split(",").includes(p) ? "✓" : ""}</td>)}</tr>)}</tbody></table></div>
        </details>
      </Section>
      <Section title="Delivery PIN-code rules">
        <p className="mb-2 text-xs text-muted">PIN codes without a rule show “we can't confirm delivery yet” and can't be checked out. These are configured estimates, so connect your shipping partner for live serviceability.</p>
        <Table head={["Prefix", "Region", "Days", "Serviceable", "COD", "Note"]}>{rules.map((r) => <tr key={r.id}><td className="px-3 py-1 font-mono">{r.prefix}</td><td className="px-3 py-1">{r.region}</td><td className="px-3 py-1">{r.minDays}–{r.maxDays}</td><td className="px-3 py-1">{r.serviceable ? "✓" : "✗"}</td><td className="px-3 py-1">{r.codAllowed ? "✓" : "—"}</td><td className="px-3 py-1 text-xs text-muted">{r.note}</td></tr>)}</Table>
        <form action={savePincodeRule} className="card mt-3 grid items-end gap-3 p-4 md:grid-cols-7"><In label="Prefix (3 digits)" name="prefix" required /><In label="Region" name="region" required /><In label="Min days" name="minDays" type="number" required /><In label="Max days" name="maxDays" type="number" required /><Check label="Serviceable" name="serviceable" defaultChecked /><Check label="COD" name="codAllowed" /><In label="Note" name="note" /><div><Btn>Save rule</Btn></div></form>
      </Section>
      <Section title="Outbox (email & WhatsApp)">
        <Table head={["When", "Template", "Channel", "To", "Status", "Body"]} empty="No messages yet.">{outbox.map((m) => <tr key={m.id}><td className="px-3 py-2 text-xs">{formatDate(m.createdAt, true)}</td><td className="px-3 py-2 font-mono text-xs">{m.templateKey}</td><td className="px-3 py-2 text-xs">{m.channel}</td><td className="px-3 py-2 text-xs">{m.recipient}</td><td className="px-3 py-2"><Pill tone={statusTone(m.status)}>{m.status}</Pill></td><td className="max-w-md px-3 py-2 text-xs"><details><summary className="cursor-pointer">{m.subject ?? "view"}</summary><pre className="whitespace-pre-wrap">{m.body}</pre></details></td></tr>)}</Table>
      </Section>
      <Section title="Payment events (verified webhooks & sandbox)">
        <Table head={["When", "Provider", "Type", "Event id", "Verified", "Processed"]} empty="No payment events yet.">{payEvents.map((p) => <tr key={p.id}><td className="px-3 py-2 text-xs">{formatDate(p.createdAt, true)}</td><td className="px-3 py-2">{p.provider}</td><td className="px-3 py-2 text-xs">{p.type}</td><td className="px-3 py-2 font-mono text-xs">{p.eventId}</td><td className="px-3 py-2">{p.verified ? "✓" : <Pill tone="danger">no</Pill>}</td><td className="px-3 py-2 text-xs">{p.processedAt ? formatDate(p.processedAt, true) : "—"}</td></tr>)}</Table>
      </Section>
      <Section title="Audit log">
        <Table head={["When", "Who", "Action", "Entity", "Diff"]}>{audits.map((a) => <tr key={a.id}><td className="px-3 py-2 text-xs">{formatDate(a.createdAt, true)}</td><td className="px-3 py-2 text-xs">{a.actor?.email ?? "system"}</td><td className="px-3 py-2 font-mono text-xs">{a.action}</td><td className="px-3 py-2 text-xs">{a.entity} {a.entityId?.slice(-8)}</td><td className="max-w-sm truncate px-3 py-2 font-mono text-xs">{a.diff}</td></tr>)}</Table>
      </Section>
      <Section title="Error monitor">
        <Table head={["When", "Message", "Context"]} empty="No errors recorded.">{errors.map((e) => <tr key={e.id}><td className="px-3 py-2 text-xs">{formatDate(e.createdAt, true)}</td><td className="px-3 py-2 text-xs">{e.message}</td><td className="max-w-md truncate px-3 py-2 font-mono text-xs">{e.context}</td></tr>)}</Table>
      </Section>
    </>
  );
}
