/**
 * Catalogue search over real product metadata (names, brands, families, brief notes, moods,
 * occasions, seasons, formats, categories, stories). Understands Indian vocabulary (mogra, khus,
 * kesar, chandan, mitti, attar…) via synonyms, and parses price intents like "under ₹3,000".
 * Pure and in-memory: appropriate for the Phase-One catalogue; swap for Postgres FTS / Meilisearch
 * behind the same function if the catalogue grows by orders of magnitude.
 */
import type { ProductCard } from "./catalog";

export const SYNONYMS: Record<string, string[]> = {
  mogra: ["jasmine", "jasmine-sambac", "white-floral"], jasmine: ["mogra", "white-floral"], chameli: ["jasmine"],
  gulab: ["rose"], rose: ["gulab"], kesar: ["saffron"], saffron: ["kesar"], chandan: ["sandalwood"], sandal: ["sandalwood"], sandalwood: ["chandan", "woody"],
  khus: ["vetiver"], vetiver: ["khus"], mitti: ["earthy", "petrichor", "earth"], petrichor: ["earthy", "rain", "mitti"], rain: ["petrichor", "earthy", "monsoon"],
  attar: ["ATTAR", "RUH", "oil"], ittar: ["ATTAR"], oil: ["ATTAR", "RUH"], ruh: ["RUH"], oud: ["oud"], agarwood: ["oud"],
  elaichi: ["cardamom"], cardamom: ["elaichi"], chai: ["tea"], tea: ["green-tea", "black-tea"], nimbu: ["lime", "fresh-citrus"], lemon: ["lime", "fresh-citrus"],
  citrus: ["fresh-citrus"], fresh: ["fresh", "fresh-citrus", "aquatic", "green-tea"], clean: ["clean", "musk"], floral: ["white-floral", "rose"],
  sweet: ["gourmand"], coffee: ["roasted-coffee-accord", "gourmand"], kaapi: ["coffee"], vanilla: ["gourmand"], spicy: ["spicy"], woody: ["woody"], musk: ["musk"], kasturi: ["musk"],
  incense: ["incense-resin"], loban: ["incense-resin"], amber: ["amber"], champa: ["champaca"],
  perfume: ["EDP", "EXTRAIT"], edp: ["EDP"], extrait: ["EXTRAIT"], mist: ["MIST"], candle: ["CANDLE"], diffuser: ["REED"], reed: ["REED"], car: ["CAR"], bakhoor: ["BAKHOOR"],
  solid: ["SOLID"], travel: ["TRAVEL", "travel"], sample: ["DISCOVERY"], samples: ["DISCOVERY"], discovery: ["DISCOVERY"], gift: ["gifting", "GIFT"], gifting: ["gifting"], coffret: ["GIFT", "DISCOVERY"],
  home: ["home", "CANDLE", "REED", "ROOM_SPRAY"], room: ["ROOM_SPRAY"],
  office: ["office"], work: ["office"], wedding: ["wedding"], shaadi: ["wedding"], sangeet: ["party"], party: ["party"], date: ["date"], gym: ["gym"], festive: ["festive"], diwali: ["festive", "gifting"], eid: ["festive"], prayer: ["prayer"], pooja: ["prayer"], puja: ["prayer"], daily: ["daily"], everyday: ["daily"], night: ["evening"], evening: ["evening"],
  summer: ["summer"], hot: ["summer"], monsoon: ["monsoon"], winter: ["winter"], cold: ["winter"],
  men: ["masculine"], man: ["masculine"], him: ["masculine"], women: ["feminine"], woman: ["feminine"], her: ["feminine"], unisex: ["unisex"],
};

const STOP = new Set(["for", "a", "an", "the", "and", "with", "perfume", "fragrance", "scent", "smell", "under", "below", "less", "than", "rs", "inr", "of", "to", "in", "me", "my"]);

export type ParsedQuery = { terms: string[]; maxPricePaise: number | null; minPricePaise: number | null };

export function parseQuery(raw: string): ParsedQuery {
  const q = raw.toLowerCase().replace(/(\d),(?=\d)/g, "$1").replace(/[₹,]/g, " ").replace(/\s+/g, " ").trim();
  let maxPricePaise: number | null = null, minPricePaise: number | null = null;
  const under = q.match(/(?:under|below|less than|upto|up to|within|<)\s*(?:rs\.?\s*)?(\d+(?:\.\d+)?)\s*(k)?/);
  if (under) maxPricePaise = Math.round(parseFloat(under[1]) * (under[2] ? 1000 : 1) * 100);
  const over = q.match(/(?:over|above|more than|>)\s*(?:rs\.?\s*)?(\d+(?:\.\d+)?)\s*(k)?/);
  if (over) minPricePaise = Math.round(parseFloat(over[1]) * (over[2] ? 1000 : 1) * 100);
  const terms = q.replace(/(?:under|below|less than|upto|up to|within|over|above|more than)\s*(?:rs\.?\s*)?\d+(?:\.\d+)?k?/g, " ").split(/[^a-z0-9-]+/).filter((t) => t && !STOP.has(t) && !/^\d+$/.test(t));
  return { terms, maxPricePaise, minPricePaise };
}

type Doc = { card: ProductCard; fields: { text: string; weight: number }[]; tags: Set<string> };

