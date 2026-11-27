import type { Metadata } from "next";
import { B2BForm } from "@/components/forms/b2b-form";

export const metadata: Metadata = { title: "Request a sample" };

export default async function Page({ searchParams }: { searchParams: Promise<{ service?: string }> }) {
  const { service } = await searchParams;
  return (
    <section className="container-x max-w-4xl py-16">
      <p className="font-mono text-xs uppercase tracking-widest text-accent">Odaya · Request a sample</p>
      <h1 className="display mt-3 text-5xl">Request a sample</h1>
      <p className="lede mt-4">Evaluate stock scents or Odaya accords. Tell us what you want to test and where to send it.</p>
      <div className="mt-10"><B2BForm kind="SAMPLE" service={service} /></div>
    </section>
  );
}
