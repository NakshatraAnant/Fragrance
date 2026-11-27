"use server";
import { db } from "@/lib/db";
import { adminAction, optDate, optStr, str } from "@/lib/admin";
import { AppError } from "@/lib/logger";
import { audit } from "@/lib/audit";
import { B2B_STAGES } from "@/lib/b2b";
import { randomToken } from "@/lib/password";

export async function b2bAction(fd: FormData) {
  const id = str(fd, "enquiryId");
  await adminAction("b2b:write", `/admin/b2b/${id}`, async (actor) => {
    const op = str(fd, "op");
    const e = await db.b2BEnquiry.findUniqueOrThrow({ where: { id } });
    switch (op) {
      case "stage": {
        const stage = str(fd, "stage");
        if (!(B2B_STAGES as readonly string[]).includes(stage)) throw new AppError("Invalid stage.");
        await db.$transaction([db.b2BEnquiry.update({ where: { id }, data: { stage } }), db.b2BActivity.create({ data: { enquiryId: id, userId: actor, type: "STAGE_CHANGE", body: `${e.stage} → ${stage}${optStr(fd, "note") ? `: ${str(fd, "note")}` : ""}` } })]);
        break;
      }
      case "owner": await db.b2BEnquiry.update({ where: { id }, data: { ownerId: optStr(fd, "ownerId") } }); break;
      case "activity": {
        const type = str(fd, "type");
        if (!["NOTE", "CALL", "EMAIL", "MEETING", "FOLLOW_UP"].includes(type)) throw new AppError("Invalid activity type.");
        if (str(fd, "body").length < 2) throw new AppError("Write a note.");
        await db.b2BActivity.create({ data: { enquiryId: id, userId: actor, type, body: str(fd, "body"), dueAt: optDate(fd, "dueAt") } });
        break;
      }
      case "done": await db.b2BActivity.update({ where: { id: str(fd, "activityId") }, data: { doneAt: new Date() } }); break;
      case "brief": {
        if (str(fd, "content").length < 10) throw new AppError("The brief is too short.");
        await db.b2BBrief.create({ data: { enquiryId: id, title: str(fd, "title") || "Brief", content: str(fd, "content") } });
        break;
      }
      case "sample": {
        const sid = optStr(fd, "sampleId");
        if (sid) { const status = str(fd, "status"); await db.b2BSample.update({ where: { id: sid }, data: { status, dispatchedAt: status === "DISPATCHED" ? new Date() : undefined, feedback: optStr(fd, "feedback") ?? undefined } }); }
        else await db.b2BSample.create({ data: { enquiryId: id, description: str(fd, "description") } });
        break;
      }
      case "quote": {
        const qid = optStr(fd, "quoteId");
        if (qid) { const status = str(fd, "status"); if (!["DRAFT", "SENT", "ACCEPTED", "REJECTED"].includes(status)) throw new AppError("Invalid status."); await db.b2BQuotation.update({ where: { id: qid }, data: { status } }); break; }
        const lines = [0, 1, 2, 3].map((i) => ({ description: str(fd, `d${i}`), qty: Number(str(fd, `q${i}`) || 0), unitPaise: Math.round(Number(str(fd, `u${i}`) || 0) * 100) })).filter((l) => l.description && l.qty > 0);
        if (!lines.length) throw new AppError("Add at least one line with a description and quantity.");
        if (lines.some((l) => l.unitPaise < 0)) throw new AppError("Prices can't be negative.");
        const total = lines.reduce((s, l) => s + l.qty * l.unitPaise, 0);
        await db.b2BQuotation.create({ data: { enquiryId: id, number: `OQ-${randomToken(4).replace(/[^A-Za-z0-9]/g, "").toUpperCase().slice(0, 6)}`, lines: JSON.stringify(lines), totalPaise: total, validUntil: optDate(fd, "validUntil") } });
        if (e.stage === "LEAD" || e.stage === "QUALIFICATION" || e.stage === "BRIEF" || e.stage === "SAMPLE") await db.b2BEnquiry.update({ where: { id }, data: { stage: "PROPOSAL" } });
        break;
      }
      default: throw new AppError("Unknown action.");
    }
    await audit(actor, `b2b.${op}`, "B2BEnquiry", id);
    return "Saved.";
  });
}

