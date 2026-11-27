import { z } from "zod";

/**
 * Configurable business rules. Defaults come from the blueprint where it states a rule; where the
 * blueprint does not approve the economics (loyalty, shipping fees), the default is either disabled
 * or flagged as a placeholder so the admin panel shows a warning until a person approves it.
 */
export const SettingSchemas = {
  discoveryCredit: z.object({
    enabled: z.boolean(),
    validityDays: z.number().int().min(1).max(365),
    sourceSkus: z.array(z.string()),
    eligibleFormats: z.array(z.string()),
    excludedBrands: z.array(z.string()),
    requiresAccount: z.boolean(),
    source: z.string(),
  }),
  loyalty: z.object({
    enabled: z.boolean(),
    pointsPerHundredRupees: z.number().min(0),
    pointValuePaise: z.number().int().min(0),
    maxRedeemPct: z.number().min(0).max(100),
    expiryMonths: z.number().int().min(1),
    referralPoints: z.number().int().min(0),
    birthdayPoints: z.number().int().min(0),
    tiers: z.array(z.object({ key: z.string(), name: z.string(), minSpendPaise: z.number().int().min(0), benefits: z.array(z.string()) })),
    excludedBrands: z.array(z.string()),
    note: z.string(),
  }),
  shipping: z.object({
    flatFeePaise: z.number().int().min(0),
    freeAbovePaise: z.number().int().min(0),
    giftWrapPaise: z.number().int().min(0),
    placeholder: z.boolean(),
    dangerousGoodsNote: z.string(),
  }),
  cod: z.object({ enabled: z.boolean(), maxOrderPaise: z.number().int(), feePaise: z.number().int().min(0) }),
  finderWeights: z.object({
    family: z.number(), likedNotes: z.number(), mood: z.number(), occasion: z.number(), season: z.number(), intensity: z.number(), format: z.number(),
  }),
  orders: z.object({ pendingExpiryMinutes: z.number().int().min(5) }),
  replenishmentDays: z.record(z.string(), z.number().int().min(1)),
  reviews: z.object({ autoApprove: z.boolean(), allowMedia: z.boolean(), requestAfterDeliveryDays: z.number().int() }),
};

export type Settings = { [K in keyof typeof SettingSchemas]: z.infer<(typeof SettingSchemas)[K]> };

export const SETTING_DEFAULTS: Settings = {
  discoveryCredit: {
    enabled: true,
    validityDays: 60,
    sourceSkus: ["DH-17", "VA-21", "VA-27"],
    eligibleFormats: ["EDP", "ATTAR", "EXTRAIT"],
    excludedBrands: ["anvaya"],
    requiresAccount: true,
    source: "Blueprint slide 83: discovery price credited on first full-size order within 60 days; slide 84: credit applies across brands. Anvaya excluded by default (never discounted).",
  },
  loyalty: {
    enabled: false,
    pointsPerHundredRupees: 0,
    pointValuePaise: 0,
    maxRedeemPct: 0,
    expiryMonths: 12,
    referralPoints: 0,
    birthdayPoints: 0,
    tiers: [
      { key: "MEMBER", name: "Member", minSpendPaise: 0, benefits: ["Order history and Fragrance Wardrobe"] },
      { key: "ATELIER", name: "Atelier", minSpendPaise: 1500000, benefits: ["Anvaya boutique invitation (blueprint slide 84: lifetime spend > ₹15,000)"] },
    ],
    excludedBrands: ["anvaya"],
    note: "Reward economics are not approved in the blueprint. Earn and burn rates are zero until the founder approves a programme.",
  },
  shipping: {
    flatFeePaise: 9900,
    freeAbovePaise: 99900,
    giftWrapPaise: 0,
    placeholder: true,
    dangerousGoodsNote: "Perfume is flammable (UN1266); surface lanes only. Classification to be confirmed with logistics partners (slide 113).",
  },
  cod: { enabled: false, maxOrderPaise: 500000, feePaise: 0 },
  finderWeights: { family: 40, likedNotes: 15, mood: 12, occasion: 12, season: 8, intensity: 8, format: 5 },
  orders: { pendingExpiryMinutes: 30 },
  // Blueprint slides 45, 46 and 84: purchase frequency and reminder triggers
  replenishmentDays: { EDP: 150, MIST: 30, CANDLE: 49, REED: 60, CAR: 45, ROOM_SPRAY: 60, ATTAR: 120, TRAVEL: 60, DISCOVERY: 21 },
  reviews: { autoApprove: false, allowMedia: true, requestAfterDeliveryDays: 21 },
};
