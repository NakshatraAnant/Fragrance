/**
 * Catalogue mapping: turns the raw blueprint extraction (skus.json, concepts.json) into
 * structured commerce records. Everything here is traceable to the blueprint:
 *  - SKU codes, names, formats, sizes, concentrations, MRPs, channels, gift & replenishment: slides 71–74
 *  - Collections: slide 63 portfolio matrix
 *  - Scent re-use across formats (home applications): slide 64
 *  - Olfactive & commercial briefs (notes, story, occasion, climate): slides 195–206
 *  - Brand positioning & identity: slides 52, 57, 58, 81, 83
 *  - Scent colours: packaging directions in the commercial briefs (slides 201–204)
 *
 * The "finder tags" (canonical families, moods, occasions, seasons) are a transparent,
 * editable translation of the brief text into filterable attributes. They are editable in
 * Admin → Products and are NOT claims about performance.
 */

export type FamilySlug =
  | "fresh-citrus" | "aquatic" | "green-tea" | "white-floral" | "rose" | "fruity" | "gourmand" | "spicy"
  | "woody" | "earthy" | "amber" | "oud" | "musk" | "incense-resin" | "aromatic" | "leather";

export const FAMILIES: { slug: FamilySlug; name: string; colour: string; description: string }[] = [
  { slug: "fresh-citrus", name: "Fresh & Citrus", colour: "#E9D84A", description: "Zesty peels, nimbu and neroli — bright, sparkling and easy in the heat." },
  { slug: "aquatic", name: "Aquatic", colour: "#5B8FC9", description: "Watery, ozonic and coastal — cucumber water, sea salt and cool air." },
  { slug: "green-tea", name: "Green & Tea", colour: "#8DB38B", description: "Leaves, tea and herbs — calm, transparent and office-safe." },
  { slug: "white-floral", name: "White Floral", colour: "#EFE6CF", description: "Mogra, tuberose, champa and frangipani — luminous and heady." },
  { slug: "rose", name: "Rose", colour: "#C8506E", description: "From fresh petals to deep Kannauj rose distillate." },
  { slug: "fruity", name: "Fruity", colour: "#F09A4A", description: "Mango, litchi, pear and berries — juicy and playful." },
  { slug: "gourmand", name: "Gourmand", colour: "#8A5A3B", description: "Coffee, jaggery, coconut milk and vanilla — edible warmth." },
  { slug: "spicy", name: "Spicy", colour: "#B5532F", description: "Pepper, cardamom, saffron and clove — the spice coast in a bottle." },
  { slug: "woody", name: "Woody", colour: "#7A5C43", description: "Sandalwood, cedar, guaiac and driftwood — grounded and smooth." },
  { slug: "earthy", name: "Earthy & Petrichor", colour: "#9C6B52", description: "Mitti, khus and the smell of first rain on baked earth." },
  { slug: "amber", name: "Amber", colour: "#C08A3E", description: "Resinous, golden warmth — labdanum, benzoin, tonka." },
  { slug: "oud", name: "Oud Accord", colour: "#3B2A20", description: "Smoky, resinous oud accords — honestly labelled as accords." },
  { slug: "musk", name: "Musk", colour: "#D9D2C5", description: "Clean, skin-like modern musks (no animal musk)." },
  { slug: "incense-resin", name: "Incense & Resin", colour: "#5E5650", description: "Frankincense, guggul-type resins and temple smoke." },
  { slug: "aromatic", name: "Aromatic & Fougère", colour: "#5E7FA8", description: "Lavender, sage, mint and eucalyptus — crisp and confident." },
  { slug: "leather", name: "Leather", colour: "#5A3E36", description: "Suede and leather accents for depth." },
];

export const MOODS = ["fresh", "playful", "calm", "romantic", "warm", "bold", "opulent", "grounded", "clean", "sensual"] as const;
export const OCCASIONS = ["daily", "office", "evening", "party", "date", "wedding", "festive", "gym", "travel", "prayer", "gifting", "home"] as const;
export const SEASONS = ["summer", "monsoon", "winter", "all-season"] as const;

