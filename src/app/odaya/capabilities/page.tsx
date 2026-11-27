import type { Metadata } from "next";
import Link from "next/link";
import { B2B_SERVICES } from "@/lib/b2b";
import { db } from "@/lib/db";

export const metadata: Metadata = { title: "Capabilities" };
export const dynamic = "force-dynamic";

export default async function Capabilities() {
  const docs = await db.b2BDocument.findMany({ where: { isPublic: true }, orderBy: { createdAt: "desc" } });
  return (
    <section className="container-x py-16">
      <p className="font-mono text-xs uppercase tracking-widest text-accent">Odaya · Capabilities</p>
      <h1 className="display mt-3 text-5xl">What we do</h1>
      <div className="mt-10 overflow-x-auto">
        <table className="w-full min-w-[48rem] text-left text-sm">
          <thead className="font-mono text-xs uppercase text-muted"><tr><th className="py-3">Service</th><th>Customer</th><th>Pricing</th><th>Minimum*</th><th>Cycle*</th></tr></thead>
          <tbody className="divide-y divide-line">
            {B2B_SERVICES.map((s) => <tr key={s.slug}><td className="py-4"><Link href={`/odaya/${s.slug}`} className="font-semibold hover:text-accent">{s.name}</Link><p className="text-muted">{s.short}</p></td><td>{s.customer}</td><td>{s.pricing}</td><td>{s.minimum}</td><td>{s.cycle}</td></tr>)}
          </tbody>
        </table>
      </div>
      <p className="mt-4 font-mono text-xs text-muted">* Indicative. Odaya prices by service, not by bottle. Terms are confirmed in a written quotation.</p>
      <div className="mt-14">
        <h2 className="text-2xl font-semibold">Documents</h2>
        {docs.length === 0 ? <p className="mt-2 text-muted">Capability documents and specification sheets are available on request. <Link href="/odaya/enquiry" className="underline">Ask our team</Link>.</p> : <ul className="mt-3 grid gap-2">{docs.map((d) => <li key={d.id}><a href={d.url} className="underline" download>{d.title}</a> <span className="text-sm text-muted">— {d.description}</span></li>)}</ul>}
      </div>
    </section>
  );
}
