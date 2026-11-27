"use server";
import { revalidatePath } from "next/cache";
import { z } from "zod";
import { db } from "@/lib/db";
import { requireUser, clientIp } from "@/lib/auth";
import { recordConsent } from "@/lib/messaging";
import { INDIAN_STATES, PINCODE_RE } from "@/lib/shipping";
import { formObject, zodErrors, type FormState } from "@/lib/form-state";
import { audit } from "@/lib/audit";

const Address = z.object({
  label: z.string().trim().max(40).optional(),
  name: z.string().trim().min(2, "Enter a name.").max(100),
  phone: z.string().trim().regex(/^(\+91[\s-]?)?[6-9]\d{9}$/, "Enter a valid Indian mobile number."),
  line1: z.string().trim().min(3, "Enter the address.").max(200),
  line2: z.string().trim().max(200).optional(),
  landmark: z.string().trim().max(120).optional(),
  city: z.string().trim().min(2, "Enter the city.").max(80),
  state: z.string().refine((s) => INDIAN_STATES.includes(s), "Choose a state."),
  pincode: z.string().trim().regex(PINCODE_RE, "Enter a valid 6-digit PIN code."),
});

export async function saveAddress(_: FormState, fd: FormData): Promise<FormState> {
  const user = await requireUser("/account/addresses");
  const raw = formObject(fd);
  const p = Address.safeParse(raw);
  if (!p.success) return { ok: false, errors: zodErrors(p.error), data: raw };
  const count = await db.address.count({ where: { userId: user.id } });
  if (count >= 10) return { ok: false, message: "You can save up to 10 addresses." };
  await db.address.create({ data: { ...p.data, label: p.data.label || null, line2: p.data.line2 || null, landmark: p.data.landmark || null, userId: user.id, isDefault: count === 0 } });
  revalidatePath("/account/addresses");
  return { ok: true, message: "Address saved." };
}

export async function deleteAddress(fd: FormData) {
  const user = await requireUser();
  await db.address.deleteMany({ where: { id: String(fd.get("id")), userId: user.id } });
  revalidatePath("/account/addresses");
}

export async function makeDefaultAddress(fd: FormData) {
  const user = await requireUser();
  const id = String(fd.get("id"));
  await db.$transaction([db.address.updateMany({ where: { userId: user.id }, data: { isDefault: false } }), db.address.updateMany({ where: { id, userId: user.id }, data: { isDefault: true } })]);
  revalidatePath("/account/addresses");
}

export async function savePreferences(_: FormState, fd: FormData): Promise<FormState> {
  const user = await requireUser("/account/preferences");
  const ip = await clientIp();
  const raw = formObject(fd);
  const families = fd.getAll("families").map(String).slice(0, 16).join(",");
  const disliked = String(raw.disliked ?? "").split(",").map((s) => s.trim().toLowerCase().replace(/\s+/g, "-")).filter(Boolean).slice(0, 20).join(",");
  const birthday = raw.birthday ? new Date(raw.birthday) : null;
  await db.user.update({ where: { id: user.id }, data: { name: raw.name?.trim() || user.name, phone: raw.phone?.trim() || null, birthday: birthday && !isNaN(+birthday) ? birthday : null } });
  await db.customerPreference.upsert({
    where: { userId: user.id },
    update: { favouriteFamilies: families, dislikedNotes: disliked, profilingConsent: raw.profiling === "on" },
    create: { userId: user.id, favouriteFamilies: families, dislikedNotes: disliked, profilingConsent: raw.profiling === "on" },
  });
  // Consent is append-only: record a new entry only when it changes.
  for (const [channel, field] of [["EMAIL", "emailConsent"], ["WHATSAPP", "whatsappConsent"]] as const) {
    const want = raw[field] === "on";
    const last = await db.marketingConsent.findFirst({ where: { userId: user.id, channel }, orderBy: { createdAt: "desc" } });
    if ((last?.granted ?? false) !== want) await recordConsent({ userId: user.id, email: user.email, phone: raw.phone || user.phone, channel, granted: want, source: "account", ip });
  }
  revalidatePath("/account/preferences");
  return { ok: true, message: "Preferences saved." };
}

export async function requestDataAction(fd: FormData) {
  const user = await requireUser("/account/preferences");
  const type = fd.get("type") === "DELETION" ? "DELETION" : "EXPORT";
  const open = await db.dataRequest.findFirst({ where: { userId: user.id, type, status: "REQUESTED" } });
  if (!open) await db.dataRequest.create({ data: { userId: user.id, type } });
  await audit(user.id, `data_request.${type.toLowerCase()}`, "User", user.id);
  revalidatePath("/account/preferences");
}

export async function unsaveLayering(fd: FormData) {
  const user = await requireUser();
  await db.savedLayering.deleteMany({ where: { userId: user.id, pairId: String(fd.get("pairId")) } });
  revalidatePath("/account/wardrobe");
}