export type ConceptTags = {
  families: [FamilySlug, number][];
  moods: string[];
  occasions: string[];
  seasons: string[];
  colour: string;
};

/** Brief-text → tags. Keyed by concept code from Appendix M. */
export const CONCEPT_TAGS: Record<string, ConceptTags> = {
  D01: { families: [["aquatic", 100], ["green-tea", 60], ["earthy", 40]], moods: ["fresh", "clean", "calm"], occasions: ["daily", "office", "gym"], seasons: ["summer", "monsoon"], colour: "#3D6FB6" },
  D02: { families: [["gourmand", 100], ["spicy", 50]], moods: ["warm", "playful"], occasions: ["evening", "date"], seasons: ["winter"], colour: "#6B4226" },
  D03: { families: [["fresh-citrus", 100], ["green-tea", 40]], moods: ["fresh", "playful"], occasions: ["gym", "daily"], seasons: ["summer"], colour: "#E4EC3A" },
  D04: { families: [["fruity", 100], ["white-floral", 50], ["rose", 40]], moods: ["playful", "romantic"], occasions: ["party", "date"], seasons: ["all-season"], colour: "#F0B3C4" },
  D05: { families: [["aromatic", 100], ["woody", 50]], moods: ["fresh", "bold"], occasions: ["office", "daily"], seasons: ["all-season"], colour: "#1F3A93" },
  D06: { families: [["oud", 100], ["amber", 70], ["spicy", 40]], moods: ["bold", "opulent"], occasions: ["wedding", "evening", "festive"], seasons: ["winter"], colour: "#1C1A19" },
  M01: { families: [["gourmand", 70], ["white-floral", 60], ["musk", 40]], moods: ["playful", "calm"], occasions: ["daily"], seasons: ["summer"], colour: "#EADFCB" },
  M02: { families: [["fruity", 100]], moods: ["playful"], occasions: ["daily"], seasons: ["summer"], colour: "#F6A623" },
  M03: { families: [["rose", 100], ["gourmand", 60]], moods: ["romantic", "calm"], occasions: ["daily"], seasons: ["all-season"], colour: "#E7A1A8" },
  M04: { families: [["aromatic", 70], ["fresh-citrus", 60], ["green-tea", 50]], moods: ["fresh"], occasions: ["gym", "travel"], seasons: ["summer"], colour: "#7FD1B9" },
  V01: { families: [["white-floral", 100], ["woody", 30], ["musk", 20]], moods: ["romantic", "sensual"], occasions: ["evening", "wedding"], seasons: ["all-season"], colour: "#E6D6B0" },
  V02: { families: [["earthy", 100], ["woody", 60], ["green-tea", 30]], moods: ["grounded", "calm"], occasions: ["daily", "office"], seasons: ["monsoon"], colour: "#B5725A" },
  V03: { families: [["woody", 100], ["amber", 70], ["spicy", 40], ["rose", 30], ["leather", 20]], moods: ["opulent", "warm"], occasions: ["wedding", "festive", "evening"], seasons: ["winter"], colour: "#C9A24A" },
  V04: { families: [["spicy", 100], ["woody", 70]], moods: ["warm", "bold"], occasions: ["office", "evening"], seasons: ["all-season"], colour: "#5A3D2B" },
  V05: { families: [["green-tea", 100], ["musk", 40]], moods: ["calm", "fresh"], occasions: ["office", "travel"], seasons: ["summer"], colour: "#A8C3A0" },
  V06: { families: [["amber", 100], ["rose", 30], ["oud", 30], ["gourmand", 30]], moods: ["opulent", "warm"], occasions: ["wedding", "evening"], seasons: ["winter"], colour: "#9C7A3C" },
  V07: { families: [["woody", 80], ["aquatic", 60], ["fresh-citrus", 40], ["earthy", 30]], moods: ["fresh", "calm"], occasions: ["daily", "travel"], seasons: ["summer"], colour: "#8FB8B0" },
  V08: { families: [["fruity", 80], ["rose", 70]], moods: ["playful", "romantic"], occasions: ["daily", "gifting"], seasons: ["all-season"], colour: "#E8734F" },
  A01: { families: [["incense-resin", 100], ["spicy", 80], ["woody", 40], ["rose", 30]], moods: ["grounded", "opulent"], occasions: ["festive"], seasons: ["winter"], colour: "#7A4A2A" },
  A02: { families: [["earthy", 100], ["woody", 50], ["green-tea", 40]], moods: ["calm", "fresh", "grounded"], occasions: ["daily"], seasons: ["summer"], colour: "#5D7A4A" },
  A03: { families: [["rose", 100], ["woody", 30]], moods: ["romantic"], occasions: ["festive", "prayer", "wedding"], seasons: ["all-season"], colour: "#B23A5B" },
  A04: { families: [["musk", 100], ["white-floral", 40]], moods: ["clean", "calm"], occasions: ["daily", "prayer"], seasons: ["all-season"], colour: "#EDE7DA" },
  A05: { families: [["oud", 100], ["amber", 50]], moods: ["bold", "opulent"], occasions: ["evening", "festive", "wedding"], seasons: ["winter"], colour: "#3B2A20" },
  S01: { families: [["white-floral", 100], ["woody", 30]], moods: ["romantic", "calm"], occasions: ["travel", "office"], seasons: ["all-season"], colour: "#E6D6B0" },
  S02: { families: [["earthy", 100], ["woody", 50]], moods: ["grounded", "calm"], occasions: ["travel"], seasons: ["all-season"], colour: "#B5725A" },
  X01: { families: [["rose", 100], ["oud", 60], ["woody", 30]], moods: ["opulent", "sensual"], occasions: ["wedding", "evening"], seasons: ["winter"], colour: "#6B1F2A" },
  X02: { families: [["white-floral", 100], ["aromatic", 40], ["gourmand", 30], ["woody", 30]], moods: ["calm", "sensual"], occasions: ["evening"], seasons: ["winter"], colour: "#2B3550" },
  X03: { families: [["woody", 100], ["gourmand", 30], ["spicy", 20]], moods: ["calm", "warm"], occasions: ["daily"], seasons: ["all-season"], colour: "#C8A55A" },
  X04: { families: [["incense-resin", 100], ["leather", 50], ["woody", 50], ["spicy", 30]], moods: ["grounded", "bold"], occasions: ["evening"], seasons: ["winter"], colour: "#4A4540" },
  X05: { families: [["white-floral", 80], ["amber", 80], ["fruity", 40], ["spicy", 30]], moods: ["opulent", "romantic"], occasions: ["wedding", "festive"], seasons: ["all-season"], colour: "#D49A3A" },
  R01: { families: [["rose", 100], ["woody", 30]], moods: ["romantic", "calm"], occasions: ["prayer", "festive"], seasons: ["all-season"], colour: "#8E2240" },
  R02: { families: [["earthy", 100], ["woody", 40]], moods: ["grounded", "calm"], occasions: ["daily"], seasons: ["monsoon"], colour: "#8A6A52" },
};

