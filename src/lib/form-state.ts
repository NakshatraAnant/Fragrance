import type { ZodError } from "zod";

export type FormState = { ok: boolean; message?: string; errors?: Record<string, string>; data?: Record<string, unknown> } | null;

export function zodErrors(e: ZodError): Record<string, string> {
  const out: Record<string, string> = {};
  for (const i of e.issues) { const k = String(i.path[0] ?? "_"); if (!out[k]) out[k] = i.message; }
  return out;
}

export function formObject(fd: FormData) {
  const o: Record<string, string> = {};
  for (const [k, v] of fd.entries()) if (typeof v === "string") o[k] = v;
  return o;
}
