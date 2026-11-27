import Link from "next/link";
import { B2B_SERVICES } from "@/lib/b2b";

const LIFECYCLE = ["Lead", "Qualification", "Brief", "Sample", "Proposal", "Onboarding", "Repeat business"];

export default function OdayaHome() {
  return (
    <>
      <section className="border-b border-line bg-surface">
        <div className="container-x grid gap-12 py-20 md:grid-cols-[1.3fr_1fr] md:items-center md:py-28">
          <div>
            <p className="font-mono text-xs uppercase tracking-widest text-accent">B2B · Made in India</p>
            <h1 className="display mt-5 text-5xl md:text-7xl">Fragrance, engineered for your brand.</h1>
            <p className="lede mt-6">Odaya Fragrance Works develops, manufactures and fills fragrance for brands, hotels, retailers and corporates. It runs on a documented quality system and a library of Indian accords.</p>
            <div className="mt-9 flex flex-wrap gap-3"><Link href="/odaya/quote" className="btn btn-accent">Request a quote</Link><Link href="/odaya/capabilities" className="btn btn-outline">Explore capabilities</Link></div>
          </div>
          <dl className="grid grid-cols-2 gap-px overflow-hidden rounded-[var(--radius)] border border-line bg-line font-mono text-sm">
            {[["Private label MOQ", "500 units / scent*"], ["Contract filling MOQ", "1,000 units / run*"], ["Development cycle", "3–6 months*"], ["Gifting MOQ", "50 kits*"]].map(([k, v]) => <div key={k} className="bg-surface p-5"><dt className="text-xs text-muted">{k}</dt><dd className="mt-2 text-lg font-semibold">{v}</dd></div>)}
          </dl>
        </div>
        <p className="container-x pb-6 font-mono text-xs text-muted">* Indicative figures, to be confirmed per project in a written quotation.</p>
      </section>
      <section className="container-x py-20">
        <h2 className="display text-4xl">Capabilities</h2>
        <div className="mt-10 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {B2B_SERVICES.map((s, i) => (
            <Link key={s.slug} href={`/odaya/${s.slug}`} className="group card flex flex-col p-6 transition hover:border-accent">
              <span className="font-mono text-xs text-muted">{String(i + 1).padStart(2, "0")}</span>
              <span className="mt-3 text-lg font-semibold group-hover:text-accent">{s.name}</span>
              <span className="mt-2 text-sm text-muted">{s.short}</span>
            </Link>
          ))}
        </div>
      </section>
      <section className="border-y border-line bg-surface py-20">
        <div className="container-x">
          <h2 className="display text-4xl">How we work together</h2>
          <ol className="mt-10 grid gap-3 md:grid-cols-7">
            {LIFECYCLE.map((s, i) => <li key={s} className="rounded-[var(--radius)] border border-line p-4"><span className="font-mono text-xs text-accent">{String(i + 1).padStart(2, "0")}</span><p className="mt-2 font-semibold">{s}</p></li>)}
          </ol>
          <p className="mt-6 max-w-2xl text-sm text-muted">Every enquiry gets a reference number and an owner. A specialist qualifies your brief, prepares samples and sends a written proposal. Accounts we onboard get a named account manager.</p>
        </div>
      </section>
      <section className="container-x grid gap-6 py-20 md:grid-cols-3">
        <Link href="/odaya/quote" className="card p-8 transition hover:border-accent"><p className="text-xl font-semibold">Request a quote</p><p className="mt-2 text-sm text-muted">Volumes, specifications and timelines.</p></Link>
        <Link href="/odaya/sample" className="card p-8 transition hover:border-accent"><p className="text-xl font-semibold">Request a sample</p><p className="mt-2 text-sm text-muted">Stock scents or accords for evaluation.</p></Link>
        <Link href="/odaya/enquiry" className="card p-8 transition hover:border-accent"><p className="text-xl font-semibold">General enquiry</p><p className="mt-2 text-sm text-muted">Partnerships, scenting and anything else.</p></Link>
      </section>
    </>
  );
}