/** Blueprint SKU format → internal format, category, collection, subtitle, intensity guide. */
export const FORMAT_MAP: Record<string, { format: string; category: string; subtitle: string; intensity: string }> = {
  EDP: { format: "EDP", category: "fine-fragrance", subtitle: "Eau de Parfum", intensity: "MODERATE" },
  "EDP pocket": { format: "EDP", category: "fine-fragrance", subtitle: "Eau de Parfum", intensity: "MODERATE" },
  Mist: { format: "MIST", category: "body-mists", subtitle: "Body & Hair Mist", intensity: "SOFT" },
  Discovery: { format: "DISCOVERY", category: "discovery-sets", subtitle: "Discovery Set", intensity: "MODERATE" },
  Travel: { format: "TRAVEL", category: "travel", subtitle: "Travel Spray", intensity: "MODERATE" },
  Attar: { format: "ATTAR", category: "attar-oils", subtitle: "Perfume Oil", intensity: "RICH" },
  Solid: { format: "SOLID", category: "solid-perfume", subtitle: "Solid Perfume", intensity: "SOFT" },
  Candle: { format: "CANDLE", category: "home-fragrance", subtitle: "Scented Candle", intensity: "AMBIENT" },
  Reed: { format: "REED", category: "home-fragrance", subtitle: "Reed Diffuser", intensity: "AMBIENT" },
  "Room spray": { format: "ROOM_SPRAY", category: "home-fragrance", subtitle: "Room & Linen Spray", intensity: "AMBIENT" },
  Car: { format: "CAR", category: "car-fragrance", subtitle: "Car Fragrance", intensity: "AMBIENT" },
  Bakhoor: { format: "BAKHOOR", category: "home-fragrance", subtitle: "Bakhoor", intensity: "AMBIENT" },
  Gift: { format: "GIFT", category: "gifting", subtitle: "Gift Coffret", intensity: "MODERATE" },
  Extrait: { format: "EXTRAIT", category: "fine-fragrance", subtitle: "Extrait de Parfum", intensity: "RICH" },
  Ruh: { format: "RUH", category: "attar-oils", subtitle: "Ruh", intensity: "RICH" },
};

