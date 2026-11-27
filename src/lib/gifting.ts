import type { ProductCard } from "./catalog";

/** Occasion landing pages. Eligibility is configurable here and uses real catalogue attributes only. */
export const GIFT_OCCASIONS: Record<string, { title: string; intro: string; match: (c: ProductCard) => boolean; b2b?: boolean }> = {
  weddings: { title: "Wedding gifting", intro: "For the bride, the groom, the families and the guests. Coffrets, rose attars and celebration scents.", match: (c) => c.occasions.includes("wedding") || c.isGiftSet, b2b: true },
  festivals: { title: "Festive gifting", intro: "Diwali, Eid, Navratri, Onam and more: candles, bakhoor, attar and coffrets.", match: (c) => c.occasions.includes("festive") || c.isGiftSet || ["CANDLE", "BAKHOOR"].includes(c.format) },
  birthdays: { title: "Birthday gifts", intro: "Joyful, personal scents. Not sure? Give a discovery set and let them choose their full size.", match: (c) => c.giftSuitability === "High" && (c.moods.some((m) => ["playful", "romantic", "fresh"].includes(m)) || c.isDiscoverySet) },
  anniversaries: { title: "Anniversary gifts", intro: "Romantic florals, rose and extraits for the occasion.", match: (c) => c.giftSuitability === "High" && (c.moods.some((m) => ["romantic", "sensual", "opulent"].includes(m)) || c.isGiftSet) },
  corporate: { title: "Corporate gifting", intro: "Considered gifts for teams and clients. For curated kits of 50 or more with personalisation, our B2B arm Odaya can help.", match: (c) => c.isGiftSet || c.isDiscoverySet || ["CANDLE", "REED", "TRAVEL"].includes(c.format), b2b: true },
  "special-occasions": { title: "Something special", intro: "Thank-yous, housewarmings and just-because gifts.", match: (c) => c.giftSuitability === "High" },
};

export type GiftQuery = { recipient?: string; occasion?: string; budgetMaxPaise?: number | null; preference?: string };

/** Gift finder: filters on gift suitability, budget, occasion and a simple scent preference. */
export function findGifts(cards: ProductCard[], q: GiftQuery): ProductCard[] {
  const occ = q.occasion && GIFT_OCCASIONS[q.occasion];
  const pref: Record<string, string[]> = { fresh: ["fresh-citrus", "aquatic", "green-tea", "aromatic"], floral: ["white-floral", "rose", "fruity"], warm: ["amber", "oud", "spicy", "gourmand", "incense-resin"], woody: ["woody", "earthy", "musk", "leather"] };
  return cards
    .filter((c) => c.available && (c.giftSuitability === "High" || c.isGiftSet))
    .filter((c) => !q.budgetMaxPaise || c.minPricePaise <= q.budgetMaxPaise)
    .filter((c) => !occ || occ.match(c))
    .filter((c) => !q.preference || q.preference === "unsure" ? true : c.families.some((f) => pref[q.preference!]?.includes(f.slug)) || c.isDiscoverySet)
    .filter((c) => q.recipient !== "her" || !c.gender || !/^masculine/i.test(c.gender))
    .filter((c) => q.recipient !== "him" || !c.gender || !/^feminine$/i.test(c.gender))
    .filter((c) => q.recipient !== "home" || ["CANDLE", "REED", "ROOM_SPRAY", "BAKHOOR"].includes(c.format))
    .sort((a, b) => Number(b.isGiftSet || b.isDiscoverySet) - Number(a.isGiftSet || a.isDiscoverySet) || a.merchRank - b.merchRank);
}
