"use server";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { db } from "@/lib/db";
import { adminAction, bool, num, optStr, rupeesToPaise, str } from "@/lib/admin";
import { AppError } from "@/lib/logger";
import { audit, changed } from "@/lib/audit";
import { saveUpload } from "@/lib/uploads";
import { adjustStock } from "@/lib/inventory";
import { requireStaff } from "@/lib/auth";

const FORMATS = ["EDP", "EXTRAIT", "MIST", "ATTAR", "RUH", "TRAVEL", "SOLID", "DISCOVERY", "CANDLE", "REED", "ROOM_SPRAY", "CAR", "BAKHOOR", "GIFT"];
const csvSlugs = (s: string) => s.split(",").map((x) => x.trim().toLowerCase().replace(/\s+/g, "-")).filter(Boolean).join(",");

function productData(fd: FormData) {
  const format = str(fd, "format");
  if (!FORMATS.includes(format)) throw new AppError("Choose a valid format.");
  const slug = str(fd, "slug").toLowerCase();
  if (!/^[a-z0-9-]{3,80}$/.test(slug)) throw new AppError("Slug must be 3–80 lowercase letters, numbers or hyphens.");
  if (str(fd, "name").length < 2) throw new AppError("Name is required.");
  return {
    name: str(fd, "name"), subtitle: str(fd, "subtitle"), slug, brandId: str(fd, "brandId"), categoryId: str(fd, "categoryId"), collectionId: optStr(fd, "collectionId"),
    conceptId: optStr(fd, "conceptId"), format, status: ["DRAFT", "ACTIVE", "ARCHIVED"].includes(str(fd, "status")) ? str(fd, "status") : "DRAFT",
    shortDescription: str(fd, "shortDescription"), description: str(fd, "description"), moods: csvSlugs(str(fd, "moods")), occasions: csvSlugs(str(fd, "occasions")), seasons: csvSlugs(str(fd, "seasons")),
    intensity: ["SOFT", "MODERATE", "RICH", "AMBIENT"].includes(str(fd, "intensity")) ? str(fd, "intensity") : "MODERATE",
    gender: optStr(fd, "gender"), giftSuitability: optStr(fd, "giftSuitability"), replenishment: optStr(fd, "replenishment"), channels: str(fd, "channels"),
    isNew: bool(fd, "isNew"), isFeatured: bool(fd, "isFeatured"), isDiscoverySet: bool(fd, "isDiscoverySet"), isGiftSet: bool(fd, "isGiftSet"), merchRank: Math.round(num(fd, "merchRank")),
    nameStatus: str(fd, "nameStatus") === "LEGALLY_CLEARED" ? "LEGALLY_CLEARED" : "WORKING_NAME", claimsStatus: str(fd, "claimsStatus") === "VERIFIED" ? "VERIFIED" : "UNVERIFIED",
    longevityNote: optStr(fd, "longevityNote"), projectionNote: optStr(fd, "projectionNote"), ingredientsDeclaration: optStr(fd, "ingredientsDeclaration"), allergenDeclaration: optStr(fd, "allergenDeclaration"),
    regulatoryNotes: optStr(fd, "regulatoryNotes"), contentsNote: optStr(fd, "contentsNote"), seoTitle: optStr(fd, "seoTitle"), seoDescription: optStr(fd, "seoDescription"),
  };
}

export async function createProduct(fd: FormData) {
  await adminAction("catalog:write", "/admin/products/new", async (actor) => {
    const data = productData(fd);
    const p = await db.product.create({ data: { ...data, status: "DRAFT" } });
    await audit(actor, "product.create", "Product", p.id, data);
    redirect(`/admin/products/${p.id}?msg=${encodeURIComponent("Product created as a draft. Add a variant and approve it before activating.")}`);
  });
}

