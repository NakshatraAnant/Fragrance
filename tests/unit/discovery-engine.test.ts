import { describe, it, expect, beforeAll } from "vitest";
import { getAllCards, applyFilters, type ProductCard } from "@/lib/catalog";
import { rulesRecommender, EMPTY_ANSWERS, type FinderAnswers } from "@/lib/recommend";
import { searchCatalogue, parseQuery, suggest } from "@/lib/search";
import { SETTING_DEFAULTS } from "@/lib/settings-defaults";

let cards: ProductCard[];
const W = SETTING_DEFAULTS.finderWeights;
beforeAll(async () => { cards = await getAllCards(); });

describe("catalogue import", () => {
  it("has the full 69-SKU Phase-One portfolio across three brands", () => {
    expect(cards).toHaveLength(55);
    expect(cards.flatMap((c) => c.variants)).toHaveLength(69);
    const byBrand = (b: string) => cards.filter((c) => c.brand.slug === b).flatMap((c) => c.variants).length;
    expect([byBrand("dhun"), byBrand("vasana"), byBrand("anvaya")]).toEqual([17, 44, 8]);
    const mogra = cards.find((c) => c.slug === "mogra-hour-eau-de-parfum")!;
    expect(mogra.variants.map((v) => [v.sku, v.label, v.pricePaise])).toEqual([["VA-01", "50 ml", 295000], ["VA-02", "100 ml", 425000]]);
  });
  it("never seeds ratings", () => expect(cards.every((c) => c.rating === null)).toBe(true));
});

describe("listing filters", () => {
  it("filters by brand, family, price and stock, and sorts by price", () => {
    const r = applyFilters(cards, { brand: ["vasana"], family: ["earthy"], sort: "price-asc" });
    expect(r.length).toBeGreaterThan(0);
    expect(r.every((c) => c.brand.slug === "vasana" && c.families.some((f) => f.slug === "earthy"))).toBe(true);
    for (let i = 1; i < r.length; i++) expect(r[i].minPricePaise).toBeGreaterThanOrEqual(r[i - 1].minPricePaise);
    expect(applyFilters(cards, { maxPrice: 50000 }).every((c) => c.minPricePaise <= 50000)).toBe(true);
    expect(applyFilters(cards, { inStock: true }).some((c) => c.slug === "vasana-festive-coffret")).toBe(false);
  });
});

describe("recommendation engine", () => {
  const a = (o: Partial<FinderAnswers>): FinderAnswers => ({ ...EMPTY_ANSWERS, ...o });
  it("ranks earthy, monsoon scents first for a petrichor lover and explains why", () => {
    const r = rulesRecommender.recommend(a({ families: ["earthy"], seasons: ["monsoon"], formats: ["EDP"] }), cards, W);
    expect(r.matches[0].card.families[0].slug).toBe("earthy");
    expect(r.matches[0].reasons.join(" ")).toMatch(/Earthy/);
    expect(r.personalityTitle).toBe("The Monsoon Wanderer");
  });
  it("respects disliked notes, budget and format as hard filters", () => {
    const r = rulesRecommender.recommend(a({ dislikedNotes: ["vetiver"], budgetMaxPaise: 100000, formats: ["EDP"] }), cards, W, 20);
    expect(r.matches.every((m) => !m.card.noteSlugs.includes("vetiver"))).toBe(true);
    expect(r.matches.every((m) => m.card.minPricePaise <= 100000)).toBe(true);
    expect(r.matches.every((m) => m.card.format === "EDP")).toBe(true);
    expect(r.exclusions.some((e) => /vetiver/.test(e.reason))).toBe(true);
  });
  it("excludes out-of-stock products and returns one product per scent", () => {
    const r = rulesRecommender.recommend(a({ families: ["white-floral"] }), cards, W, 20);
    const concepts = r.matches.map((m) => m.card.conceptId);
    expect(new Set(concepts).size).toBe(concepts.length);
    expect(r.matches.every((m) => m.card.available)).toBe(true);
  });
  it("suggests a discovery set that contains top matches", () => {
    const r = rulesRecommender.recommend(a({ families: ["white-floral", "rose"], brands: ["vasana"], formats: ["EDP"] }), cards, W);
    expect(r.discoverySet?.slug).toBe("vasana-discovery-set");
  });
  it("only recommends home products when home is requested", () => {
    const off = rulesRecommender.recommend(a({ families: ["earthy"] }), cards, W, 30);
    expect(off.matches.some((m) => m.card.category === "home-fragrance")).toBe(false);
    const on = rulesRecommender.recommend(a({ families: ["earthy"], formats: ["HOME"] }), cards, W, 30);
    expect(on.matches.length).toBeGreaterThan(0);
    expect(on.matches.every((m) => ["CANDLE", "REED", "ROOM_SPRAY", "CAR", "BAKHOOR"].includes(m.card.format))).toBe(true);
  });
});

describe("search", () => {
  it("understands the blueprint's example queries", () => {
    const names = (q: string) => searchCatalogue(q, cards).results.map((c) => c.slug);
    expect(names("Mogra perfume")[0]).toMatch(/^mogra-hour/);
    expect(names("Attar").every((s) => cards.find((c) => c.slug === s)!.format.match(/ATTAR|RUH|DISCOVERY|GIFT/))).toBe(true); // the festive coffret contains an attar
    expect(names("Woody fragrance for office")).toContain("malabar-pepper-eau-de-parfum");
    expect(names("Fresh perfume for summer").length).toBeGreaterThan(0);
    expect(names("Wedding fragrance").length).toBeGreaterThan(0);
    const gifts = searchCatalogue("Perfume gift under ₹3,000", cards);
    expect(gifts.parsed.maxPricePaise).toBe(300000);
    expect(gifts.results.length).toBeGreaterThan(0);
    expect(gifts.results.every((c) => c.minPricePaise <= 300000)).toBe(true);
    expect(names("kesar")).toContain("saffron-sandal-eau-de-parfum");
  });
  it("parses price intents and recovers from zero results", () => {
    expect(parseQuery("candle under 2.5k").maxPricePaise).toBe(250000);
    const z = searchCatalogue("xyzzy unicorn", cards);
    expect(z.results).toHaveLength(0);
    expect(z.zeroResultRecovery.length).toBeGreaterThan(0);
  });
  it("suggests products and vocabulary as you type", () => {
    const s = suggest("mog", cards);
    expect(s.products.some((p) => p.name === "Mogra Hour")).toBe(true);
  });
});
