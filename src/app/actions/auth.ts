"use server";
import { redirect } from "next/navigation";
import { z } from "zod";
import { authenticate, registerUser, createPasswordReset, consumePasswordReset } from "@/lib/auth-core";
import { startSession, endSession, clientIp, readGuestToken } from "@/lib/auth";
import { mergeGuestCart } from "@/lib/cart";
import { db } from "@/lib/db";
import { AppError } from "@/lib/logger";
import { rateLimit } from "@/lib/rate-limit";
import { passwordPolicyError } from "@/lib/password";
import { recordConsent, sendTemplate } from "@/lib/messaging";
import { emitCrmEvent } from "@/lib/crm";
import { env } from "@/lib/env";
import { formObject, zodErrors, type FormState } from "@/lib/form-state";

const safeNext = (n: unknown) => (typeof n === "string" && n.startsWith("/") && !n.startsWith("//") ? n : "/account");

async function mergeGuestWishlist(userId: string) {
  const token = await readGuestToken();
  if (!token) return;
  const items = await db.wishlistItem.findMany({ where: { guestToken: token } });
  for (const i of items) {
    await db.wishlistItem.upsert({ where: { userId_productId: { userId, productId: i.productId } }, update: {}, create: { userId, productId: i.productId } });
  }
  await db.wishlistItem.deleteMany({ where: { guestToken: token } });
}

export async function login(_: FormState, fd: FormData): Promise<FormState> {
  const raw = formObject(fd);
  const ip = await clientIp();
  if (!rateLimit(`login:${ip}`, 10, 600_000).ok || !rateLimit(`login:${raw.email?.toLowerCase()}`, 8, 600_000).ok) return { ok: false, message: "Too many sign-in attempts. Please wait 10 minutes.", data: { email: raw.email } };
  try {
    const user = await authenticate(raw.email ?? "", raw.password ?? "");
    await startSession(user.id);
    await mergeGuestCart(await readGuestToken(), user.id);
    await mergeGuestWishlist(user.id);
  } catch (e) {
    if (e instanceof AppError) return { ok: false, message: e.message, data: { email: raw.email } };
    throw e;
  }
  redirect(safeNext(raw.next));
}

const Register = z.object({
  name: z.string().trim().min(2, "Enter your name.").max(100),
  email: z.string().trim().toLowerCase().email("Enter a valid email."),
  phone: z.string().trim().regex(/^(\+91[\s-]?)?[6-9]\d{9}$/, "Enter a valid Indian mobile number.").optional().or(z.literal("")),
  password: z.string().superRefine((v, ctx) => { const e = passwordPolicyError(v); if (e) ctx.addIssue({ code: "custom", message: e }); }),
  referral: z.string().trim().max(20).optional(),
});

export async function register(_: FormState, fd: FormData): Promise<FormState> {
  const raw = formObject(fd);
  if (!rateLimit(`register:${await clientIp()}`, 6, 3600_000).ok) return { ok: false, message: "Too many sign-ups from this network. Please try later." };
  const p = Register.safeParse(raw);
  const { password: _pw, ...keep } = raw;
  if (!p.success) return { ok: false, errors: zodErrors(p.error), data: keep };
  try {
    const user = await registerUser({ ...p.data, referralCode: p.data.referral || null });
    await startSession(user.id);
    await mergeGuestCart(await readGuestToken(), user.id);
    await mergeGuestWishlist(user.id);
    if (raw.marketing === "on") await recordConsent({ userId: user.id, email: user.email, channel: "EMAIL", granted: true, source: "account", ip: await clientIp() });
    if (raw.whatsapp === "on" && user.phone) await recordConsent({ userId: user.id, phone: user.phone, channel: "WHATSAPP", granted: true, source: "account", ip: await clientIp() });
    await emitCrmEvent(db, "WELCOME", { userId: user.id, email: user.email });
    await sendTemplate("WELCOME", "EMAIL", { email: user.email, userId: user.id }, { name: user.name });
  } catch (e) {
    if (e instanceof AppError) return { ok: false, message: e.message, data: keep };
    throw e;
  }
  redirect(safeNext(raw.next));
}

export async function logout() {
  await endSession();
  redirect("/");
}

export async function requestReset(_: FormState, fd: FormData): Promise<FormState> {
  const email = String(fd.get("email") ?? "").trim().toLowerCase();
  if (!rateLimit(`reset:${await clientIp()}`, 5, 3600_000).ok) return { ok: false, message: "Too many requests. Please try later." };
  const token = await createPasswordReset(email);
  if (token) await sendTemplate("PASSWORD_RESET", "EMAIL", { email }, { resetUrl: `${env.appUrl()}/account/reset?token=${token}` });
  // Same response whether or not the account exists (no account enumeration).
  return { ok: true, message: `If an account exists for ${email}, we've sent a reset link. It's valid for one hour.${!env.email().apiKey && !env.isProd() ? " (Email isn't configured on this environment, so the link is in Admin → System → Outbox.)" : ""}` };
}

export async function resetPassword(_: FormState, fd: FormData): Promise<FormState> {
  const token = String(fd.get("token") ?? "");
  const pw = String(fd.get("password") ?? "");
  const err = passwordPolicyError(pw);
  if (err) return { ok: false, errors: { password: err } };
  try { await consumePasswordReset(token, pw); } catch (e) { if (e instanceof AppError) return { ok: false, message: e.message }; throw e; }
  return { ok: true, message: "Your password has been reset. You can sign in now." };
}
