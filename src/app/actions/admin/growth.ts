"use server";
import { revalidatePath } from "next/cache";
import { db } from "@/lib/db";
import { adminAction, bool, num, optDate, optStr, str } from "@/lib/admin";
import { AppError } from "@/lib/logger";
import { audit } from "@/lib/audit";
import { setSetting, getSetting } from "@/lib/settings";
import type { Settings } from "@/lib/settings-defaults";

// ── Merchandising ─────────────────────────────────────────
export async function saveRanking(fd: FormData) {
  await adminAction("merch:write", "/admin/merchandising", async (actor) => {
    const ids = fd.getAll("id").map(String);
    for (const id of ids) {
      await db.product.update({ where: { id }, data: { merchRank: Math.round(Number(fd.get(`rank_${id}`) ?? 100)), isFeatured: fd.get(`featured_${id}`) === "on", isNew: fd.get(`new_${id}`) === "on" } });
    }
    await audit(actor, "merch.ranking", "Product", null, { count: ids.length });
    revalidatePath("/", "layout");
    return "Ranking & flags saved.";
  });
}

export async function relatedAction(fd: FormData) {
  await adminAction("merch:write", "/admin/merchandising", async (actor) => {
    if (str(fd, "op") === "delete") { await db.relatedProduct.delete({ where: { id: str(fd, "id") } }); return "Removed."; }
    const kind = str(fd, "kind");
    if (!["CROSS_SELL", "UPSELL", "SIMILAR", "FREQUENTLY_BOUGHT"].includes(kind)) throw new AppError("Invalid relation type.");
    const fromId = str(fd, "fromId"), toId = str(fd, "toId");
    if (fromId === toId) throw new AppError("A product can't relate to itself.");
    await db.relatedProduct.create({ data: { fromId, toId, kind, rationale: optStr(fd, "rationale") } });
    await audit(actor, "merch.related", "Product", fromId, { toId, kind });
    return "Relation added.";
  });
}

export async function layeringAction(fd: FormData) {
  await adminAction("merch:write", "/admin/merchandising", async (actor) => {
    const op = str(fd, "op");
    if (op === "toggle") { const p = await db.layeringPair.findUniqueOrThrow({ where: { id: str(fd, "id") } }); await db.layeringPair.update({ where: { id: p.id }, data: { isActive: !p.isActive } }); revalidatePath("/layering"); return p.isActive ? "Pairing hidden." : "Pairing live."; }
    const a = str(fd, "productAId"), b = str(fd, "productBId");
    if (a === b) throw new AppError("Choose two different products.");
    for (const k of ["title", "rationale", "sequence", "source"]) if (str(fd, k).length < 3) throw new AppError(`${k} is required. Every pairing needs a documented rationale and source.`);
    const p = await db.layeringPair.create({ data: { productAId: a, productBId: b, title: str(fd, "title"), rationale: str(fd, "rationale"), sequence: str(fd, "sequence"), source: str(fd, "source") } });
    await audit(actor, "layering.create", "LayeringPair", p.id);
    revalidatePath("/layering");
    return "Curated pairing added.";
  });
}

export async function bundleAction(fd: FormData) {
  await adminAction("merch:write", "/admin/merchandising", async (actor) => {
    if (str(fd, "op") === "toggle") { const b = await db.bundle.findUniqueOrThrow({ where: { id: str(fd, "id") } }); await db.bundle.update({ where: { id: b.id }, data: { isActive: !b.isActive } }); return "Bundle updated."; }
    const productIds = fd.getAll("productIds").map(String).filter(Boolean);
    if (productIds.length < 2) throw new AppError("A bundle needs at least two products.");
    const slug = str(fd, "slug").toLowerCase();
    if (!/^[a-z0-9-]{3,60}$/.test(slug)) throw new AppError("Slug must be lowercase letters, numbers and hyphens.");
    const b = await db.bundle.create({ data: { slug, name: str(fd, "name"), description: str(fd, "description"), discountPct: 0, items: { create: productIds.map((productId) => ({ productId })) } } });
    await audit(actor, "bundle.create", "Bundle", b.id);
    revalidatePath("/gifting");
    return "Bundle created (priced at everyday prices, per the commercial rules).";
  });
}

// ── Settings (rules) ─────────────────────────────────────
export async function saveSettingJson(fd: FormData) {
  const key = str(fd, "key") as keyof Settings;
  const back = str(fd, "back") || "/admin/marketing";
  const perm = key === "finderWeights" ? "merch:write" : "marketing:write";
  await adminAction(perm, back, async (actor) => {
    const allowed = ["discoveryCredit", "loyalty", "shipping", "cod", "finderWeights", "orders", "replenishmentDays", "reviews"];
    if (!allowed.includes(key)) throw new AppError("Unknown setting.");
    let value: unknown;
    try { value = JSON.parse(str(fd, "value")); } catch { throw new AppError("That isn't valid JSON."); }
    const before = await getSetting(key);
    try { await setSetting(key, value); } catch (e) { throw new AppError(`Invalid configuration: ${(e as Error).message.slice(0, 300)}`); }
    await audit(actor, "setting.update", "Setting", key, { before, after: value });
    revalidatePath("/", "layout");
    return `${key} updated.`;
  });
}

// ── Coupons ─────────────────────────────────────────────
export async function couponAction(fd: FormData) {
  await adminAction("marketing:write", "/admin/marketing", async (actor) => {
    if (str(fd, "op") === "toggle") { const c = await db.coupon.findUniqueOrThrow({ where: { id: str(fd, "id") } }); await db.coupon.update({ where: { id: c.id }, data: { isActive: !c.isActive } }); await audit(actor, "coupon.toggle", "Coupon", c.id); return c.isActive ? "Coupon paused." : "Coupon active."; }
    const code = str(fd, "code").toUpperCase();
    if (!/^[A-Z0-9-]{3,32}$/.test(code)) throw new AppError("Code must be 3–32 characters (A–Z, 0–9, -).");
    const type = str(fd, "type") === "FIXED" ? "FIXED" : "PERCENT";
    const value = type === "PERCENT" ? Math.round(num(fd, "value")) : Math.round(num(fd, "value") * 100);
    if (type === "PERCENT" && (value <= 0 || value > 25)) throw new AppError("Percent coupons must be 1–25%. Brand ceilings cap each line further (Dhun 25%, Vasana 15%, Anvaya 0%).");
    if (value <= 0) throw new AppError("Value must be positive.");
    const max = optStr(fd, "maxRedemptions");
    const c = await db.coupon.create({ data: { code, description: str(fd, "description"), type, value, minSubtotalPaise: Math.round(num(fd, "minSubtotal") * 100), brandScope: fd.getAll("brandScope").map(String).join(","), maxRedemptions: max ? Number(max) : null, perCustomerLimit: Math.max(1, Math.round(num(fd, "perCustomerLimit") || 1)), startsAt: optDate(fd, "startsAt"), endsAt: optDate(fd, "endsAt"), isActive: bool(fd, "isActive") } });
    await audit(actor, "coupon.create", "Coupon", c.id, { code, type, value });
    return `Coupon ${code} created.`;
  });
}

export async function templateAction(fd: FormData) {
  await adminAction("marketing:write", "/admin/marketing", async (actor) => {
    const id = str(fd, "id");
    const body = str(fd, "body");
    if (body.length < 5) throw new AppError("The template body is empty.");
    await db.messageTemplate.update({ where: { id }, data: { subject: optStr(fd, "subject"), body, isActive: bool(fd, "isActive") } });
    await audit(actor, "template.update", "MessageTemplate", id);
    return "Template saved.";
  });
}
