import { cache } from "react";
import { db } from "./db";
import { availabilityFor } from "./inventory";

const productInclude = {
  brand: { select: { slug: true, name: true, tier: true } },
  category: { select: { slug: true, name: true } },
  collection: { select: { slug: true, name: true } },
  concept: { include: { notes: { include: { note: true }, orderBy: { position: "asc" as const } } } },
  families: { include: { family: true }, orderBy: { weight: "desc" as const } },
  variants: { where: { status: "ACTIVE" }, orderBy: { sortOrder: "asc" as const } },
  media: { where: { isApproved: true }, orderBy: { sortOrder: "asc" as const } },
};

export type CatalogProduct = Awaited<ReturnType<typeof loadActiveProducts>>[number];

export type CardVariant = { id: string; sku: string; label: string; pricePaise: number; mrpPaise: number; available: number; netQuantity: number; netUnit: string };
export type ProductCard = {
  id: string; slug: string; name: string; subtitle: string; brand: { slug: string; name: string }; format: string; category: string; collection: string | null;
  shortDescription: string; colour: string | null; families: { slug: string; name: string; colour: string; weight: number }[];
  notes: { top: string[]; heart: string[]; base: string[] }; noteSlugs: string[];
  moods: string[]; occasions: string[]; seasons: string[]; intensity: string; gender: string | null;
  minPricePaise: number; maxPricePaise: number; variants: CardVariant[]; available: boolean;
  rating: { average: number; count: number } | null; badges: string[]; image: { url: string; alt: string } | null;
  isNew: boolean; isDiscoverySet: boolean; isGiftSet: boolean; isFeatured: boolean; merchRank: number; giftSuitability: string | null; conceptCode: string | null; conceptId: string | null; launchedAt: string;
};

export const loadActiveProducts = cache(async () =>
  db.product.findMany({ where: { status: "ACTIVE", deletedAt: null }, include: productInclude, orderBy: [{ merchRank: "asc" }, { name: "asc" }] }),
);

const csv = (s: string) => (s ? s.split(",").map((x) => x.trim()).filter(Boolean) : []);

export function toCard(p: CatalogProduct, avail: Record<string, number>, ratings: Record<string, { average: number; count: number }>): ProductCard {
  const variants = p.variants.map((v) => ({ id: v.id, sku: v.sku, label: v.label, pricePaise: v.pricePaise, mrpPaise: v.mrpPaise, available: avail[v.id] ?? 0, netQuantity: v.netQuantity, netUnit: v.netUnit }));
  const prices = variants.map((v) => v.pricePaise);
  const notes = { top: [] as string[], heart: [] as string[], base: [] as string[] };
  for (const cn of p.concept?.notes ?? []) notes[cn.layer === "TOP" ? "top" : cn.layer === "HEART" ? "heart" : "base"].push(cn.note.name);
  const available = variants.some((v) => v.available > 0);
  const badges: string[] = [];
  if (p.isNew) badges.push("New");
  if (p.isDiscoverySet) badges.push("Discovery set");
  if (p.format === "ATTAR" || p.format === "RUH") badges.push("Alcohol-free oil");
  if (p.giftSuitability === "High" && !p.isDiscoverySet) badges.push("Gift-ready");
  if (!available) badges.unshift("Out of stock");
  const main = p.media.find((m) => m.slot === "MAIN") ?? p.media[0];
  return {
    id: p.id, slug: p.slug, name: p.name, subtitle: p.subtitle, brand: { slug: p.brand.slug, name: p.brand.name }, format: p.format, category: p.category.slug, collection: p.collection?.slug ?? null,
    shortDescription: p.shortDescription, colour: p.concept?.colour ?? null,
    families: p.families.map((f) => ({ slug: f.family.slug, name: f.family.name, colour: f.family.colour, weight: f.weight })),
    notes, noteSlugs: (p.concept?.notes ?? []).map((n) => n.note.slug),
    moods: csv(p.moods), occasions: csv(p.occasions), seasons: csv(p.seasons), intensity: p.intensity, gender: p.gender,
    minPricePaise: prices.length ? Math.min(...prices) : 0, maxPricePaise: prices.length ? Math.max(...prices) : 0, variants, available,
    rating: ratings[p.id] ?? null, badges, image: main ? { url: main.url, alt: main.alt } : null,
    isNew: p.isNew, isDiscoverySet: p.isDiscoverySet, isGiftSet: p.isGiftSet, isFeatured: p.isFeatured, merchRank: p.merchRank, giftSuitability: p.giftSuitability,
    conceptCode: p.concept?.code ?? null, conceptId: p.conceptId, launchedAt: p.launchedAt.toISOString(),
  };
}

/** Genuine approved-review aggregates only. */
export async function ratingsFor(productIds: string[]) {
  if (!productIds.length) return {};
  const rows = await db.review.groupBy({ by: ["productId"], where: { productId: { in: productIds }, status: "APPROVED" }, _avg: { rating: true }, _count: { _all: true } });
  return Object.fromEntries(rows.map((r) => [r.productId, { average: Math.round((r._avg.rating ?? 0) * 10) / 10, count: r._count._all }]));
}

