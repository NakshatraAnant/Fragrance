import { db } from "./db";
import { hashPassword, verifyPassword, randomToken, sha256 } from "./password";
import { AppError } from "./logger";
import { hasPermission, type Permission } from "./permissions";

export const SESSION_COOKIE = "fh_session";
export const GUEST_COOKIE = "fh_guest";
export const SESSION_DAYS = 30;

export type SessionUser = {
  id: string; email: string; name: string | null; phone: string | null;
  role: { key: string; name: string; permissions: string } | null;
};

export async function createSessionRecord(userId: string, meta: { ip?: string; userAgent?: string } = {}) {
  const token = randomToken(32);
  const expiresAt = new Date(Date.now() + SESSION_DAYS * 86400_000);
  await db.session.create({ data: { tokenHash: sha256(token), userId, expiresAt, ip: meta.ip?.slice(0, 64), userAgent: meta.userAgent?.slice(0, 256) } });
  return { token, expiresAt };
}

export async function resolveSession(token: string | undefined | null): Promise<SessionUser | null> {
  if (!token) return null;
  const s = await db.session.findUnique({
    where: { tokenHash: sha256(token) },
    include: { user: { select: { id: true, email: true, name: true, phone: true, isActive: true, deletedAt: true, role: { select: { key: true, name: true, permissions: true } } } } },
  });
  if (!s || s.expiresAt < new Date() || !s.user.isActive || s.user.deletedAt) return null;
  const { isActive: _a, deletedAt: _d, ...user } = s.user;
  return user;
}

export async function destroySession(token: string | undefined | null) {
  if (token) await db.session.deleteMany({ where: { tokenHash: sha256(token) } });
}

export async function registerUser(input: { email: string; password: string; name: string; phone?: string | null; referralCode?: string | null }) {
  const email = input.email.trim().toLowerCase();
  if (await db.user.findUnique({ where: { email } })) throw new AppError("An account with this email already exists. Try signing in.", "EMAIL_TAKEN", 409);
  let referredById: string | null = null;
  if (input.referralCode) {
    const ref = await db.user.findUnique({ where: { referralCode: input.referralCode.trim().toUpperCase() } });
    referredById = ref?.id ?? null;
  }
  const user = await db.user.create({
    data: { email, name: input.name.trim(), phone: input.phone || null, passwordHash: hashPassword(input.password), referralCode: `FH${randomToken(5).replace(/[^A-Za-z0-9]/g, "").toUpperCase().slice(0, 6)}`, referredById },
  });
  if (referredById) await db.referral.upsert({ where: { refereeEmail: email }, update: { refereeUserId: user.id, status: "JOINED" }, create: { referrerId: referredById, refereeEmail: email, refereeUserId: user.id, status: "JOINED" } });
  // Link guest-issued discovery credits for this email to the new account.
  await db.discoveryCredit.updateMany({ where: { email, userId: null }, data: { userId: user.id } });
  return user;
}

export async function authenticate(emailRaw: string, password: string) {
  const email = emailRaw.trim().toLowerCase();
  const user = await db.user.findUnique({ where: { email } });
  // Always run a hash verification to keep timing uniform for unknown emails.
  const ok = user ? verifyPassword(password, user.passwordHash) : (verifyPassword(password, hashPassword("timing-equaliser")), false);
  if (!user || !ok || !user.isActive || user.deletedAt) throw new AppError("That email and password don't match an account.", "INVALID_CREDENTIALS", 401);
  await db.user.update({ where: { id: user.id }, data: { lastLoginAt: new Date() } });
  return user;
}

export async function createPasswordReset(emailRaw: string): Promise<string | null> {
  const user = await db.user.findUnique({ where: { email: emailRaw.trim().toLowerCase() } });
  if (!user) return null;
  const token = randomToken(32);
  await db.passwordResetToken.create({ data: { userId: user.id, tokenHash: sha256(token), expiresAt: new Date(Date.now() + 3600_000) } });
  return token;
}

export async function consumePasswordReset(token: string, newPassword: string) {
  const row = await db.passwordResetToken.findUnique({ where: { tokenHash: sha256(token) } });
  if (!row || row.usedAt || row.expiresAt < new Date()) throw new AppError("This reset link is invalid or has expired.", "RESET_INVALID", 400);
  await db.$transaction([
    db.passwordResetToken.update({ where: { id: row.id }, data: { usedAt: new Date() } }),
    db.user.update({ where: { id: row.userId }, data: { passwordHash: hashPassword(newPassword) } }),
    db.session.deleteMany({ where: { userId: row.userId } }),
  ]);
}

export function can(user: SessionUser | null, permission: Permission) {
  return Boolean(user?.role && hasPermission(user.role.permissions, permission));
}

export function isStaff(user: SessionUser | null) {
  return Boolean(user?.role);
}