export async function updateProduct(fd: FormData) {
  const id = str(fd, "id");
  await adminAction("catalog:write", `/admin/products/${id}`, async (actor) => {
    const before = await db.product.findUniqueOrThrow({ where: { id } });
    const data = productData(fd);
    if (data.status === "ACTIVE" && (await db.variant.count({ where: { productId: id, status: "ACTIVE" } })) === 0) throw new AppError("Add at least one active variant before activating.");
    if (data.claimsStatus === "VERIFIED" && !data.longevityNote && !data.projectionNote) throw new AppError("A verified claim needs the substantiated wording in longevity or projection.");
    await db.product.update({ where: { id }, data: { ...data, deletedAt: data.status === "ARCHIVED" ? before.deletedAt ?? new Date() : null } });
    // Families with weights
    const fams = await db.fragranceFamily.findMany();
    await db.productFamily.deleteMany({ where: { productId: id } });
    for (const f of fams) {
      const w = Number(fd.get(`fam_${f.slug}`) || 0);
      if (w > 0) await db.productFamily.create({ data: { productId: id, familyId: f.id, weight: Math.min(100, Math.round(w)) } });
    }
    await audit(actor, "product.update", "Product", id, changed(before as unknown as Record<string, unknown>, data));
    revalidatePath("/", "layout");
    return "Product saved. The storefront is updated.";
  });
}

export async function archiveProduct(fd: FormData) {
  const id = str(fd, "id");
  const restore = str(fd, "restore") === "1";
  await adminAction("catalog:write", `/admin/products/${id}`, async (actor) => {
    await db.product.update({ where: { id }, data: restore ? { status: "DRAFT", deletedAt: null } : { status: "ARCHIVED", deletedAt: new Date() } });
    await audit(actor, restore ? "product.restore" : "product.archive", "Product", id);
    revalidatePath("/", "layout");
    return restore ? "Product restored as a draft." : "Product archived. It's hidden from the storefront; its order history is preserved.";
  });
}

export async function saveVariant(fd: FormData) {
  const productId = str(fd, "productId");
  const id = optStr(fd, "id");
  await adminAction("catalog:write", `/admin/products/${productId}`, async (actor) => {
    const product = await db.product.findUniqueOrThrow({ where: { id: productId }, include: { brand: true } });
    const mrp = rupeesToPaise(fd, "mrp");
    const price = rupeesToPaise(fd, "price");
    if (mrp <= 0 || price <= 0) throw new AppError("MRP and price must be positive.");
    if (price > mrp) throw new AppError("Selling price can't exceed MRP.");
    const floor = Math.ceil(mrp * (1 - product.brand.discountCeilingPct / 100));
    if (price < floor) throw new AppError(`${product.brand.name} allows at most ${product.brand.discountCeilingPct}% below MRP (minimum ₹${(floor / 100).toFixed(0)}).`);
    const conc = optStr(fd, "concentrationPct");
    const data = {
      label: str(fd, "label"), netQuantity: num(fd, "netQuantity"), netUnit: str(fd, "netUnit") === "g" ? "g" : "ml", mrpPaise: mrp, pricePaise: price,
      concentrationPct: conc === null ? null : Number(conc), concentrationStatus: str(fd, "concentrationStatus") === "VERIFIED" ? "VERIFIED" : "PROPOSED",
      priceStatus: str(fd, "priceStatus") === "APPROVED" ? "APPROVED" : "PROPOSED", gstRatePct: num(fd, "gstRatePct"), hsnCode: optStr(fd, "hsnCode"), barcode: optStr(fd, "barcode"),
      status: str(fd, "status") === "ACTIVE" ? "ACTIVE" : "INACTIVE", sortOrder: Math.round(num(fd, "sortOrder") || 0),
    };
    if (!data.label) throw new AppError("Variant label is required.");
    if (id) {
      const before = await db.variant.findUniqueOrThrow({ where: { id } });
      await db.variant.update({ where: { id }, data });
      await audit(actor, "variant.update", "Variant", id, changed(before as unknown as Record<string, unknown>, data));
    } else {
      const sku = str(fd, "sku").toUpperCase();
      if (!/^[A-Z0-9-]{3,20}$/.test(sku)) throw new AppError("SKU must be 3–20 characters (A–Z, 0–9, -).");
      const v = await db.variant.create({ data: { ...data, sku, productId } });
      await audit(actor, "variant.create", "Variant", v.id, data);
    }
    revalidatePath("/", "layout");
    return "Variant saved.";
  });
}

