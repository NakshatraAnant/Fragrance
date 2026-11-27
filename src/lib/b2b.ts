/**
 * Odaya Fragrance Works — B2B lifecycle. Data lives in B2B* tables only and is accessible only to
 * staff with b2b:* permissions. Consumer roles cannot read it (and Odaya staff cannot read consumer data).
 * LEAD → QUALIFICATION → BRIEF → SAMPLE → PROPOSAL → ONBOARDING → REPEAT_BUSINESS (or LOST)
 */
import { z } from "zod";
import { db } from "./db";
import { randomToken } from "./password";
import { sendTemplate } from "./messaging";
import { recordServerEvent } from "./analytics";

export const B2B_STAGES = ["LEAD", "QUALIFICATION", "BRIEF", "SAMPLE", "PROPOSAL", "ONBOARDING", "REPEAT_BUSINESS", "LOST"] as const;

export const B2B_SERVICES: { key: string; slug: string; name: string; short: string; pricing: string; minimum: string; cycle: string; customer: string; offer: string }[] = [
  { key: "PRIVATE_LABEL", slug: "private-label", name: "Private Label", short: "Launch a compliant fragrance line quickly from our stock-scent library.", pricing: "Per unit, tiered by volume", minimum: "500 units per scent (indicative)", cycle: "4–8 weeks", customer: "Emerging brands, salons, retailers", offer: "24 stock scents, standard packs" },
  { key: "FRAGRANCE_DEVELOPMENT", slug: "fragrance-development", name: "Fragrance Development", short: "A unique scent identity developed from your brief, with an IFRA file.", pricing: "Development fee + per-kg compound price", minimum: "Agreed annual volume", cycle: "3–6 months", customer: "Consumer brands, hotels", offer: "Brief, modifications, IFRA documentation" },
  { key: "CONTRACT_MANUFACTURING", slug: "contract-manufacturing", name: "Contract Manufacturing", short: "Blending, filling, QC and packing under our quality system.", pricing: "Per unit, by specification", minimum: "By specification", cycle: "Project-based", customer: "Brands needing licensed capacity", offer: "End-to-end manufacturing under our QA" },
  { key: "CONTRACT_FILLING", slug: "contract-filling", name: "Contract Filling", short: "Filling, crimping and packing for brands with their own juice.", pricing: "Per-unit filling fee + materials pass-through", minimum: "1,000 units per run (indicative)", cycle: "4–6 weeks", customer: "Brands with their own juice", offer: "Filling, crimping, packing" },
  { key: "COMMERCIAL_SCENTING", slug: "commercial-scenting", name: "Commercial Scenting", short: "Signature ambience for hotels, retail, offices and malls.", pricing: "Monthly fee per venue (machine + refills + service)", minimum: "12-month contract (indicative)", cycle: "1–3 months", customer: "Hotels, retail, offices, malls", offer: "Machines, oils, service" },
  { key: "CORPORATE_GIFTING", slug: "corporate-gifting", name: "Corporate Gifting", short: "Considered fragrance gifts for teams, clients and events.", pricing: "Per kit, tiered", minimum: "50 kits (indicative)", cycle: "2–6 weeks", customer: "Corporates", offer: "Curated kits, personalisation" },
  { key: "WEDDING_GIFTING", slug: "wedding-gifting", name: "Wedding Gifting", short: "Curated kits for weddings, sangeets and family celebrations.", pricing: "Per kit, tiered", minimum: "50 kits (indicative)", cycle: "2–6 weeks", customer: "Families and wedding planners", offer: "Curated kits, engraving" },
  { key: "BULK_ACCORDS", slug: "bulk-accords", name: "Bulk Accords", short: "Indian accords from the Odaya library, by the kilogram.", pricing: "Per kg", minimum: "5 kg (indicative)", cycle: "2–4 weeks", customer: "Perfumers, attar makers", offer: "Odaya accord library" },
];

