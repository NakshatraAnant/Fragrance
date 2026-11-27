import type { Metadata } from "next";
import { B2BForm } from "@/components/forms/b2b-form";

export const metadata: Metadata = { title: "Business enquiry" };

export default async function Page({ searchParams }: { searchParams: Promise<{ service?: string }> }) {
  const { service } = await searchParams;
  return (
    <section className="container-x max-w-4xl py-16">
      <p className="font-mono text-xs uppercase tracking-widest text-accent">Odaya · Business enquiry</p>
      <h1 className="display mt-3 text-5xl">Business enquiry</h1>
      <p className="lede mt-4">Partnerships, commercial scenting, gifting or anything else. A specialist will respond.</p>
      <div className="mt-10"><B2BForm kind="GENERAL" service={service} /></div>
    </section>
  );
}
