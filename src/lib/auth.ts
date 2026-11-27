import "server-only";
import { cache } from "react";
import { cookies, headers } from "next/headers";
import { redirect } from "next/navigation";
import { SESSION_COOKIE, GUEST_COOKIE, SESSION_DAYS, resolveSession, createSessionRecord, destroySession, can, type SessionUser } from "./auth-core";
import { randomToken } from "./password";
import type { Permission } from "./permissions";

const cookieBase = () => ({ httpOnly: true, sameSite: "lax" as const, secure: process.env.NODE_ENV === "production", path: "/" });

export const getCurrentUser = cache(async (): Promise<SessionUser | null> => {
  const jar = await cookies();
  return resolveSession(jar.get(SESSION_COOKIE)?.value);
});

export async function startSession(userId: string) {
  const h = await headers();
  const { token, expiresAt } = await createSessionRecord(userId, { ip: h.get("x-forwarded-for")?.split(",")[0] ?? undefined, userAgent: h.get("user-agent") ?? undefined });
  const jar = await cookies();
  jar.set(SESSION_COOKIE, token, { ...cookieBase(), expires: expiresAt, maxAge: SESSION_DAYS * 86400 });
}

export async function endSession() {
  const jar = await cookies();
  await destroySession(jar.get(SESSION_COOKIE)?.value);
  jar.delete(SESSION_COOKIE);
}

/** Read the guest token (cart / wishlist) — never creates one. */
export async function readGuestToken(): Promise<string | null> {
  return (await cookies()).get(GUEST_COOKIE)?.value ?? null;
}

/** Get or create the guest token. Only callable in Server Actions / Route Handlers. */
export async function ensureGuestToken(): Promise<string> {
  const jar = await cookies();
  const existing = jar.get(GUEST_COOKIE)?.value;
  if (existing) return existing;
  const token = randomToken(24);
  jar.set(GUEST_COOKIE, token, { ...cookieBase(), maxAge: 60 * 86400 });
  return token;
}

export async function requireUser(next = "/account"): Promise<SessionUser> {
  const user = await getCurrentUser();
  if (!user) redirect(`/account/login?next=${encodeURIComponent(next)}`);
  return user;
}

export async function requireStaff(permission: Permission, next = "/admin"): Promise<SessionUser> {
  const user = await getCurrentUser();
  if (!user) redirect(`/account/login?next=${encodeURIComponent(next)}`);
  if (!can(user, permission)) redirect(`/admin/forbidden?need=${encodeURIComponent(permission)}`);
  return user;
}

export async function clientIp(): Promise<string> {
  const h = await headers();
  return h.get("x-forwarded-for")?.split(",")[0]?.trim() || h.get("x-real-ip") || "local";
}
