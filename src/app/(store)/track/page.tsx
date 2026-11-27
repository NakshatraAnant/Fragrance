import type { Metadata } from "next";
import { PageHeader } from "@/components/listing/listing";
import { TrackForm } from "@/components/forms/track-form";

export const metadata: Metadata = { title: "Track an order" };

export default async function TrackPage({ searchParams }: { searchParams: Promise<{ order?: string }> }) {
  const { order } = await searchParams;
  return (
    <>
      <PageHeader eyebrow="Help" title="Track an order" intro="Enter your order number and the email you used at checkout." crumbs={[{ name: "Track an order", href: "/track" }]} />
      <section className="container-x max-w-xl pb-16"><TrackForm initialNumber={order ?? ""} /></section>
    </>
  );
}
