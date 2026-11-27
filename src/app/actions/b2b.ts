"use server";
import { EnquirySchema, submitEnquiry } from "@/lib/b2b";
import { clientIp } from "@/lib/auth";
import { rateLimit } from "@/lib/rate-limit";
import { saveUpload } from "@/lib/uploads";
import { AppError, log } from "@/lib/logger";
import { formObject, zodErrors, type FormState } from "@/lib/form-state";

export async function submitB2BEnquiry(_: FormState, fd: FormData): Promise<FormState> {
  if (!rateLimit(`b2b:${await clientIp()}`, 6, 3600_000).ok) return { ok: false, message: "Too many submissions from this network. Please try again later." };
  const raw = formObject(fd);
  const parsed = EnquirySchema.safeParse({ ...raw, consent: raw.consent === "on" });
  if (!parsed.success) return { ok: false, errors: zodErrors(parsed.error), data: raw, message: "Please check the highlighted fields." };
  try {
    const attachments = [];
    const file = fd.get("attachment");
    if (file instanceof File && file.size > 0) {
      const saved = await saveUpload(file, { allow: ["DOC", "IMAGE"], maxBytes: 8 * 1024 * 1024, folder: "b2b" });
      attachments.push({ fileName: file.name.slice(0, 120), url: saved.url, mimeType: saved.mimeType, bytes: saved.bytes });
    }
    const enquiry = await submitEnquiry(parsed.data, attachments);
    return { ok: true, message: `Thank you. Your reference is ${enquiry.number}. A specialist will contact you.`, data: { number: enquiry.number } };
  } catch (e) {
    if (e instanceof AppError) return { ok: false, message: e.message, data: raw };
    log.error("b2b enquiry failed", { error: e });
    return { ok: false, message: "We couldn't submit your enquiry. Please try again.", data: raw };
  }
}
