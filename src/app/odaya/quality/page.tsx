import type { Metadata } from "next";
import Link from "next/link";

export const metadata: Metadata = { title: "Quality & compliance" };

const ITEMS = [
  ["IFRA conformity", "An IFRA certificate for every compound we supply or fill. It is necessary but not sufficient."],
  ["Allergen disclosure", "Labels designed to the IS 4707 (Part 2): 2025 fragrance-allergen disclosure thresholds."],
  ["Safety & stability files", "A safety assessment and stability testing for each SKU before release."],
  ["Legal Metrology labelling", "Net quantity, MRP and manufacturer declarations under the Packaged Commodities Rules."],
  ["Batch genealogy", "Lot tracking from raw material to finished goods, with batch records and certificates of analysis."],
  ["Flammable goods handling", "Flame-safe zoned facility, separate flammable storage, and UN1266 dispatch."],
  ["Formula ownership", "Exclusivity or formula escrow is agreed in writing for custom developments."],
  ["Supplier qualification", "A weighted scorecard, due diligence and a sample-approval gate before any purchase order."],
];

export default function QualityPage() {
  return (
    <section className="container-x py-16">
      <p className="font-mono text-xs uppercase tracking-widest text-accent">Odaya · Quality</p>
      <h1 className="display mt-3 text-5xl">Quality & compliance</h1>
      <p className="lede mt-4">This is our quality framework. Where a certification or licence is in progress, we say so in your quotation. We never claim an approval we don't hold.</p>
      <div className="mt-10 grid gap-4 md:grid-cols-2">{ITEMS.map(([t, d]) => <div key={t} className="card p-6"><p className="font-semibold">{t}</p><p className="mt-2 text-sm text-muted">{d}</p></div>)}</div>
      <Link href="/odaya/enquiry" className="btn btn-accent mt-10">Request documentation</Link>
    </section>
  );
}
