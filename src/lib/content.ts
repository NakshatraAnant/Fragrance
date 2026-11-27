import { cache } from "react";
import { db } from "./db";
import { getAllCards } from "./catalog";

export const getFamiliesWithCounts = cache(async () => {
  const [fams, cards] = await Promise.all([db.fragranceFamily.findMany({ orderBy: { sortOrder: "asc" } }), getAllCards()]);
  return fams.map((f) => ({ ...f, count: cards.filter((c) => c.families.some((x) => x.slug === f.slug && x.weight >= 60)).length }));
});

export async function activeHomepageSections() {
  const now = new Date();
  const rows = await db.homepageSection.findMany({ where: { isActive: true }, orderBy: { sortOrder: "asc" } });
  return rows.filter((s) => (!s.startsAt || s.startsAt <= now) && (!s.endsAt || s.endsAt >= now)).map((s) => ({ ...s, config: JSON.parse(s.config || "{}") as Record<string, unknown> }));
}

export async function approvedReviews(limit = 6) {
  return db.review.findMany({ where: { status: "APPROVED" }, orderBy: { createdAt: "desc" }, take: limit, include: { product: { select: { name: true, slug: true } }, user: { select: { name: true } } } });
}

export async function layeringPairs() {
  return db.layeringPair.findMany({ where: { isActive: true }, include: { productA: { select: { id: true, slug: true, name: true, subtitle: true } }, productB: { select: { id: true, slug: true, name: true, subtitle: true } } } });
}

export async function journalPosts(limit = 6, brandSlug?: string) {
  return db.journalPost.findMany({ where: { status: "PUBLISHED", ...(brandSlug ? { brand: { slug: brandSlug } } : {}) }, orderBy: { publishedAt: "desc" }, take: limit, include: { brand: true } });
}

export async function cmsPage(slug: string) {
  return db.cmsPage.findFirst({ where: { slug, status: "PUBLISHED" } });
}

export async function brandBanner(brand: string) {
  const now = new Date();
  return db.banner.findFirst({ where: { placement: `BRAND_${brand.toUpperCase()}`, isActive: true, OR: [{ startsAt: null }, { startsAt: { lte: now } }] }, orderBy: { sortOrder: "asc" } });
}

export { getAllCards };
