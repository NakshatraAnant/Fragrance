"use server";
import { revalidatePath } from "next/cache";
import { db } from "@/lib/db";
import { adminAction, num, optStr, str } from "@/lib/admin";
import { AppError } from "@/lib/logger";
import { audit } from "@/lib/audit";
import { randomToken, hashPassword } from "@/lib/password";

export async function moderateReview(fd: FormData) {
  await adminAction("reviews:write", "/admin/reviews", async (actor) => {
    const id = str(fd, "id");
    const status = str(fd, "status");
    if (!["APPROVED", "REJECTED", "PENDING"].includes(status)) throw new AppError("Invalid status.");
    await db.review.update({ where: { id }, data: { status, moderationNote: optStr(fd, "note") } });
    await audit(actor, `review.${status.toLowerCase()}`, "Review", id);
    revalidatePath("/", "layout");
    return `Review ${status.toLowerCase()}.`;
  });
}

export async function answerQuestion(fd: FormData) {
  await adminAction("reviews:write", "/admin/reviews", async (actor) => {
    const id = str(fd, "id");
    const op = str(fd, "op");
    if (op === "reject") await db.productQuestion.update({ where: { id }, data: { status: "REJECTED" } });
    else {
      const answer = str(fd, "answer");
      if (answer.length < 5) throw new AppError("Write an answer before publishing.");
      await db.productQuestion.update({ where: { id }, data: { answer, status: "PUBLISHED", answeredBy: actor, answeredAt: new Date() } });
    }
    await audit(actor, `question.${op}`, "ProductQuestion", id);
    revalidatePath("/", "layout");
    return op === "reject" ? "Question rejected." : "Answer published.";
  });
}

export async function updateTicket(fd: FormData) {
  await adminAction("support:write", "/admin/support", async (actor) => {
    const id = str(fd, "id");
    const kind = str(fd, "kind");
    const status = str(fd, "status");
    if (kind === "appointment") await db.appointmentRequest.update({ where: { id }, data: { status } });
    else await db.supportTicket.update({ where: { id }, data: { status, internalNote: optStr(fd, "note") } });
    await audit(actor, `${kind}.status`, kind === "appointment" ? "AppointmentRequest" : "SupportTicket", id, { status });
    return "Updated.";
  });
}

export async function adjustLoyalty(fd: FormData) {
  const userId = str(fd, "userId");
  await adminAction("customers:write", `/admin/customers/${userId}`, async (actor) => {
    const points = Math.round(num(fd, "points"));
    const note = str(fd, "note");
    if (!points || note.length < 3) throw new AppError("Enter points and a reason.");
    const acc = await db.loyaltyAccount.upsert({ where: { userId }, update: {}, create: { userId } });
    if (acc.pointsBalance + points < 0) throw new AppError("Balance can't go below zero.");
    await db.$transaction([
      db.loyaltyTransaction.create({ data: { accountId: acc.id, type: "ADJUST", points, note: `${note} (by staff)`, orderId: `adj_${randomToken(6)}` } }),
      db.loyaltyAccount.update({ where: { id: acc.id }, data: { pointsBalance: { increment: points }, lifetimePoints: points > 0 ? { increment: points } : undefined } }),
    ]);
    await audit(actor, "loyalty.adjust", "User", userId, { points, note });
    return "Loyalty adjusted.";
  });
}

/** DPDP: fulfil a deletion request by anonymising the customer (orders are retained for tax law). */
export async function processDataRequest(fd: FormData) {
  const id = str(fd, "id");
  await adminAction("customers:write", "/admin/customers", async (actor) => {
    const req = await db.dataRequest.findUniqueOrThrow({ where: { id } });
    if (str(fd, "op") === "reject") { await db.dataRequest.update({ where: { id }, data: { status: "REJECTED", completedAt: new Date() } }); return "Request rejected."; }
    if (req.type === "DELETION") {
      const anon = `deleted-${randomToken(6).toLowerCase()}@deleted.invalid`;
      await db.$transaction([
        db.address.deleteMany({ where: { userId: req.userId } }),
        db.wishlistItem.deleteMany({ where: { userId: req.userId } }),
        db.session.deleteMany({ where: { userId: req.userId } }),
        db.customerPreference.deleteMany({ where: { userId: req.userId } }),
        db.scentProfile.updateMany({ where: { userId: req.userId }, data: { userId: null } }),
        db.user.update({ where: { id: req.userId }, data: { email: anon, name: null, phone: null, birthday: null, passwordHash: hashPassword(randomToken(24)), isActive: false, deletedAt: new Date() } }),
        db.dataRequest.update({ where: { id }, data: { status: "COMPLETED", completedAt: new Date() } }),
      ]);
    } else await db.dataRequest.update({ where: { id }, data: { status: "COMPLETED", completedAt: new Date() } });
    await audit(actor, `data_request.${req.type.toLowerCase()}.completed`, "User", req.userId);
    return req.type === "DELETION" ? "Customer anonymised. Order records are kept for statutory retention." : "Marked completed.";
  });
}
