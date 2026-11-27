import type { MetadataRoute } from "next";
import { db } from "@/lib/db";
import { env } from "@/lib/env";
import { B2B_SERVICES } from "@/lib/b2b";
import { GIFT_OCCASIONS } from "@/lib/gifting";

export const dynamic = "force-dynamic";

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const base = env.appUrl();
  const [products, collections, families, posts, campaigns, pages] = await Promise.all([
    db.product.findMany({ where: { status: "ACTIVE", deletedAt: null }, select: { slug: true, updatedAt: true } }),
    db.collection.findMany({ where: { isActive: true }, include: { brand: true } }),
    db.fragranceFamily.findMany({ select: { slug: true } }),
    db.journalPost.findMany({ where: { status: "PUBLISHED" }, select: { slug: true, publishedAt: true } }),
    db.campaign.findMany({ where: { status: "PUBLISHED" }, include: { brand: true } }),
    db.cmsPage.findMany({ where: { status: "PUBLISHED" }, select: { slug: true, updatedAt: true } }),
  ]);
  const staticPaths = ["", "/shop", "/new", "/bestsellers", "/discover", "/families", "/scent-finder", "/discovery", "/layering", "/gifting", "/journal", "/dhun", "/vasana", "/anvaya", "/dhun/story", "/vasana/story", "/anvaya/story", "/anvaya/appointment", "/odaya", "/odaya/capabilities", "/odaya/quality", "/odaya/quote", "/odaya/sample", "/odaya/enquiry", "/odaya/contact"];
  return [
    ...staticPaths.map((p) => ({ url: `${base}${p}`, changeFrequency: "weekly" as const, priority: p === "" ? 1 : 0.7 })),
    ...products.map((p) => ({ url: `${base}/product/${p.slug}`, lastModified: p.updatedAt, priority: 0.8 })),
    ...collections.map((c) => ({ url: `${base}/${c.brand.slug}/collections/${c.slug}` })),
    ...families.map((f) => ({ url: `${base}/families/${f.slug}` })),
    ...posts.map((p) => ({ url: `${base}/journal/${p.slug}`, lastModified: p.publishedAt })),
    ...campaigns.map((c) => ({ url: `${base}/${c.brand.slug}/campaign/${c.slug}` })),
    ...pages.map((p) => ({ url: `${base}/${p.slug}`, lastModified: p.updatedAt })),
    ...B2B_SERVICES.map((s) => ({ url: `${base}/odaya/${s.slug}` })),
    ...Object.keys(GIFT_OCCASIONS).map((o) => ({ url: `${base}/gifting/${o}` })),
  ];
}
