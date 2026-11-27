import type { Metadata } from "next";
import { B2BForm } from "@/components/forms/b2b-form";

export const metadata: Metadata = { title: "Request a quote" };

export default async function Page({ searchParams }: { searchParams: Promise<{ service?: string }> }) {
  const { service } = await searchParams;
  return (
    <section className="container-x max-w-4xl py-16">
      <p className="font-mono text-xs uppercase tracking-widest text-accent">Odaya · Request a quote</p>
      <h1 className="display mt-3 text-5xl">Request a quote</h1>
      <p className="lede mt-4">Share volumes, formats and timelines. We confirm commercial terms in a written quotation.</p>
      <div className="mt-10"><B2BForm kind="RFQ" service={service} /></div>
    </section>
  );
}
