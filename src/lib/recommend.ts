/**
 * Scent Finder recommendation engine — transparent, rules-based (engine "rules-1.0").
 *
 * Each product carries configurable preference attributes (families with weights, brief notes,
 * moods, occasions, seasons, a concentration-based intensity guide, format and price). Answers are
 * scored against them with admin-configurable weights. Hard filters: availability, disliked notes,
 * budget and format. The score is a *preference match*, not a scientific prediction.
 *
 * The `Recommender` interface lets a future ML model replace `rulesRecommender` without UI changes.
 */
import type { ProductCard } from "./catalog";

export type FinderAnswers = {
  families: string[];
  likedNotes: string[];
  dislikedNotes: string[];
  moods: string[];
  occasions: string[];
  seasons: string[];
  intensity: "SOFT" | "MODERATE" | "RICH" | "ANY";
  formats: string[]; // EDP, MIST, ATTAR, SOLID, TRAVEL, EXTRAIT, HOME, DISCOVERY
  budgetMaxPaise: number | null;
  leaning: "feminine" | "masculine" | "unisex" | "any";
  brands: string[];
};

export type Weights = { family: number; likedNotes: number; mood: number; occasion: number; season: number; intensity: number; format: number };

export type Match = { productId: string; slug: string; score: number; reasons: string[]; card: ProductCard };
export type Exclusion = { productId: string; name: string; reason: string };
export type FinderResult = {
  engineVersion: string;
  personalityTitle: string;
  summary: string;
  matches: Match[];
  discoverySet: { productId: string; slug: string; name: string; covers: number; reason: string } | null;
  familyProfile: { slug: string; name: string; colour: string; value: number }[];
  excludedCount: number;
  exclusions: Exclusion[];
};

export interface Recommender {
  version: string;
  recommend(answers: FinderAnswers, catalogue: ProductCard[], weights: Weights, limit?: number): FinderResult;
}

const HOME_FORMATS = new Set(["CANDLE", "REED", "ROOM_SPRAY", "CAR", "BAKHOOR"]);
const INTENSITY_ORDER = ["SOFT", "MODERATE", "RICH"];

export const ARCHETYPES: Record<string, { title: string; line: string }> = {
  "fresh-citrus": { title: "The Bright Spark", line: "You reach for zest and sparkle — scents that wake up a hot afternoon." },
  aquatic: { title: "The Sea-Breeze Minimalist", line: "Clean, cool and watery: you want to smell like fresh air, not perfume." },
  "green-tea": { title: "The Quiet Tea-Taster", line: "Calm, transparent and composed — leaves, tea and soft herbs." },
  "white-floral": { title: "The Dusk Romantic", line: "Mogra at dusk, tuberose at night: luminous florals with presence." },
  rose: { title: "The Rose Devotee", line: "From fresh petals to Kannauj distillate — rose is your language." },
  fruity: { title: "The Joy Seeker", line: "Juicy, bright and playful — scents that feel like a good mood." },
  gourmand: { title: "The Sweet Ritualist", line: "Coffee, jaggery, coconut and vanilla — warmth you can almost taste." },
  spicy: { title: "The Spice-Route Explorer", line: "Pepper, cardamom and saffron: you like a scent with a story and a bite." },
  woody: { title: "The Sandalwood Soul", line: "Grounded, smooth and quietly confident — woods that wear close." },
  earthy: { title: "The Monsoon Wanderer", line: "Petrichor, khus and baked earth — you want the smell of first rain." },
  amber: { title: "The Palace-Window Dreamer", line: "Golden resins and warm amber for long evenings and celebrations." },
  oud: { title: "The Evening Royal", line: "Smoky, resinous and ceremonial — made for weddings and winter nights." },
  musk: { title: "The Second-Skin Purist", line: "Clean, skin-like musks: you prefer a scent people notice only up close." },
  "incense-resin": { title: "The Temple-Stone Mystic", line: "Frankincense, resin and smoke — sacred, dry and contemplative." },
  aromatic: { title: "The Blue-Hour Professional", line: "Crisp lavender, mint and herbs — confident and office-ready." },
  leather: { title: "The Calcutta Classic", line: "Suede and leather depth for a polished, old-world edge." },
};