export function buildDocs(cards: ProductCard[]): Doc[] {
  return cards.map((c) => {
    const tags = new Set<string>([c.format, c.category, c.brand.slug, ...c.families.map((f) => f.slug), ...c.noteSlugs, ...c.moods, ...c.occasions, ...c.seasons, c.gender?.toLowerCase().split("-")[0] ?? "", c.intensity.toLowerCase()]);
    if (c.gender?.toLowerCase().includes("unisex")) tags.add("unisex");
    return {
      card: c, tags,
      fields: [
        { text: c.name.toLowerCase(), weight: 10 },
        { text: `${c.subtitle} ${c.brand.name}`.toLowerCase(), weight: 4 },
        { text: c.families.map((f) => f.name).join(" ").toLowerCase(), weight: 4 },
        { text: [...c.notes.top, ...c.notes.heart, ...c.notes.base].join(" ").toLowerCase(), weight: 3 },
        { text: c.shortDescription.toLowerCase(), weight: 1 },
      ],
    };
  });
}

function stem(t: string) {
  return t.length > 4 && t.endsWith("s") ? t.slice(0, -1) : t;
}

export function scoreDoc(doc: Doc, term: string): number {
  const t = stem(term);
  let s = 0;
  for (const f of doc.fields) if (f.text.includes(t)) s += f.weight * (new RegExp(`\\b${t.replace(/[-]/g, "\\-")}`).test(f.text) ? 1.5 : 1);
  if (doc.tags.has(t) || doc.tags.has(t.toUpperCase())) s += 6;
  for (const syn of SYNONYMS[t] ?? []) {
    if (doc.tags.has(syn)) s += 5;
    else if (doc.fields.some((f) => f.text.includes(syn.toLowerCase().replace(/-/g, " ")))) s += 3;
  }
  return s;
}

export type SearchResult = { results: ProductCard[]; parsed: ParsedQuery; interpretation: string[]; zeroResultRecovery: ProductCard[] };

export function searchCatalogue(raw: string, cards: ProductCard[]): SearchResult {
  const parsed = parseQuery(raw);
  const docs = buildDocs(cards);
  const scored: { card: ProductCard; score: number; matched: number }[] = [];
  for (const d of docs) {
    if (parsed.maxPricePaise !== null && d.card.minPricePaise > parsed.maxPricePaise) continue;
    if (parsed.minPricePaise !== null && d.card.maxPricePaise < parsed.minPricePaise) continue;
    let score = 0, matched = 0;
    for (const t of parsed.terms) { const s = scoreDoc(d, t); if (s > 0) { score += s; matched++; } }
    if (!parsed.terms.length) score = 1, matched = 0;
    // Require every term to match something when the query has ≤3 terms; otherwise at least half.
    const needed = parsed.terms.length <= 3 ? parsed.terms.length : Math.ceil(parsed.terms.length / 2);
    if (score > 0 && matched >= needed) scored.push({ card: d.card, score: score + (d.card.available ? 1 : 0), matched });
  }
  scored.sort((a, b) => b.score - a.score || a.card.merchRank - b.card.merchRank);
  const interpretation = [
    ...parsed.terms.map((t) => (SYNONYMS[t] ? `${t} → ${SYNONYMS[t].slice(0, 2).join(", ").toLowerCase()}` : t)),
    ...(parsed.maxPricePaise !== null ? [`under ₹${(parsed.maxPricePaise / 100).toLocaleString("en-IN")}`] : []),
    ...(parsed.minPricePaise !== null ? [`over ₹${(parsed.minPricePaise / 100).toLocaleString("en-IN")}`] : []),
  ];
  let zeroResultRecovery: ProductCard[] = [];
  if (!scored.length) {
    // Recover with partial matches, then with discovery sets.
    const partial = docs.map((d) => ({ card: d.card, score: parsed.terms.reduce((s, t) => s + scoreDoc(d, t), 0) })).filter((x) => x.score > 0).sort((a, b) => b.score - a.score).slice(0, 4).map((x) => x.card);
    zeroResultRecovery = partial.length ? partial : cards.filter((c) => c.isDiscoverySet).slice(0, 4);
  }
  return { results: scored.map((s) => s.card), parsed, interpretation, zeroResultRecovery };
}

export function suggest(raw: string, cards: ProductCard[], limit = 6) {
  const q = raw.toLowerCase().trim();
  if (q.length < 2) return { products: [], terms: [] as string[] };
  const products = cards.filter((c) => c.name.toLowerCase().includes(q) || c.noteSlugs.some((n) => n.includes(q)) || c.families.some((f) => f.name.toLowerCase().includes(q))).slice(0, limit);
  const vocab = new Set<string>();
  for (const c of cards) { c.families.forEach((f) => vocab.add(f.name)); [...c.notes.top, ...c.notes.heart, ...c.notes.base].forEach((n) => vocab.add(n)); }
  Object.keys(SYNONYMS).forEach((k) => vocab.add(k));
  const terms = [...vocab].filter((t) => t.toLowerCase().startsWith(q) || (q.length > 3 && t.toLowerCase().includes(q))).slice(0, 5);
  return { products, terms };
}

export const POPULAR_SEARCHES = ["Mogra perfume", "Fresh perfume for summer", "Woody fragrance for office", "Attar", "Wedding fragrance", "Perfume gift under ₹3,000", "First rain", "Candles"];