export const EnquirySchema = z.object({
  kind: z.enum(["RFQ", "SAMPLE", "GENERAL"]),
  service: z.enum(["PRIVATE_LABEL", "FRAGRANCE_DEVELOPMENT", "CONTRACT_MANUFACTURING", "CONTRACT_FILLING", "BULK_ACCORDS", "COMMERCIAL_SCENTING", "CORPORATE_GIFTING", "WEDDING_GIFTING", "OTHER"]),
  companyName: z.string().trim().min(2, "Enter your company name.").max(160),
  gstin: z.string().trim().toUpperCase().regex(/^[0-9]{2}[A-Z]{5}[0-9]{4}[A-Z][1-9A-Z]Z[0-9A-Z]$/, "Enter a valid GSTIN or leave it blank.").optional().or(z.literal("")),
  industry: z.string().trim().max(80).optional().or(z.literal("")),
  website: z.string().trim().max(200).optional().or(z.literal("")),
  city: z.string().trim().max(80).optional().or(z.literal("")),
  name: z.string().trim().min(2, "Enter your name.").max(100),
  email: z.string().trim().toLowerCase().email("Enter a valid work email."),
  phone: z.string().trim().max(20).optional().or(z.literal("")),
  designation: z.string().trim().max(80).optional().or(z.literal("")),
  summary: z.string().trim().min(10, "Tell us a little about what you need (10+ characters).").max(4000),
  quantity: z.string().trim().max(80).optional().or(z.literal("")),
  budget: z.string().trim().max(80).optional().or(z.literal("")),
  timeline: z.string().trim().max(80).optional().or(z.literal("")),
  sampleAddress: z.string().trim().max(400).optional().or(z.literal("")),
  consent: z.literal(true, { error: "Please agree to be contacted about this enquiry." }),
});
export type EnquiryInput = z.infer<typeof EnquirySchema>;

export async function submitEnquiry(input: EnquiryInput, attachments: { fileName: string; url: string; mimeType: string; bytes: number }[] = []) {
  const domain = input.email.split("@")[1];
  let account = await db.b2BAccount.findFirst({ where: { companyName: input.companyName } });
  if (!account) account = await db.b2BAccount.create({ data: { companyName: input.companyName, gstin: input.gstin || null, industry: input.industry || null, website: input.website || (domain ? `https://${domain}` : null), city: input.city || null } });
  const contact = await db.b2BContact.upsert({
    where: { accountId_email: { accountId: account.id, email: input.email } },
    update: { name: input.name, phone: input.phone || null, designation: input.designation || null },
    create: { accountId: account.id, name: input.name, email: input.email, phone: input.phone || null, designation: input.designation || null },
  });
  const number = `OD-${new Date().getFullYear()}-${randomToken(4).replace(/[^A-Za-z0-9]/g, "").toUpperCase().slice(0, 5).padEnd(5, "0")}`;
  const enquiry = await db.b2BEnquiry.create({
    data: {
      number, accountId: account.id, contactId: contact.id, kind: input.kind, service: input.service, summary: input.summary,
      quantity: input.quantity || null, budget: input.budget || null, timeline: input.timeline || null, details: JSON.stringify({ sampleAddress: input.sampleAddress || null }),
      activities: { create: { type: "NOTE", body: `Enquiry received via website (${input.kind}).` } },
      ...(input.kind === "SAMPLE" ? { samples: { create: { description: input.summary.slice(0, 300) } } } : {}),
      ...(attachments.length ? { attachments: { create: attachments } } : {}),
    },
  });
  const svc = B2B_SERVICES.find((s) => s.key === input.service)?.name ?? "Other";
  await sendTemplate("B2B_ENQUIRY_RECEIVED", "EMAIL", { email: input.email }, { name: input.name, kind: input.kind === "RFQ" ? "request for quote" : input.kind === "SAMPLE" ? "sample request" : "enquiry", service: svc, number });
  await recordServerEvent("b2b_enquiry", { props: { kind: input.kind, service: input.service } });
  return enquiry;
}