const overlap = (a: string[], b: string[]) => a.filter((x) => b.includes(x));
const prettyList = (xs: string[]) => (xs.length <= 1 ? xs.join("") : `${xs.slice(0, -1).join(", ")} and ${xs[xs.length - 1]}`);

function scoreProduct(a: FinderAnswers, c: ProductCard, w: Weights): { score: number; reasons: string[] } {
  const reasons: string[] = [];
  let earned = 0, possible = 0;

  if (a.families.length) {
    possible += w.family;
    const hits = c.families.filter((f) => a.families.includes(f.slug));
    if (hits.length) {
      const best = Math.max(...hits.map((h) => h.weight)) / 100;
      const coverage = hits.length / a.families.length;
      earned += w.family * (0.75 * best + 0.25 * coverage);
      reasons.push(`${hits[0].weight >= 80 ? "Built around" : "Has a facet of"} ${prettyList(hits.map((h) => h.name))}, a family you chose`);
    }
  }
  if (a.likedNotes.length) {
    possible += w.likedNotes;
    const hits = overlap(a.likedNotes, c.noteSlugs);
    if (hits.length) {
      earned += w.likedNotes * Math.min(1, 0.5 + 0.5 * (hits.length / a.likedNotes.length));
      reasons.push(`Contains ${prettyList(hits.map((h) => h.replace(/-/g, " ")))} from its brief`);
    }
  }
  if (a.moods.length) {
    possible += w.mood;
    const hits = overlap(a.moods, c.moods);
    if (hits.length) { earned += w.mood * Math.min(1, hits.length / Math.min(2, a.moods.length)); reasons.push(`Feels ${prettyList(hits)}`); }
  }
  if (a.occasions.length) {
    possible += w.occasion;
    const hits = overlap(a.occasions, c.occasions);
    if (hits.length) { earned += w.occasion * Math.min(1, hits.length / Math.min(2, a.occasions.length)); reasons.push(`Designed for ${prettyList(hits)}`); }
  }
  if (a.seasons.length) {
    possible += w.season;
    const hits = c.seasons.includes("all-season") ? a.seasons : overlap(a.seasons, c.seasons);
    if (hits.length) { earned += w.season; reasons.push(c.seasons.includes("all-season") ? "Briefed as an all-season scent" : `Briefed for ${prettyList(hits)}`); }
  }
  if (a.intensity !== "ANY" && c.intensity !== "AMBIENT") {
    possible += w.intensity;
    const d = Math.abs(INTENSITY_ORDER.indexOf(a.intensity) - INTENSITY_ORDER.indexOf(c.intensity));
    if (d === 0) { earned += w.intensity; reasons.push(`${c.intensity === "SOFT" ? "Soft" : c.intensity === "RICH" ? "Rich" : "Moderate"} concentration, as you prefer`); }
    else if (d === 1) earned += w.intensity * 0.4;
  }
  if (a.formats.length) {
    possible += w.format;
    earned += w.format;
  }
  // Leaning: unisex always fits; a clear mismatch costs a little (never excludes).
  if (a.leaning !== "any" && c.gender) {
    const g = c.gender.toLowerCase();
    if (a.leaning === "feminine" && g === "masculine") earned -= 6;
    if (a.leaning === "masculine" && g === "feminine") earned -= 6;
  }
  if (a.brands.length && a.brands.includes(c.brand.slug)) reasons.push(`From ${c.brand.name}, a house you picked`);
  if (a.budgetMaxPaise) reasons.push(`Fits your budget from ₹${(c.minPricePaise / 100).toLocaleString("en-IN")}`);
  const score = possible ? Math.max(0, Math.round((earned / possible) * 100)) : 50;
  return { score, reasons };
}

function formatAllowed(a: FinderAnswers, c: ProductCard) {
  if (c.isDiscoverySet || c.isGiftSet) return false; // sets are recommended separately
  const isHome = HOME_FORMATS.has(c.format);
  if (!a.formats.length) return !isHome;
  if (isHome) return a.formats.includes("HOME");
  return a.formats.includes(c.format) || (a.formats.includes("ATTAR") && c.format === "RUH");
}