export const CATEGORIES = [
  { slug: "fine-fragrance", name: "Fine Fragrance", description: "Eau de parfum and extrait de parfum." },
  { slug: "body-mists", name: "Body & Hair Mists", description: "Light, low-concentration mists for everyday layering." },
  { slug: "discovery-sets", name: "Discovery Sets", description: "Try before you commit — the set price is credited on a full size (see terms)." },
  { slug: "travel", name: "Travel Sprays", description: "10 ml sprays for the bag, the desk and the flight." },
  { slug: "attar-oils", name: "Attar & Perfume Oils", description: "Alcohol-free perfume oils and ruh, worn a few drops at a time." },
  { slug: "solid-perfume", name: "Solid Perfume", description: "Spill-proof balms for travel and touch-ups." },
  { slug: "home-fragrance", name: "Home Fragrance", description: "Candles, reed diffusers, room & linen sprays and bakhoor." },
  { slug: "car-fragrance", name: "Car Fragrance", description: "Scent stories for the drive." },
  { slug: "gifting", name: "Gift Coffrets", description: "Curated coffrets for weddings, festivals and milestones." },
];

/** Collections — slide 63. key: brand prefix → list */
export const COLLECTIONS: Record<string, { slug: string; name: string; description: string }[]> = {
  dhun: [
    { slug: "eau-de-parfum", name: "Dhun EDP", description: "Six original scents in 100 ml and 20 ml pocket sizes." },
    { slug: "mists", name: "Dhun Mists", description: "Four body & hair mists, 150 ml." },
    { slug: "discovery", name: "Dhun Discovery", description: "All six Dhun scents in one 6 × 10 ml set." },
  ],
  vasana: [
    { slug: "signature", name: "Signature", description: "Eight eaux de parfum in 50 ml and 100 ml." },
    { slug: "travel-discovery", name: "Travel & Discovery", description: "Four travel sprays and the 8 × 2 ml discovery set." },
    { slug: "attar-atelier", name: "Attar Atelier", description: "Five modern perfume oils and an attar discovery set." },
    { slug: "solid", name: "Solid", description: "Two solid perfumes in brass compacts." },
    { slug: "home", name: "Vasana Home", description: "Candles, reed diffusers, room and linen sprays, car fragrance and bakhoor built on Vasana scent stories." },
    { slug: "gifting", name: "Gifting", description: "Duo and festive coffrets." },
  ],
  anvaya: [
    { slug: "extraits", name: "Extraits", description: "Five extraits de parfum, 75 ml." },
    { slug: "ruh", name: "Ruh", description: "Two precious ruh blends, 3 ml." },
    { slug: "coffret", name: "Coffret", description: "The Anvaya 5 × 5 ml coffret." },
  ],
};

