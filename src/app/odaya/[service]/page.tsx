import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { B2B_SERVICES } from "@/lib/b2b";

type P = { params: Promise<{ service: string }> };
const find = (slug: string) => B2B_SERVICES.find((s) => s.slug === slug);

export function generateStaticParams() { return B2B_SERVICES.map((s) => ({ service: s.slug })); }

export async function generateMetadata({ params }: P): Promise<Metadata> {
  const s = find((await params).service);
  return s ? { title: s.name, description: s.short } : {};
}

const DETAIL: Record<string, string[]> = {
  "private-label": ["Choose from our library of stock scents", "Standard glass, pumps and cartons for fast, compliant launches", "Your branding, with labels prepared to Legal Metrology requirements", "IFRA documentation for each scent"],
  "fragrance-development": ["A written brief, then rounds of modifications", "Exclusivity or formula escrow agreed by contract", "IFRA file and allergen review", "Development can run alongside packaging"],
  "contract-manufacturing": ["Blending, filling, QC and packing under our quality system", "Flame-safe, zoned production with a QC lab", "Batch records and certificates of analysis", "Dangerous-goods (UN1266) compliant dispatch"],
  "contract-filling": ["Filling, crimping, capping and packing of your juice", "Materials supplied by you or sourced by us at pass-through cost", "In-process QC and batch records", "Indicative minimum run: 1,000 units"],
  "commercial-scenting": ["Signature scent design for your venue", "Diffusion machines, oils and service visits on a monthly fee", "Route-planned technician visits", "Indicative minimum contract: 12 months"],
  "corporate-gifting": ["Curated kits from across our houses", "Personalisation and engraving", "Gift-ready packing and multi-address dispatch", "Indicative minimum order: 50 kits"],
  "wedding-gifting": ["Kits for haldi, mehendi, sangeet and reception", "Personalised cards and engraving", "Coordination with your planner", "Indicative minimum order: 50 kits"],
  "bulk-accords": ["Indian accords from the Odaya library", "Sold by the kilogram for perfumers and attar makers", "IFRA documentation", "Indicative minimum order: 5 kg"],
};

export default async function ServicePage({ params }: P) {
  const { service } = await params;
  const s = find(service);
  if (!s) notFound();
  return (
    <>
      <section className="border-b border-line bg-surface">
        <div className="container-x py-16 md:py-24">
          <Link href="/odaya/capabilities" className="font-mono text-xs uppercase tracking-widest text-accent">← Capabilities</Link>
          <h1 className="display mt-4 text-5xl md:text-6xl">{s.name}</h1>
          <p className="lede mt-5">{s.short}</p>
          <div className="mt-8 flex flex-wrap gap-3"><Link href={`/odaya/quote?service=${s.key}`} className="btn btn-accent">Request a quote</Link><Link href={`/odaya/sample?service=${s.key}`} className="btn btn-outline">Request a sample</Link></div>
        </div>
      </section>
      <section className="container-x grid gap-12 py-16 md:grid-cols-[1.4fr_1fr]">
        <div>
          <h2 className="text-2xl font-semibold">What's included</h2>
          <ul className="mt-6 grid gap-3">{(DETAIL[s.slug] ?? []).map((d) => <li key={d} className="flex gap-3 border-b border-line pb-3"><span className="font-mono text-accent">→</span>{d}</li>)}</ul>
        </div>
        <dl className="card grid gap-4 p-6 font-mono text-sm">
          <div><dt className="text-xs text-muted">Typical customer</dt><dd className="mt-1">{s.customer}</dd></div>
          <div><dt className="text-xs text-muted">Offer</dt><dd className="mt-1">{s.offer}</dd></div>
          <div><dt className="text-xs text-muted">Pricing model</dt><dd className="mt-1">{s.pricing}</dd></div>
          <div><dt className="text-xs text-muted">Minimum</dt><dd className="mt-1">{s.minimum}</dd></div>
          <div><dt className="text-xs text-muted">Typical cycle</dt><dd className="mt-1">{s.cycle}</dd></div>
          <p className="text-xs text-muted">Indicative terms. Final terms are confirmed in a written quotation.</p>
        </dl>
      </section>
    </>
  );
}
