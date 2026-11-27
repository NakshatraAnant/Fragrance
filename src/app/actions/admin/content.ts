"use server";
import { revalidatePath } from "next/cache";
import { db } from "@/lib/db";
import { adminAction, bool, num, optDate, optStr, str } from "@/lib/admin";
import { AppError } from "@/lib/logger";
import { audit } from "@/lib/audit";
import { saveUpload } from "@/lib/uploads";

async function maybeImage(fd: FormData, field: string): Promise<string | null | undefined> {
  const f = fd.get(field);
  if (f instanceof File && f.size > 0) return (await saveUpload(f, { allow: ["IMAGE"], maxBytes: 8 * 1024 * 1024, folder: "cms" })).url;
  if (fd.get(`${field}_clear`) === "on") return null;
  return undefined; // unchanged
}

export async function saveSection(fd: FormData) {
  await adminAction("cms:write", "/admin/cms", async (actor) => {
    const id = str(fd, "id");
    let config: unknown;
    try { config = JSON.parse(str(fd, "config") || "{}"); } catch { throw new AppError("Config must be valid JSON."); }
    const [desk, mob] = await Promise.all([maybeImage(fd, "imageDesktop"), maybeImage(fd, "imageMobile")]);
    const data = {
      title: str(fd, "title"), subtitle: optStr(fd, "subtitle"), body: optStr(fd, "body"), ctaLabel: optStr(fd, "ctaLabel"), ctaHref: optStr(fd, "ctaHref"),
      sortOrder: Math.round(num(fd, "sortOrder")), isActive: bool(fd, "isActive"), startsAt: optDate(fd, "startsAt"), endsAt: optDate(fd, "endsAt"), config: JSON.stringify(config),
      ...(desk !== undefined ? { imageDesktop: desk } : {}), ...(mob !== undefined ? { imageMobile: mob } : {}),
    };
    if (data.ctaHref && !/^(\/|https:\/\/)/.test(data.ctaHref)) throw new AppError("CTA link must start with / or https://");
    await db.homepageSection.update({ where: { id }, data });
    await audit(actor, "cms.section.update", "HomepageSection", id, { ...data, config });
    revalidatePath("/");
    return "Section saved. The homepage is updated.";
  });
}

export async function bannerAction(fd: FormData) {
  await adminAction("cms:write", "/admin/cms", async (actor) => {
    const op = str(fd, "op");
    if (op === "delete") { await db.banner.delete({ where: { id: str(fd, "id") } }); revalidatePath("/", "layout"); return "Banner deleted."; }
    const desk = await maybeImage(fd, "imageDesktop");
    const mob = await maybeImage(fd, "imageMobile");
    const href = optStr(fd, "ctaHref");
    if (href && !/^(\/|https:\/\/)/.test(href)) throw new AppError("Link must start with / or https://");
    const data = { placement: str(fd, "placement"), title: str(fd, "title"), body: optStr(fd, "body"), ctaLabel: optStr(fd, "ctaLabel"), ctaHref: href, sortOrder: Math.round(num(fd, "sortOrder") || 0), isActive: bool(fd, "isActive"), startsAt: optDate(fd, "startsAt"), endsAt: optDate(fd, "endsAt"), ...(desk !== undefined ? { imageDesktop: desk } : {}), ...(mob !== undefined ? { imageMobile: mob } : {}) };
    if (!data.title) throw new AppError("Title is required.");
    const id = optStr(fd, "id");
    const b = id ? await db.banner.update({ where: { id }, data }) : await db.banner.create({ data });
    await audit(actor, id ? "banner.update" : "banner.create", "Banner", b.id);
    revalidatePath("/", "layout");
    return "Banner saved.";
  });
}

export async function savePage(fd: FormData) {
  await adminAction("cms:write", "/admin/content", async (actor) => {
    const slug = str(fd, "slug");
    const data = { title: str(fd, "title"), eyebrow: optStr(fd, "eyebrow"), intro: optStr(fd, "intro"), body: str(fd, "body"), status: str(fd, "status") === "DRAFT" ? "DRAFT" : "PUBLISHED", needsLegalReview: bool(fd, "needsLegalReview"), seoTitle: optStr(fd, "seoTitle"), seoDescription: optStr(fd, "seoDescription") };
    await db.cmsPage.update({ where: { slug }, data });
    await audit(actor, "cms.page.update", "CmsPage", slug);
    revalidatePath(`/${slug}`);
    return `Page /${slug} saved.`;
  });
}

export async function saveJournal(fd: FormData) {
  await adminAction("cms:write", "/admin/content", async (actor) => {
    const id = optStr(fd, "id");
    const slug = str(fd, "slug").toLowerCase();
    if (!/^[a-z0-9-]{3,80}$/.test(slug)) throw new AppError("Slug must be lowercase letters, numbers and hyphens.");
    const brandId = optStr(fd, "brandId");
    const data = { slug, title: str(fd, "title"), excerpt: str(fd, "excerpt"), body: str(fd, "body"), brandId, status: str(fd, "status") === "DRAFT" ? "DRAFT" : "PUBLISHED", publishedAt: optDate(fd, "publishedAt") ?? new Date() };
    const p = id ? await db.journalPost.update({ where: { id }, data }) : await db.journalPost.create({ data });
    await audit(actor, id ? "journal.update" : "journal.create", "JournalPost", p.id);
    revalidatePath("/journal");
    return "Journal post saved.";
  });
}

export async function saveCampaign(fd: FormData) {
  await adminAction("cms:write", "/admin/content", async (actor) => {
    const id = optStr(fd, "id");
    const slug = str(fd, "slug").toLowerCase();
    if (!/^[a-z0-9-]{3,80}$/.test(slug)) throw new AppError("Slug must be lowercase letters, numbers and hyphens.");
    const data = { slug, brandId: str(fd, "brandId"), title: str(fd, "title"), eyebrow: optStr(fd, "eyebrow"), body: str(fd, "body"), productSkus: str(fd, "productSlugs").split(",").map((s) => s.trim()).filter(Boolean).join(","), startsAt: optDate(fd, "startsAt"), endsAt: optDate(fd, "endsAt"), status: str(fd, "status") === "DRAFT" ? "DRAFT" : "PUBLISHED" };
    const c = id ? await db.campaign.update({ where: { id }, data }) : await db.campaign.create({ data });
    await audit(actor, id ? "campaign.update" : "campaign.create", "Campaign", c.id);
    revalidatePath("/", "layout");
    return "Campaign saved.";
  });
}

export async function savePincodeRule(fd: FormData) {
  await adminAction("system:write", "/admin/system", async (actor) => {
    const prefix = str(fd, "prefix");
    if (!/^[1-9]\d{2}$/.test(prefix)) throw new AppError("Prefix must be the first 3 digits of a PIN code.");
    const minDays = Math.round(num(fd, "minDays")), maxDays = Math.round(num(fd, "maxDays"));
    if (minDays < 1 || maxDays < minDays) throw new AppError("Check the delivery day range.");
    const data = { region: str(fd, "region"), serviceable: bool(fd, "serviceable"), codAllowed: bool(fd, "codAllowed"), minDays, maxDays, note: optStr(fd, "note") };
    await db.pincodeRule.upsert({ where: { prefix }, update: data, create: { prefix, ...data } });
    await audit(actor, "pincode.upsert", "PincodeRule", prefix, data);
    return `PIN rule ${prefix} saved.`;
  });
}