/** SKU code → collection slug */
export function collectionFor(code: string, format: string): string {
  const b = code.slice(0, 2);
  if (b === "DH") return format === "Mist" ? "mists" : format === "Discovery" ? "discovery" : "eau-de-parfum";
  if (b === "AN") return format === "Ruh" ? "ruh" : format === "Discovery" ? "coffret" : "extraits";
  switch (format) {
    case "EDP": return "signature";
    case "Travel": case "Discovery": return code === "VA-27" ? "attar-atelier" : "travel-discovery";
    case "Attar": return "attar-atelier";
    case "Solid": return "solid";
    case "Gift": return "gifting";
    default: return "home";
  }
}

export const BRANDS = [
  {
    slug: "dhun", name: "Dhun", tier: "MASS_PREMIUM", priceBand: "₹299–₹899", discountCeilingPct: 25, sortOrder: 1,
    tagline: "Original scents for everyday life.",
    positioning: "Young, playful, quick — original Indian-inspired scents at an everyday price, built for quick commerce.",
    description: "Dhun is the house's mass-premium label: six original eaux de parfum, four body & hair mists and a six-vial discovery set. Colourful, contemporary and expressive — made for college, the commute, the gym and the sangeet.",
  },
  {
    slug: "vasana", name: "Vasana", tier: "PREMIUM", priceBand: "₹899–₹7,500", discountCeilingPct: 15, sortOrder: 2,
    tagline: "Original Indian scents, made properly, easy to try.",
    positioning: "For Indians who want a fragrance that feels like theirs, Vasana turns Indian flowers, woods and memories into original, climate-tested scents, documented to global standards.",
    description: "Vasana is the flagship Indian perfume house — signature eaux de parfum, the Attar Atelier, solid perfumes, Vasana Home and gifting. Warm, cultured and quietly confident; sensory and specific, never superlative.",
  },
  {
    slug: "anvaya", name: "Anvaya", tier: "LUXURY", priceBand: "₹4,500–₹14,500", discountCeilingPct: 0, sortOrder: 3,
    tagline: "A maison of extraits and ruh.",
    positioning: "Rare, refined and ceremonial — extraits and ruh with Indian naturals as the reason to buy. Never discounted.",
    description: "Anvaya is the house's luxury maison: five extraits de parfum, two ruh blends and a five-vial coffret. Quiet luxury, private appointments and personal clienteling.",
  },
];

/** Discovery set contents as described in the SKU master. */
export const DISCOVERY_CONTENTS: Record<string, { concepts: string[]; vial: string; note: string }> = {
  "DH-17": { concepts: ["D01", "D02", "D03", "D04", "D05", "D06"], vial: "10 ml", note: "6 × 10 ml — the six Dhun eaux de parfum (composition per SKU master; confirm final line-up)." },
  "VA-21": { concepts: ["V01", "V02", "V03", "V04", "V05", "V06", "V07", "V08"], vial: "2 ml", note: "8 × 2 ml — the eight Vasana signature eaux de parfum. Set price credited on a full size (see terms)." },
  "VA-27": { concepts: ["A01", "A02", "A03", "A04", "A05"], vial: "2 ml", note: "5 × 2 ml — the five Attar Atelier perfume oils." },
  "AN-08": { concepts: ["X01", "X02", "X03", "X04", "X05"], vial: "5 ml", note: "5 × 5 ml — the five Anvaya extraits." },
};