export const rulesRecommender: Recommender = {
  version: "rules-1.0",
  recommend(a, catalogue, w, limit = 6) {
    const exclusions: Exclusion[] = [];
    const scored: Match[] = [];
    for (const c of catalogue) {
      if (!formatAllowed(a, c)) continue;
      if (!c.available) { exclusions.push({ productId: c.id, name: c.name, reason: "Currently out of stock" }); continue; }
      const bad = overlap(a.dislikedNotes, c.noteSlugs);
      if (bad.length) { exclusions.push({ productId: c.id, name: c.name, reason: `Contains ${bad.join(", ").replace(/-/g, " ")}, which you'd rather avoid` }); continue; }
      if (a.budgetMaxPaise && c.minPricePaise > a.budgetMaxPaise) { exclusions.push({ productId: c.id, name: c.name, reason: "Above your budget" }); continue; }
      if (a.brands.length && !a.brands.includes(c.brand.slug)) continue;
      const { score, reasons } = scoreProduct(a, c, w);
      scored.push({ productId: c.id, slug: c.slug, score, reasons, card: c });
    }
    scored.sort((x, y) => y.score - x.score || x.card.merchRank - y.card.merchRank);
    // One product per scent concept (keep the best-scoring format)
    const seen = new Set<string>();
    const matches: Match[] = [];
    for (const m of scored) {
      const key = m.card.conceptId ?? m.productId;
      if (seen.has(key)) continue;
      seen.add(key);
      matches.push(m);
      if (matches.length >= limit) break;
    }

    // Discovery-set suggestion: the set that contains the most top-match scents (within budget if possible).
    const sets = catalogue.filter((c) => c.isDiscoverySet && c.available);
    let discoverySet: FinderResult["discoverySet"] = null;
    const topConceptCodes = new Set(matches.map((m) => m.card.conceptCode).filter(Boolean) as string[]);
    const setCoverage = sets.map((s) => {
      const prefix = s.brand.slug === "dhun" ? "D" : s.slug.startsWith("attar") ? "A" : s.brand.slug === "anvaya" ? "X" : "V";
      const covers = [...topConceptCodes].filter((code) => code.startsWith(prefix) && !code.startsWith("M")).length;
      return { s, covers };
    }).filter((x) => x.covers > 0).sort((x, y) => y.covers - x.covers || x.s.minPricePaise - y.s.minPricePaise);
    const pick = setCoverage.find((x) => !a.budgetMaxPaise || x.s.minPricePaise <= a.budgetMaxPaise) ?? setCoverage[0];
    if (pick) discoverySet = { productId: pick.s.id, slug: pick.s.slug, name: pick.s.name, covers: pick.covers, reason: `Includes ${pick.covers} of your top matches, so you can wear-test them before choosing a full size.` };

    // Family profile: blend of stated preference and the families of top matches
    const fam: Record<string, { name: string; colour: string; value: number }> = {};
    for (const m of matches) for (const f of m.card.families) {
      fam[f.slug] ??= { name: f.name, colour: f.colour, value: 0 };
      fam[f.slug].value += (f.weight / 100) * (m.score / 100);
    }
    for (const slug of a.families) if (fam[slug]) fam[slug].value += 0.5;
    const familyProfile = Object.entries(fam).map(([slug, v]) => ({ slug, ...v })).sort((x, y) => y.value - x.value).slice(0, 6);
    const max = familyProfile[0]?.value || 1;
    familyProfile.forEach((f) => (f.value = Math.round((f.value / max) * 100)));

    const lead = familyProfile[0]?.slug ?? a.families[0] ?? "woody";
    const arche = ARCHETYPES[lead] ?? ARCHETYPES.woody;
    const moodLine = a.moods.length ? ` You told us you want to feel ${prettyList(a.moods.slice(0, 3))}` : "";
    const occLine = a.occasions.length ? `${moodLine ? "," : " You'll wear it"} for ${prettyList(a.occasions.slice(0, 3))}.` : moodLine ? "." : "";
    return {
      engineVersion: this.version,
      personalityTitle: arche.title,
      summary: `${arche.line}${moodLine}${occLine}`,
      matches,
      discoverySet,
      familyProfile,
      excludedCount: exclusions.length,
      exclusions: exclusions.slice(0, 12),
    };
  },
};

export const EMPTY_ANSWERS: FinderAnswers = { families: [], likedNotes: [], dislikedNotes: [], moods: [], occasions: [], seasons: [], intensity: "ANY", formats: [], budgetMaxPaise: null, leaning: "any", brands: [] };
