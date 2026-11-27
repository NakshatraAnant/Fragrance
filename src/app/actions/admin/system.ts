"use server";
import { db } from "@/lib/db";
import { adminAction, str } from "@/lib/admin";
import { AppError } from "@/lib/logger";
import { audit } from "@/lib/audit";
import { hashPassword, passwordPolicyError } from "@/lib/password";
import { expireStaleOrders } from "@/lib/payments/process";
import { processDueCrmEvents, scheduleScannedEvents } from "@/lib/crm";

export async function staffAction(fd: FormData) {
  await adminAction("system:write", "/admin/system", async (actor) => {
    const op = str(fd, "op");
    if (op === "toggle") {
      const id = str(fd, "id");
      if (id === actor) throw new AppError("You can't deactivate your own account.");
      const u = await db.user.findUniqueOrThrow({ where: { id } });
      await db.user.update({ where: { id }, data: { isActive: !u.isActive } });
      if (u.isActive) await db.session.deleteMany({ where: { userId: id } });
      await audit(actor, u.isActive ? "staff.deactivate" : "staff.activate", "User", id);
      return u.isActive ? "Staff account deactivated and signed out." : "Staff account reactivated.";
    }
    if (op === "role") {
      const id = str(fd, "id");
      if (id === actor) throw new AppError("You can't change your own role.");
      await db.user.update({ where: { id }, data: { roleId: str(fd, "roleId") } });
      await db.session.deleteMany({ where: { userId: id } });
      await audit(actor, "staff.role", "User", id, { roleId: str(fd, "roleId") });
      return "Role updated. The user must sign in again.";
    }
    const email = str(fd, "email").toLowerCase();
    if (!/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(email)) throw new AppError("Enter a valid email.");
    const pw = str(fd, "password");
    const pe = passwordPolicyError(pw);
    if (pe) throw new AppError(pe);
    const existing = await db.user.findUnique({ where: { email } });
    if (existing) throw new AppError("A user with this email already exists.");
    const u = await db.user.create({ data: { email, name: str(fd, "name") || null, passwordHash: hashPassword(pw), roleId: str(fd, "roleId"), emailVerifiedAt: new Date() } });
    await audit(actor, "staff.create", "User", u.id, { email, roleId: str(fd, "roleId") });
    return `Staff account created for ${email}. Share the temporary password securely and ask them to change it.`;
  });
}

export async function runJobs() {
  await adminAction("system:write", "/admin/system", async (actor) => {
    const expired = await expireStaleOrders();
    const scanned = await scheduleScannedEvents();
    const sent = await processDueCrmEvents();
    await audit(actor, "jobs.run", "System", null, { expired, scanned, sent });
    return `Jobs complete: ${expired} stale orders expired; ${scanned.birthdays} birthday and ${scanned.lapsed} lapsed events queued; ${Object.values(sent).reduce((a, b) => a + b, 0)} lifecycle events processed.`;
  });
}