export const getAllCards = cache(async (): Promise<ProductCard[]> => {
  const products = await loadActiveProducts();
  const [avail, ratings] = await Promise.all([availabilityFor(products.flatMap((p) => p.variants.map((v) => v.id))), ratingsFor(products.map((p) => p.id))]);
  return products.map((p) => toCard(p, avail, ratings));
});

export type ListingFilters = {
  brand?: string[]; category?: string[]; collection?: string; family?: string[]; note?: string[]; occasion?: string[]; season?: string[]; mood?: string[];
  intensity?: string[]; format?: string[]; size?: string[]; minPrice?: number; maxPrice?: number; inStock?: boolean; q?: string; gift?: boolean;
  sort?: "featured" | "price-asc" | "price-desc" | "new" | "name" | "rating"; ids?: string[];
};

export function applyFilters(cards: ProductCard[], f: ListingFilters): ProductCard[] {
  const any = (want: string[] | undefined, have: string[]) => !want?.length || want.some((w) => have.includes(w));
  let out = cards.filter((c) =>
    (!f.ids || f.ids.includes(c.id)) &&
    any(f.brand, [c.brand.slug]) && any(f.category, [c.category]) && (!f.collection || c.collection === f.collection) &&
    any(f.family, c.families.map((x) => x.slug)) && any(f.note, c.noteSlugs) && any(f.occasion, c.occasions) &&
    any(f.season, c.seasons.includes("all-season") ? [...(f.season ?? []), "all-season"] : c.seasons) && any(f.mood, c.moods) &&
    any(f.intensity, [c.intensity]) && any(f.format, [c.format]) && any(f.size, c.variants.map((v) => v.label)) &&
    (f.minPrice === undefined || c.maxPricePaise >= f.minPrice) && (f.maxPrice === undefined || c.minPricePaise <= f.maxPrice) &&
    (!f.inStock || c.available) && (!f.gift || c.giftSuitability === "High"),
  );
  const s = f.sort ?? "featured";
  out = [...out].sort((a, b) => {
    switch (s) {
      case "price-asc": return a.minPricePaise - b.minPricePaise;
      case "price-desc": return b.maxPricePaise - a.maxPricePaise;
      case "new": return b.launchedAt.localeCompare(a.launchedAt) || a.merchRank - b.merchRank;
      case "name": return a.name.localeCompare(b.name);
      case "rating": return (b.rating?.average ?? 0) - (a.rating?.average ?? 0) || (b.rating?.count ?? 0) - (a.rating?.count ?? 0);
      default: return Number(b.available) - Number(a.available) || a.merchRank - b.merchRank;
    }
  });
  return out;
}

export function parseListingParams(sp: Record<string, string | string[] | undefined>): ListingFilters {
  const list = (k: string) => { const v = sp[k]; return v === undefined ? undefined : (Array.isArray(v) ? v : v.split(",")).filter(Boolean); };
  const num = (k: string) => { const v = sp[k]; const n = Number(Array.isArray(v) ? v[0] : v); return Number.isFinite(n) && v !== undefined && v !== "" ? Math.round(n * 100) : undefined; };
  const sort = (Array.isArray(sp.sort) ? sp.sort[0] : sp.sort) as ListingFilters["sort"];
  return {
    brand: list("brand"), category: list("category"), family: list("family"), note: list("note"), occasion: list("occasion"), season: list("season"), mood: list("mood"),
    intensity: list("intensity"), format: list("format"), size: list("size"), minPrice: num("min"), maxPrice: num("max"), inStock: sp.instock === "1", gift: sp.gift === "1",
    sort: ["featured", "price-asc", "price-desc", "new", "name", "rating"].includes(sort ?? "") ? sort : undefined,
  };
}

/** Bestsellers ranked by actual paid units. Falls back to merchandiser ranking, labelled as such. */
export async function bestsellerCards(limit = 8): Promise<{ cards: ProductCard[]; basis: "SALES" | "CURATED" }> {
  const cards = await getAllCards();
  const sold = await db.orderItem.groupBy({ by: ["variantId"], where: { order: { paymentStatus: "PAID" } }, _sum: { quantity: true } });
  if (sold.length < 3) return { cards: cards.filter((c) => c.isFeatured || c.format === "EDP").slice(0, limit), basis: "CURATED" };
  const vToP: Record<string, string> = {};
  for (const c of cards) for (const v of c.variants) vToP[v.id] = c.id;
  const units: Record<string, number> = {};
  for (const s of sold) { const pid = vToP[s.variantId]; if (pid) units[pid] = (units[pid] ?? 0) + (s._sum.quantity ?? 0); }
  return { cards: cards.filter((c) => units[c.id]).sort((a, b) => units[b.id] - units[a.id]).slice(0, limit), basis: "SALES" };
}

export async function getProductBySlug(slug: string) {
  const p = await db.product.findFirst({ where: { slug, deletedAt: null, status: "ACTIVE" }, include: { ...productInclude, concept: { include: { notes: { include: { note: true }, orderBy: { position: "asc" } } } }, setContents: { include: { product: { select: { slug: true, name: true, subtitle: true } } } } } });
  return p;
}

export async function cardsByIds(ids: string[]) {
  const all = await getAllCards();
  const map = new Map(all.map((c) => [c.id, c]));
  return ids.map((id) => map.get(id)).filter(Boolean) as ProductCard[];
}