export async function uploadMedia(fd: FormData) {
  const productId = str(fd, "productId");
  await adminAction("catalog:write", `/admin/products/${productId}`, async (actor) => {
    const file = fd.get("file");
    if (!(file instanceof File)) throw new AppError("Choose a file.");
    const slot = str(fd, "slot");
    const saved = await saveUpload(file, { allow: slot === "VIDEO" ? ["VIDEO"] : ["IMAGE"], maxBytes: slot === "VIDEO" ? 40 * 1024 * 1024 : 8 * 1024 * 1024, folder: "products" });
    const alt = str(fd, "alt");
    if (alt.length < 3) throw new AppError("Describe the image in the alt text (for accessibility).");
    const m = await db.mediaAsset.create({ data: { productId, slot, url: saved.url, alt, mimeType: saved.mimeType, bytes: saved.bytes, sortOrder: Math.round(num(fd, "sortOrder") || 0), isApproved: false } });
    await audit(actor, "media.upload", "MediaAsset", m.id, { slot, url: saved.url });
    return "Uploaded. Approve it to show it on the storefront.";
  });
}

export async function mediaAction(fd: FormData) {
  const productId = str(fd, "productId");
  await adminAction("catalog:write", `/admin/products/${productId}`, async (actor) => {
    const id = str(fd, "mediaId");
    const op = str(fd, "op");
    if (op === "delete") await db.mediaAsset.delete({ where: { id } });
    else await db.mediaAsset.update({ where: { id }, data: { isApproved: op === "approve" } });
    await audit(actor, `media.${op}`, "MediaAsset", id);
    revalidatePath("/", "layout");
    return op === "delete" ? "Media removed." : op === "approve" ? "Approved: now shown on the storefront." : "Hidden from the storefront.";
  });
}

export async function stockAdjust(fd: FormData) {
  await adminAction("inventory:write", "/admin/inventory", async (actor) => {
    const delta = Math.round(num(fd, "delta"));
    if (!delta) throw new AppError("Enter a non-zero quantity.");
    const reason = ["RECEIPT", "ADJUSTMENT", "RETURN"].includes(str(fd, "reason")) ? (str(fd, "reason") as "RECEIPT" | "ADJUSTMENT" | "RETURN") : "ADJUSTMENT";
    await adjustStock(str(fd, "variantId"), str(fd, "warehouseId"), delta, reason, actor, optStr(fd, "reference") ?? undefined);
    await audit(actor, "inventory.adjust", "Variant", str(fd, "variantId"), { delta, reason, warehouseId: str(fd, "warehouseId") });
    revalidatePath("/", "layout");
    return `Stock ${delta > 0 ? "increased" : "reduced"} by ${Math.abs(delta)}.`;
  });
}

export async function saveBatch(fd: FormData) {
  await adminAction("inventory:write", "/admin/inventory", async (actor) => {
    const id = optStr(fd, "id");
    if (id) {
      const status = str(fd, "status");
      if (!["QUARANTINE", "RELEASED", "BLOCKED"].includes(status)) throw new AppError("Invalid batch status.");
      const b = await db.batch.findUniqueOrThrow({ where: { id } });
      if (status === "RELEASED" && !b.ifraCertificate) throw new AppError("A batch can't be released without an IFRA certificate reference.");
      await db.batch.update({ where: { id }, data: { status } });
      await audit(actor, "batch.status", "Batch", id, { status });
      return `Batch ${status.toLowerCase()}.`;
    }
    const sku = str(fd, "sku").toUpperCase();
    const v = await db.variant.findUnique({ where: { sku } });
    if (!v) throw new AppError(`No variant with SKU ${sku}.`);
    const b = await db.batch.create({ data: { variantId: v.id, batchCode: str(fd, "batchCode"), manufacturedAt: fd.get("manufacturedAt") ? new Date(str(fd, "manufacturedAt")) : null, bestBefore: fd.get("bestBefore") ? new Date(str(fd, "bestBefore")) : null, ifraCertificate: optStr(fd, "ifraCertificate"), coaUrl: optStr(fd, "coaUrl") } });
    await audit(actor, "batch.create", "Batch", b.id, { sku });
    return "Batch recorded in quarantine. Release it once QC passes.";
  });
}

export async function requireCatalog() { return requireStaff("catalog:write"); }
