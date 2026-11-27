import type { Metadata } from "next";
import { B2BForm } from "@/components/forms/b2b-form";

export const metadata: Metadata = { title: "Contact Odaya" };

export default async function Page({ searchParams }: { searchParams: Promise<{ service?: string }> }) {
  const { service } = await searchParams;
  return (
    <section className="container-x max-w-4xl py-16">
      <p className="font-mono text-xs uppercase tracking-widest text-accent">Odaya · Contact Odaya</p>
      <h1 className="display mt-3 text-5xl">Contact Odaya</h1>
      <p className="lede mt-4">Write to our business team. For consumer orders, please use the Vasana House customer support page.</p>
      <div className="mt-10"><B2BForm kind="GENERAL" service={service} /></div>
    </section>
  );
}
