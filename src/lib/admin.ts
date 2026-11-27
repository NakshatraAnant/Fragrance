import "server-only";
import { redirect, unstable_rethrow } from "next/navigation";
import { requireStaff } from "./auth";
import { AppError, log } from "./logger";
import type { Permission } from "./permissions";

/**
 * Wraps an admin server action: enforces the permission server-side, runs the mutation, and
 * redirects back with a flash message. Every admin mutation goes through this.
 */
export async function adminAction(permission: Permission, back: string, fn: (actorId: string) => Promise<string | void>) {
  const user = await requireStaff(permission, back);
  let msg: string | void = "Saved.";
  let err: string | null = null;
  try {
    msg = (await fn(user.id)) ?? "Saved.";
  } catch (e) {
    unstable_rethrow(e); // let redirect()/notFound() from inside fn propagate
    if (e instanceof AppError) err = e.message;
    else if (e instanceof Error && /Unique constraint/i.test(e.message)) err = "That value is already in use (must be unique).";
    else { log.error("admin action failed", { error: e, back }); err = "Something went wrong. The error has been logged."; }
  }
  const sep = back.includes("?") ? "&" : "?";
  redirect(`${back}${sep}${err ? `err=${encodeURIComponent(err)}` : `msg=${encodeURIComponent(msg)}`}`);
}

export const str = (fd: FormData, k: string) => String(fd.get(k) ?? "").trim();
export const optStr = (fd: FormData, k: string) => { const v = str(fd, k); return v === "" ? null : v; };
export const num = (fd: FormData, k: string) => { const n = Number(str(fd, k)); if (!Number.isFinite(n)) throw new AppError(`${k} must be a number.`); return n; };
export const rupeesToPaise = (fd: FormData, k: string) => Math.round(num(fd, k) * 100);
export const bool = (fd: FormData, k: string) => fd.get(k) === "on" || fd.get(k) === "true";
export const optDate = (fd: FormData, k: string) => { const v = str(fd, k); if (!v) return null; const d = new Date(v); if (isNaN(+d)) throw new AppError(`${k} is not a valid date.`); return d; };
