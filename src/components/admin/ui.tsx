import Link from "next/link";

export function AdminHeader({ title, sub, children }: { title: string; sub?: string; children?: React.ReactNode }) {
  return (
    <div className="mb-6 flex flex-wrap items-end justify-between gap-4 border-b border-line pb-4">
      <div><h1 className="text-2xl font-bold tracking-tight">{title}</h1>{sub && <p className="mt-1 text-sm text-muted">{sub}</p>}</div>
      {children && <div className="flex flex-wrap gap-2">{children}</div>}
    </div>
  );
}

export function Flash({ msg, err }: { msg?: string; err?: string }) {
  if (!msg && !err) return null;
  return <p role="status" className={`mb-4 rounded-md p-3 text-sm ${err ? "bg-danger/10 text-danger" : "bg-ok/10 text-ok"}`} data-testid="admin-flash">{err ?? msg}</p>;
}

export function Stat({ label, value, note, href }: { label: string; value: string | number; note?: string; href?: string }) {
  const inner = (<><p className="text-xs font-semibold uppercase tracking-wider text-muted">{label}</p><p className="mt-1 text-2xl font-bold">{value}</p>{note && <p className="mt-1 text-xs text-muted">{note}</p>}</>);
  return href ? <Link href={href} className="card block p-4 hover:border-ink">{inner}</Link> : <div className="card p-4">{inner}</div>;
}

export function Table({ head, children, empty }: { head: string[]; children: React.ReactNode; empty?: string }) {
  const rows = Array.isArray(children) ? children.filter(Boolean) : children ? [children] : [];
  return (
    <div className="card overflow-x-auto">
      <table className="w-full text-left text-sm">
        <thead className="bg-surface-2 text-xs uppercase tracking-wider text-muted"><tr>{head.map((h) => <th key={h} className="whitespace-nowrap px-3 py-2 font-semibold">{h}</th>)}</tr></thead>
        <tbody className="divide-y divide-line">{rows.length ? children : <tr><td colSpan={head.length} className="px-3 py-8 text-center text-muted">{empty ?? "Nothing here yet."}</td></tr>}</tbody>
      </table>
    </div>
  );
}

export function Pill({ children, tone = "default" }: { children: React.ReactNode; tone?: "default" | "ok" | "warn" | "danger" | "accent" }) {
  const cls = { default: "badge", ok: "badge badge-ok", warn: "badge badge-warn", danger: "badge badge-danger", accent: "badge badge-accent" }[tone];
  return <span className={cls}>{children}</span>;
}

export function statusTone(s: string): "default" | "ok" | "warn" | "danger" | "accent" {
  if (/PAID|CONFIRMED|DELIVERED|APPROVED|ACTIVE|COMPLETED|SENT|ACCEPTED|RELEASED|AVAILABLE|CONFIGURED|PUBLISHED|RESOLVED|REDEEMED/.test(s)) return "ok";
  if (/PENDING|UNPAID|PROCESSING|REQUESTED|DRAFT|QUARANTINE|IN_PROGRESS|OPEN|AWAITING|SANDBOX|NOT_CONFIGURED|PLANNED|LEAD|RESERVED/.test(s)) return "warn";
  if (/FAIL|CANCEL|EXPIRED|REJECT|REFUND|BLOCKED|ARCHIVED|LOST|VOID|SKIPPED|MANUAL/.test(s)) return "danger";
  return "default";
}

export function Section({ title, children, aside }: { title: string; children: React.ReactNode; aside?: React.ReactNode }) {
  return <section className="mb-8"><div className="mb-3 flex items-center justify-between gap-3"><h2 className="text-lg font-semibold">{title}</h2>{aside}</div>{children}</section>;
}

export function In({ label, name, defaultValue, type = "text", required, className = "", ...rest }: { label: string; name: string; defaultValue?: string | number | null; type?: string; required?: boolean; className?: string } & Omit<React.InputHTMLAttributes<HTMLInputElement>, "defaultValue">) {
  return <label className={`field ${className}`}><span className="label">{label}</span><input name={name} type={type} defaultValue={defaultValue ?? undefined} required={required} className="input !min-h-10 !py-2 text-sm" {...rest} /></label>;
}

export function Area({ label, name, defaultValue, rows = 4, className = "" }: { label: string; name: string; defaultValue?: string | null; rows?: number; className?: string }) {
  return <label className={`field ${className}`}><span className="label">{label}</span><textarea name={name} defaultValue={defaultValue ?? undefined} rows={rows} className="textarea !min-h-0 text-sm" /></label>;
}

export function Sel({ label, name, options, defaultValue, className = "" }: { label: string; name: string; options: (string | [string, string])[]; defaultValue?: string | null; className?: string }) {
  return (
    <label className={`field ${className}`}><span className="label">{label}</span>
      <select name={name} defaultValue={defaultValue ?? undefined} className="select !min-h-10 !py-2 text-sm">{options.map((o) => { const [v, l] = Array.isArray(o) ? o : [o, o]; return <option key={v} value={v}>{l}</option>; })}</select>
    </label>
  );
}

export function Check({ label, name, defaultChecked }: { label: string; name: string; defaultChecked?: boolean }) {
  return <label className="flex items-center gap-2 text-sm"><input type="checkbox" name={name} defaultChecked={defaultChecked} className="accent-[var(--accent)]" />{label}</label>;
}

export function Btn({ children, tone = "primary", name, value }: { children: React.ReactNode; tone?: "primary" | "outline" | "danger" | "ghost"; name?: string; value?: string }) {
  const cls = { primary: "btn btn-primary btn-sm", outline: "btn btn-outline btn-sm", danger: "btn btn-sm bg-danger text-white", ghost: "btn btn-ghost btn-sm" }[tone];
  return <button className={cls} name={name} value={value}>{children}</button>;
}
