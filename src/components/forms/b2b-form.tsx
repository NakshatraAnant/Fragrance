"use client";
import { useActionState } from "react";
import { submitB2BEnquiry } from "@/app/actions/b2b";
import { Field, FormMessage, SelectField, Submit, TextArea } from "./fields";

const SERVICES: [string, string][] = [["PRIVATE_LABEL", "Private label"], ["FRAGRANCE_DEVELOPMENT", "Fragrance development"], ["CONTRACT_MANUFACTURING", "Contract manufacturing"], ["CONTRACT_FILLING", "Contract filling"], ["BULK_ACCORDS", "Bulk accords"], ["COMMERCIAL_SCENTING", "Commercial scenting"], ["CORPORATE_GIFTING", "Corporate gifting"], ["WEDDING_GIFTING", "Wedding gifting"], ["OTHER", "Something else"]];

export function B2BForm({ kind, service }: { kind: "RFQ" | "SAMPLE" | "GENERAL"; service?: string }) {
  const [state, action] = useActionState(submitB2BEnquiry, null);
  if (state?.ok) return <div className="card p-8" data-testid="b2b-success"><p className="text-xl font-semibold">Enquiry received</p><div className="mt-3"><FormMessage state={state} /></div></div>;
  return (
    <form action={action} className="grid gap-5 md:grid-cols-2" noValidate data-testid="b2b-form">
      <input type="hidden" name="kind" value={kind} />
      <SelectField name="service" label="Service" required state={state} options={SERVICES} defaultValue={(state?.data?.service as string) ?? service ?? "PRIVATE_LABEL"} className="md:col-span-2" />
      <Field name="companyName" label="Company" required state={state} autoComplete="organization" />
      <Field name="industry" label="Industry" state={state} placeholder="Beauty, hospitality, retail…" />
      <Field name="website" label="Website" state={state} placeholder="https://" />
      <Field name="city" label="City" state={state} />
      <Field name="gstin" label="GSTIN (optional)" state={state} />
      <Field name="name" label="Your name" required state={state} autoComplete="name" />
      <Field name="designation" label="Designation" state={state} />
      <Field name="email" label="Work email" type="email" required state={state} autoComplete="email" />
      <Field name="phone" label="Phone" type="tel" state={state} autoComplete="tel" />
      {kind !== "GENERAL" && <Field name="quantity" label={kind === "SAMPLE" ? "Samples needed" : "Estimated volume"} state={state} placeholder={kind === "SAMPLE" ? "e.g. 3 stock scents" : "e.g. 2,000 units / quarter"} />}
      {kind === "RFQ" && <Field name="budget" label="Target budget (optional)" state={state} />}
      {kind === "RFQ" && <Field name="timeline" label="Timeline" state={state} placeholder="e.g. launch in Q3" />}
      {kind === "SAMPLE" && <TextArea name="sampleAddress" label="Delivery address for samples" state={state} className="md:col-span-2" />}
      <TextArea name="summary" label={kind === "RFQ" ? "Your requirement" : kind === "SAMPLE" ? "What would you like to evaluate?" : "How can we help?"} required state={state} className="md:col-span-2" placeholder="Product type, format, scent direction, packaging, compliance needs…" />
      <div className="field md:col-span-2"><label htmlFor="f-attachment" className="label">Attach a brief (PDF, JPG, PNG or WebP · max 8 MB)</label><input id="f-attachment" name="attachment" type="file" accept="application/pdf,image/jpeg,image/png,image/webp" className="text-sm" /></div>
      <label className="flex items-start gap-2 text-sm md:col-span-2"><input type="checkbox" name="consent" className="mt-0.5 accent-[var(--accent)]" /> I agree that Odaya Fragrance Works may contact me about this enquiry.</label>
      {state?.errors?.consent && <p className="error-text md:col-span-2">{state.errors.consent}</p>}
      <div className="md:col-span-2 grid gap-3"><FormMessage state={state} /><Submit className="btn btn-accent">{kind === "RFQ" ? "Submit request for quote" : kind === "SAMPLE" ? "Request samples" : "Send enquiry"}</Submit></div>
    </form>
  );
}
