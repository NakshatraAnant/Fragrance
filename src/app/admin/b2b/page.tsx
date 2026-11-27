import Link from "next/link";
import { db } from "@/lib/db";
import { requireStaff } from "@/lib/auth";
import { B2B_STAGES, B2B_SERVICES } from "@/lib/b2b";
import { formatDate } from "@/lib/money";
import { AdminHeader, Pill, Stat } from "@/components/admin/ui";

export default async function B2BPipeline({ searchParams }: { searchParams: Promise<{ service?: string }> }) {
  await requireStaff("b2b:read", "/admin/b2b");
  const sp = await searchParams;
  const [enquiries, overdue] = await Promise.all([
    db.b2BEnquiry.findMany({ where: sp.service ? { service: sp.service } : {}, include: { account: true, contact: true, owner: { select: { name: true, email: true } } }, orderBy: { updatedAt: "desc" } }),
    db.b2BActivity.count({ where: { dueAt: { lt: new Date() }, doneAt: null } }),
  ]);
  const svc = (k: string) => B2B_SERVICES.find((s) => s.key === k)?.name ?? k;
  return (
    <>
      <AdminHeader title="Odaya B2B pipeline" sub="Lead → Qualification → Brief → Sample → Proposal → Onboarding → Repeat business. Firewalled from consumer data.">
        <form className="flex gap-2"><select name="service" defaultValue={sp.service ?? ""} className="select !min-h-9 w-auto !py-1 text-sm"><option value="">All services</option>{B2B_SERVICES.map((s) => <option key={s.key} value={s.key}>{s.name}</option>)}</select><button className="btn btn-outline btn-sm">Filter</button></form>
      </AdminHeader>
      <div className="mb-6 grid grid-cols-2 gap-3 md:grid-cols-4">
        <Stat label="Open enquiries" value={enquiries.filter((e) => !["LOST", "REPEAT_BUSINESS"].includes(e.stage)).length} />
        <Stat label="RFQs" value={enquiries.filter((e) => e.kind === "RFQ").length} /><Stat label="Sample requests" value={enquiries.filter((e) => e.kind === "SAMPLE").length} />
        <Stat label="Overdue follow-ups" value={overdue} />
      </div>
      <div className="no-scrollbar flex gap-3 overflow-x-auto pb-4" data-testid="b2b-board">
        {B2B_STAGES.map((stage) => {
          const list = enquiries.filter((e) => e.stage === stage);
          return (
            <div key={stage} className="w-72 shrink-0 rounded-lg bg-surface-2 p-3">
              <p className="mb-2 flex justify-between text-xs font-semibold uppercase tracking-wider text-muted"><span>{stage.replace("_", " ")}</span><span>{list.length}</span></p>
              <ul className="grid gap-2">
                {list.map((e) => (
                  <li key={e.id}><Link href={`/admin/b2b/${e.id}`} className="card block p-3 text-sm hover:border-ink">
                    <p className="font-semibold">{e.account.companyName}</p><p className="text-xs text-muted">{svc(e.service)} · {e.kind}</p>
                    <p className="mt-1 line-clamp-2 text-xs">{e.summary}</p>
                    <p className="mt-2 flex justify-between text-[11px] text-muted"><span className="font-mono">{e.number}</span><span>{e.owner?.name ?? e.owner?.email ?? "unassigned"} · {formatDate(e.updatedAt)}</span></p>
                  </Link></li>
                ))}
                {list.length === 0 && <li className="text-xs text-muted">—</li>}
              </ul>
            </div>
          );
        })}
      </div>
      {enquiries.length === 0 && <p className="text-sm text-muted">No enquiries yet. Submissions from <Link href="/odaya/quote" className="underline">/odaya</Link> forms appear here.</p>}
      <p className="mt-2 text-xs text-muted"><Pill>Tip</Pill> Open an enquiry to move its stage, log calls, add briefs, track samples and issue quotations.</p>
    </>
  );
}
