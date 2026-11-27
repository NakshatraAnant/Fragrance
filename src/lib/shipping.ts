import { db } from "./db";
import { IST } from "./money";

export const PINCODE_RE = /^[1-9][0-9]{5}$/;

export type DeliveryEstimate =
  | { ok: true; serviceable: true; pincode: string; region: string; minDays: number; maxDays: number; codAllowed: boolean; label: string; source: string }
  | { ok: true; serviceable: false; pincode: string; message: string }
  | { ok: false; message: string };

export function isValidPincode(p: string) {
  return PINCODE_RE.test(p.trim());
}

/** Adds business days (Mon–Sat; Sunday excluded) in IST. */
export function addBusinessDays(from: Date, days: number) {
  const d = new Date(from);
  let added = 0;
  while (added < days) {
    d.setDate(d.getDate() + 1);
    if (d.getDay() !== 0) added++;
  }
  return d;
}

const fmt = (d: Date) => new Intl.DateTimeFormat("en-IN", { timeZone: IST, weekday: "short", day: "numeric", month: "short" }).format(d);

export function estimateFromRule(pincode: string, rule: { region: string; serviceable: boolean; codAllowed: boolean; minDays: number; maxDays: number } | null, now = new Date()): DeliveryEstimate {
  if (!isValidPincode(pincode)) return { ok: false, message: "Enter a valid 6-digit PIN code." };
  if (!rule || !rule.serviceable) return { ok: true, serviceable: false, pincode, message: "We can't confirm delivery to this PIN code yet. Contact support and we'll check with our logistics partner." };
  return {
    ok: true, serviceable: true, pincode, region: rule.region, minDays: rule.minDays, maxDays: rule.maxDays, codAllowed: rule.codAllowed,
    label: `Estimated delivery ${fmt(addBusinessDays(now, rule.minDays))} – ${fmt(addBusinessDays(now, rule.maxDays))}`,
    source: "Configured logistics rule (estimate, not a guarantee)",
  };
}

export async function estimateDelivery(pincodeRaw: string): Promise<DeliveryEstimate> {
  const pincode = pincodeRaw.trim();
  if (!isValidPincode(pincode)) return { ok: false, message: "Enter a valid 6-digit PIN code." };
  const rule = await db.pincodeRule.findUnique({ where: { prefix: pincode.slice(0, 3) } });
  return estimateFromRule(pincode, rule);
}

export const INDIAN_STATES = [
  "Andaman and Nicobar Islands", "Andhra Pradesh", "Arunachal Pradesh", "Assam", "Bihar", "Chandigarh", "Chhattisgarh", "Dadra and Nagar Haveli and Daman and Diu",
  "Delhi", "Goa", "Gujarat", "Haryana", "Himachal Pradesh", "Jammu and Kashmir", "Jharkhand", "Karnataka", "Kerala", "Ladakh", "Lakshadweep", "Madhya Pradesh",
  "Maharashtra", "Manipur", "Meghalaya", "Mizoram", "Nagaland", "Odisha", "Puducherry", "Punjab", "Rajasthan", "Sikkim", "Tamil Nadu", "Telangana", "Tripura",
  "Uttar Pradesh", "Uttarakhand", "West Bengal",
];
