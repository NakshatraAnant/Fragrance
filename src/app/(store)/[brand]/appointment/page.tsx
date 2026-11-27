import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { PageHeader } from "@/components/listing/listing";
import { AppointmentForm } from "@/components/forms/appointment-form";

export const metadata: Metadata = { title: "Private appointment — Anvaya", description: "Request a private Anvaya appointment with a client advisor." };

export default async function AppointmentPage({ params }: { params: Promise<{ brand: string }> }) {
  if ((await params).brand !== "anvaya") notFound();
  return (
    <>
      <PageHeader eyebrow="Anvaya · Clienteling" title="A private appointment" intro="Tell us where and when suits you. A client advisor will confirm by email. Salons are planned inside our Vasana flagships, and none is open yet, so we'll confirm availability when we reply." crumbs={[{ name: "Anvaya", href: "/anvaya" }, { name: "Appointment", href: "/anvaya/appointment" }]} />
      <section className="container-x max-w-2xl pb-16"><AppointmentForm /></section>
    </>
  );
}