export const COFFRET_NOTES: Record<string, string> = {
  "VA-43": "Two 50 ml Vasana eaux de parfum. Scent selection to be confirmed before launch.",
  "VA-44": "One 50 ml Vasana eau de parfum, one candle and one perfume oil. Composition to be confirmed before launch.",
};

/** SKU product name → concept code (home applications reuse Vasana concepts, slide 64). */
export function conceptCodeFor(skuName: string, concepts: { id: string; name: string; phase: string }[]): string | null {
  const phaseOne = concepts.filter((c) => c.phase === "PHASE_ONE");
  // Longest-name match first (e.g. "Ruh Gulab Kannauj" before "Gulab Kannauj").
  const sorted = [...phaseOne].sort((a, b) => b.name.length - a.name.length);
  // Solids map to their own solid briefs S01/S02
  if (/Solid Perfume/.test(skuName)) return skuName.startsWith("Mogra") ? "S01" : "S02";
  for (const c of sorted) {
    if (c.id.startsWith("S")) continue;
    if (skuName.startsWith(c.name)) return c.id;
  }
  return null;
}

/** Curated layering pairs. Only pairings stated in the blueprint are seeded. */
export const LAYERING_PAIRS = [
  {
    a: "velvet-rush-eau-de-parfum", b: "rose-lassi-body-hair-mist",
    title: "Velvet Rush × Rose Lassi",
    rationale: "Named in the blueprint as a Dhun layering duo: Rose Lassi's milky rose-cardamom softens Velvet Rush's juicy pear-litchi and rose-jasmine heart.",
    sequence: "Mist Rose Lassi over skin and hair first, let it settle, then spray Velvet Rush on pulse points.",
    source: "Blueprint slide 83 (layering duos) and slide 202 (Rose Lassi brief: 'layering with Velvet Rush').",
  },
];

/** Same-scent bundles named in commercial rules (slide 83): Vasana EDP + travel spray; EDP + candle. No discount. */
export const BUNDLES = [
  { slug: "first-rain-ritual", name: "First Rain: EDP + Travel Spray", description: "The signature petrichor in 50 ml plus a 10 ml travel spray for the bag.", products: ["first-rain-eau-de-parfum", "first-rain-travel-spray"], source: "Slide 83: Vasana bundle EDP + travel spray" },
  { slug: "mogra-hour-at-home", name: "Mogra Hour: EDP + Candle", description: "Mogra Hour on skin and in the room.", products: ["mogra-hour-eau-de-parfum", "mogra-hour-candle"], source: "Slide 83: Vasana bundle EDP + candle" },
  { slug: "saffron-sandal-ritual", name: "Saffron Sandal: EDP + Travel Spray", description: "Kesar-chandan in 50 ml with a 10 ml travel spray.", products: ["saffron-sandal-eau-de-parfum", "saffron-sandal-travel-spray"], source: "Slide 83: Vasana bundle EDP + travel spray" },
];

export function slugify(s: string) {
  return s.toLowerCase().replace(/&/g, "and").replace(/[^a-z0-9]+/g, "-").replace(/(^-|-$)/g, "");
}

/** Product grouping: SKUs that are size variants of the same product share a product key. */
export function productKeyFor(name: string, format: string): { key: string; displayName: string } {
  // Strip size suffixes such as "100 ml", "10 g", "8 x 2 ml", "200 g"
  let base = name
    .replace(/\s*\(.*?\)\s*/g, " ")
    .trim()
    .replace(/\s+\d+\s*x\s*\d+\s*ml$/i, "")
    .replace(/\s+\d+(\.\d+)?\s*(ml|g)$/i, "")
    .trim();
  base = base.replace(/\bEDP\b/, "Eau de Parfum").replace("Body & Hair Mist", "Body & Hair Mist");
  return { key: slugify(base.replace("&", "")), displayName: base };
}
