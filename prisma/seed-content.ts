/**
 * Editorial & configuration seed content. All copy is derived from the blueprint's stated
 * positioning, briefs and commercial rules. Legal pages are drafts flagged needsLegalReview.
 */

export const WAREHOUSES = [
  { code: "MDC-BHW", name: "Mother DC (plant) — Bhiwandi–Vapi corridor", city: "Bhiwandi", state: "Maharashtra" },
  { code: "N-NCR", name: "North node · NCR", city: "Delhi NCR", state: "Delhi" },
  { code: "W-BHW", name: "West node · Bhiwandi", city: "Bhiwandi", state: "Maharashtra" },
  { code: "S-BLR", name: "South node · Bengaluru", city: "Bengaluru", state: "Karnataka" },
  { code: "E-KOL", name: "East node · Kolkata", city: "Kolkata", state: "West Bengal" },
];

// Configured logistics rules (blueprint slide 113 target: 2–4 days nationally via surface lanes from four nodes).
// These are estimates for anchor cities in slide 24 only; every other PIN reports "not yet confirmed"
// until the logistics partner's serviceability is connected.
const R = (prefix: string, region: string, minDays: number, maxDays: number) => ({ prefix, region, minDays, maxDays, serviceable: true, codAllowed: false, note: "Configured estimate (blueprint target). Confirm with 3PL." });
export const PINCODE_RULES = [
  R("400", "Mumbai", 2, 3), R("401", "Mumbai MMR", 2, 4), R("421", "Thane", 2, 4), R("411", "Pune", 2, 4), R("412", "Pune", 3, 5),
  R("380", "Ahmedabad", 3, 4), R("382", "Gandhinagar", 3, 5), R("395", "Surat", 3, 4), R("110", "Delhi", 2, 4), R("122", "Gurugram", 2, 4),
  R("201", "Noida / Ghaziabad", 2, 4), R("302", "Jaipur", 3, 5), R("226", "Lucknow", 3, 5), R("160", "Chandigarh", 3, 5),
  R("560", "Bengaluru", 2, 3), R("562", "Bengaluru Rural", 3, 4), R("500", "Hyderabad", 2, 4), R("600", "Chennai", 2, 4),
  R("682", "Kochi", 3, 5), R("700", "Kolkata", 2, 4), R("711", "Howrah", 3, 4), R("751", "Bhubaneswar", 3, 5), R("781", "Guwahati", 4, 6),
  R("452", "Indore", 3, 5), R("641", "Coimbatore", 3, 5), R("440", "Nagpur", 3, 5),
];

export const STORES = [
  { name: "Vasana boutique · West I", brand: "vasana", city: "Mumbai region", status: "PLANNED", note: "Boutique with scent bar and attar counter (slide 58). Two West boutiques planned (slide 24).", sortOrder: 1 },
  { name: "Vasana boutique · West II", brand: "vasana", city: "West region (Pune / Ahmedabad)", status: "PLANNED", note: "Location to be confirmed.", sortOrder: 2 },
  { name: "Vasana boutique · North I", brand: "vasana", city: "Delhi NCR", status: "PLANNED", note: "Two North boutiques planned (slide 24).", sortOrder: 3 },
  { name: "Vasana boutique · North II", brand: "vasana", city: "North region", status: "PLANNED", note: "Location to be confirmed.", sortOrder: 4 },
  { name: "Vasana boutique · South I", brand: "vasana", city: "Bengaluru", status: "PLANNED", note: "Two South boutiques planned (slide 24).", sortOrder: 5 },
  { name: "Vasana boutique · South II", brand: "vasana", city: "South region", status: "PLANNED", note: "Location to be confirmed.", sortOrder: 6 },
  { name: "Anvaya private salon", brand: "anvaya", city: "Inside Vasana flagships", status: "PLANNED", note: "Private salon by appointment (slide 58).", sortOrder: 7 },
];

const LEGAL_NOTE = "\n\n> **Draft for legal review.** This page was generated from the business blueprint and must be reviewed by counsel before launch (Consumer Protection (E-Commerce) Rules 2020, DPDP Act 2023, Legal Metrology (Packaged Commodities) Rules).";

export const CMS_PAGES = [
  {
    slug: "about", title: "About the House", eyebrow: "Vasana House",
    intro: "Give India's scent culture the modern craft, quality and confidence it deserves.",
    body: `## One house, three voices\n\nThe house builds original Indian scents and gives each price tier its own name, because one name cannot credibly stretch from ₹299 to ₹14,500.\n\n- **Dhun** — young, playful and quick. Six original eaux de parfum, mists and a discovery set from ₹299.\n- **Vasana** — the flagship Indian perfume house. Signature eaux de parfum, the Attar Atelier, solid perfume, Vasana Home and gifting.\n- **Anvaya** — a maison of extraits and ruh. Rare, ceremonial, never discounted.\n- **Odaya Fragrance Works** — a separate business-to-business arm for private label, development, filling, scenting and gifting.\n\n## What we value\n\n- **Originality over imitation.** No dupes and no "inspired by" claims. Every concept is screened against famous perfumes.\n- **Craft with proof.** We claim only what we can document.\n- **Respect for growers and makers.**\n- **Generous discovery.** You can't smell a perfume online, so trying one should be easy.`,
  },
  {
    slug: "craft", title: "Our Craft", eyebrow: "Made properly",
    intro: "Blends, fills and quality control are kept in-house; specialist formats are made by partners under our quality system.",
    body: `## From brief to bottle\n\nEvery scent starts as a written **creative brief**: a story, a character, the climate it is designed for, and an olfactive direction. A brief is not a formula. Each concept must pass eight gates, including consumer and technical kill points, before it is commercially approved.\n\n## Quality we document\n\nAn IFRA certificate is necessary but not sufficient. Each SKU needs a full safety and stability file, an allergen review against **IS 4707 (Part 2): 2025** and a Legal Metrology-compliant label. When a batch is released, its documentation is attached to that batch.\n\n## Built for Indian weather\n\nHeat and humidity shorten the life of top notes. Briefs are written for specific climates, for example humid monsoon days, air-conditioned offices or winter weddings. Any longevity claim will be published only once it has been substantiated by panel testing.`,
  },
  {
    slug: "ingredients", title: "Ingredients & Materials", eyebrow: "What's inside",
    intro: "Indian flowers, woods and memories — and honest labels about what is natural, what is an accord and what is still a brief.",
    body: `## How to read our notes\n\nThe notes on each product page come from its creative brief. They describe an olfactive direction, not a finished formula. Ingredient declarations (INCI) and allergen disclosures appear on a product page only after its formula is approved.\n\n## Honest naming\n\n- **Oud accord** means an accord, not natural agarwood. Natural oud is not part of Phase One.\n- **Kasturi White** uses modern musks. It contains no animal musk.\n- **Sandalwood** stories refer to traceable, legally sourced material. Provenance documents are published when they become available.\n\n## Materials we celebrate\n\nJasmine sambac (mogra), Kannauj rose distillate, khus (vetiver), saffron, cardamom, black pepper, Darjeeling tea, champaca and frankincense-type resins.`,
  },
  {
    slug: "contact", title: "Contact", eyebrow: "We're here", intro: "Questions about an order, a scent or a gift? Write to us and we'll reply by email.",
    body: `Use the form below or visit [Customer Support](/support). Business enquiries for private label, filling, scenting or corporate gifting go to [Odaya Fragrance Works](/odaya/enquiry).`,
  },
  {
    slug: "stores", title: "Store Locator", eyebrow: "Boutiques", intro: "Our boutiques are being planned. No boutique is open yet.",
    body: `The plan includes six metro boutiques, each with a scent bar and an attar counter, plus a private Anvaya salon. The list below shows each location's status. We'll announce openings here first.`,
  },
  {
    slug: "support", title: "Customer Support", eyebrow: "Help", intro: "Track an order, ask about a scent, or raise a request.",
    body: `- [Track an order](/track)\n- [Shipping policy](/shipping)\n- [Returns & refunds](/returns)\n- [Frequently asked questions](/faq)\n\nSend us a request with the form below. Your request gets a reference number, and our team replies by email.`,
  },
  {
    slug: "faq", title: "Frequently Asked Questions", eyebrow: "FAQ", intro: "",
    body: `### How does the discovery credit work?\nWhen you buy an eligible discovery set while signed in, its price becomes a credit once payment is confirmed. You can use the credit on your first eligible full-size order within 60 days. Each credit can be used once. Anvaya products are excluded.\n\n### Are your fragrances original?\nYes. Every scent starts from our own creative brief and is screened so that it does not copy a famous perfume. We don't sell dupes.\n\n### Will it last in Indian heat?\nWe design briefs for Indian climates. We will publish longevity and projection only once panel testing has substantiated them. Until then, our product pages give a guide to intensity based on concentration.\n\n### What is an attar or perfume oil?\nAn attar is an alcohol-free perfume oil worn a few drops at a time. Price per ml looks high, so compare the cost per wear instead.\n\n### Do you offer cash on delivery?\nCash on delivery isn't available at the moment.\n\n### Do you ship everywhere in India?\nAt checkout we confirm delivery to your PIN code against our logistics rules. If we can't confirm a PIN code yet, we'll say so before you pay.`,
  },
  {
    slug: "shipping", title: "Shipping Policy", eyebrow: "Delivery", needsLegalReview: true, intro: "",
    body: `## Where we deliver\nWe check every PIN code at checkout. Delivery estimates come from our configured logistics rules and are estimates, not guarantees.\n\n## Fragrance is a restricted good\nPerfume is a flammable liquid (UN1266), so it travels by surface. Air shipping isn't available.\n\n## Charges\nShipping charges are shown in your cart before you pay.${LEGAL_NOTE}`,
  },
  {
    slug: "returns", title: "Returns & Refunds", eyebrow: "Policy", needsLegalReview: true, intro: "",
    body: `## Unopened items\nYou can exchange unopened items in their original sealed packaging. Contact support with your order number to start an exchange.\n\n## Damaged or incorrect items\nIf an item arrives damaged or isn't what you ordered, report it with photos within 48 hours of delivery. We'll replace it or refund it.\n\n## Refunds\nApproved refunds go back to your original payment method. You can see a refund's status on your order page.\n\n## Discovery credits\nIf an order that issued a discovery credit is refunded, the credit is cancelled. If a refunded order used a credit, the credit is restored when its validity allows.${LEGAL_NOTE}`,
  },
  {
    slug: "privacy", title: "Privacy Policy", eyebrow: "Your data", needsLegalReview: true, intro: "",
    body: `## What we collect\nWe collect your account details, orders, addresses, Scent Finder answers (if you choose to save them) and your communication preferences.\n\n## Why\nWe use this data to fulfil orders, provide your account features and, **only with your explicit consent**, to send marketing and personalise recommendations.\n\n## Your choices\nYou can withdraw marketing consent at any time from your account preferences. Each change is recorded with a timestamp. You can also request an export of your data, or deletion of your account, from **Account → Preferences**.\n\n## Business data\nOdaya B2B enquiries are kept separately from consumer data, and Odaya staff can access business records only.${LEGAL_NOTE}`,
  },
  {
    slug: "terms", title: "Terms & Conditions", eyebrow: "Terms", needsLegalReview: true, intro: "",
    body: `## Prices\nThe MRP is the everyday price and includes all taxes. We don't show inflated MRPs or fake "strike-through" prices.\n\n## Product information\nProduct names are working names until legal clearance. Concentrations are proposed until we verify them. Notes describe a creative direction.\n\n## Discovery credits\nEach credit can be used once, in the configured window, on eligible full-size products. Credits can't be exchanged for cash and can't be combined with another credit.\n\n## Orders\nWe confirm an order only after the payment provider has verified the payment.${LEGAL_NOTE}`,
  },
];

export const HOMEPAGE_SECTIONS: { key: string; type: string; title: string; subtitle?: string; body?: string; ctaLabel?: string; ctaHref?: string; sortOrder: number; config?: Record<string, unknown> }[] = [
  { key: "hero", type: "HERO", sortOrder: 1, title: "India's own perfume house.", subtitle: "Original Indian scents — mogra at dusk, the first rain, kesar-chandan — made properly and easy to try.", ctaLabel: "Find your scent", ctaHref: "/scent-finder", config: { secondaryLabel: "Shop all", secondaryHref: "/shop" } },
  { key: "proposition", type: "PROPOSITION", sortOrder: 2, title: "Three houses. One idea.", subtitle: "Indian scent, made modern and documented.", body: "Each price tier gets its own name and its own world, so every bottle is honest about what it is." },
  { key: "finder", type: "FINDER", sortOrder: 3, title: "You can't smell online. So we built a better way to choose.", subtitle: "Ten questions. Recommendations you can see the reasoning for. Discovery sets credited on a full size.", ctaLabel: "Start the Scent Finder", ctaHref: "/scent-finder" },
  { key: "families", type: "FAMILIES", sortOrder: 4, title: "Shop by fragrance family", subtitle: "From petrichor to Kannauj rose." },
  { key: "signature", type: "PRODUCT_CAROUSEL", sortOrder: 5, title: "Signature fragrances", subtitle: "The Vasana signature eaux de parfum.", ctaLabel: "Shop Vasana", ctaHref: "/vasana", config: { source: "featured", limit: 8 } },
  { key: "brands", type: "BRAND_WORLDS", sortOrder: 6, title: "Explore the houses" },
  { key: "discovery", type: "DISCOVERY", sortOrder: 7, title: "Try before you commit", subtitle: "Discovery sets from ₹699. The set price is credited on your first eligible full size within 60 days.", ctaLabel: "Discovery Studio", ctaHref: "/discovery" },
  { key: "story", type: "STORY", sortOrder: 8, title: "The Indian fragrance story", subtitle: "Kannauj distillers, mogra strings sold at dusk, khus screens in summer.", body: "India has one of the oldest scent cultures in the world, from attar and bakhoor to the gajra and the tilak. Vasana makes that heritage modern and honest, and easy to discover.", ctaLabel: "Read the journal", ctaHref: "/journal" },
  { key: "craft", type: "CRAFT", sortOrder: 9, title: "Craft with proof", subtitle: "IFRA, allergen review to IS 4707 (Part 2): 2025, stability files and batch documentation for every SKU.", ctaLabel: "Our craft", ctaHref: "/craft" },
  { key: "bestsellers", type: "PRODUCT_CAROUSEL", sortOrder: 10, title: "Bestsellers", subtitle: "Ranked by confirmed orders. Until we have sales data, this shows the house's own selection.", ctaLabel: "See all", ctaHref: "/bestsellers", config: { source: "bestsellers", limit: 8 } },
  { key: "home", type: "PRODUCT_CAROUSEL", sortOrder: 11, title: "Vasana Home", subtitle: "Candles, reeds, room and linen sprays, car fragrance and bakhoor built on Vasana scent stories.", ctaLabel: "Shop home", ctaHref: "/shop?category=home-fragrance", config: { source: "category", slug: "home-fragrance", limit: 8 } },
  { key: "gifting", type: "GIFTING", sortOrder: 12, title: "The Gifting Atelier", subtitle: "Weddings, Diwali, birthdays and thank-yous. Gift wrap and handwritten-style messages.", ctaLabel: "Find a gift", ctaHref: "/gifting" },
  { key: "reviews", type: "REVIEWS", sortOrder: 13, title: "From our customers", subtitle: "Only verified, moderated reviews appear here." },
  { key: "layering", type: "LAYERING", sortOrder: 14, title: "The Layering Studio", subtitle: "Pairings curated by the house, with the sequence to wear them in.", ctaLabel: "Explore layering", ctaHref: "/layering" },
  { key: "journal", type: "JOURNAL", sortOrder: 15, title: "The Scent Journal" },
  { key: "loyalty", type: "LOYALTY", sortOrder: 16, title: "Build your Fragrance Wardrobe", subtitle: "Save your scent profile, layering pairs and favourites. Get replenishment reminders when you're running low.", ctaLabel: "Create an account", ctaHref: "/account/register" },
  { key: "newsletter", type: "NEWSLETTER", sortOrder: 17, title: "Letters from the house", subtitle: "New scents, festive edits and maker stories. We only send them with your consent, and you can unsubscribe in one click." },
];

export const JOURNAL_POSTS = [
  {
    slug: "what-first-rain-smells-like", title: "What first rain smells like", brand: "vasana",
    excerpt: "Petrichor, mitti and the Kannauj distillers who bottle baked earth.",
    body: `There is a word for the smell of rain on dry earth: **petrichor**. In Kannauj, distillers have been capturing it for generations. They bake clay discs, then distil them into *mitti attar*.\n\nThree of our concepts begin there:\n\n- **First Rain** (Vasana) pairs cardamom and green mango with an earthy accord and khus, settling into cedar and musk.\n- **Monsoon Static** (Dhun) is petrichor done fresh. Cucumber water and green mandarin open onto vetiver and clean musks, light enough for humid days.\n- **Mitti Ruh** (Anvaya) is a baked-earth distillate blend for connoisseurs.\n\nThe notes above come from each concept's creative brief. Read them as a direction, not a formula.`,
  },
  {
    slug: "mogra-the-dusk-flower", title: "Mogra, the dusk flower", brand: "vasana",
    excerpt: "Why jasmine sambac sold in strings at dusk became the heart of Mogra Hour.",
    body: `At dusk, flower sellers string jasmine sambac into gajras. The scent rises as the air cools.\n\n**Mogra Hour** treats jasmine sambac as a modern luxury. Its brief opens on dewy green pear and bergamot, blooms into jasmine and tuberose, and dries down to creamy sandalwood and musk.\n\nIt comes as an eau de parfum, a travel spray, a solid perfume, a candle and a linen mist. Each format uses its own compliant compound under the same creative brief.`,
  },
  {
    slug: "how-to-wear-attar", title: "How to wear an attar", brand: "vasana",
    excerpt: "Drops, not sprays: comparing perfume oils per wear, not per ml.",
    body: `An attar is an alcohol-free perfume oil. You wear two or three drops on pulse points, so an 8 ml roll-on lasts far longer than an 8 ml spray would. That is why we suggest comparing oils **per wear rather than per ml**.\n\nThe Attar Atelier has five oils: **Shamama Nova** (herbal, ceremonial), **Ruh Khus Modern** (green and cooling), **Gulab Kannauj** (rose), **Kasturi White** (clean musk, no animal musk) and **Oud Assam Accord** (an honestly labelled oud accord). The five-vial Attar Discovery lets you try them all.`,
  },
  {
    slug: "why-our-names-are-working-names", title: "Why our names are working names", brand: null,
    excerpt: "How a scent goes from creative brief to approved product.",
    body: `Every product in our Phase-One portfolio begins as a **creative brief**. Until legal clearance, its name is a working name. Concentrations stay proposed until formulation, and claims are published only once they are proven.\n\nWe would rather be clear about what is finished than promise what isn't. As each product passes its gates, its page will be updated: approved ingredient declarations, batch documentation and any substantiated performance claims.`,
  },
];

export const CAMPAIGNS = [
  { brand: "vasana", slug: "monsoon-first-rain", eyebrow: "June · Monsoon launch", title: "Smell the first rain", body: "First Rain is our signature petrichor with khus. It launches with the monsoon, alongside the travel spray, solid, candle, reed and car formats.", products: ["first-rain-eau-de-parfum", "first-rain-travel-spray", "first-rain-solid-perfume", "first-rain-candle", "first-rain-reed-diffuser", "first-rain-car-fragrance"], source: "Blueprint slide 132 (June: monsoon launch of First Rain)" },
  { brand: "vasana", slug: "diwali-gifting", eyebrow: "October–November", title: "Diwali gifting", body: "Coffrets, candles and attar for the festival of lights. This is the biggest gifting moment of the year.", products: ["vasana-festive-coffret", "vasana-duo-coffret", "jharokha-amber-candle", "gulab-kannauj-perfume-oil", "jharokha-amber-bakhoor"], source: "Blueprint slide 132 (Oct–Nov: Diwali gifting)" },
  { brand: "dhun", slug: "garba-and-puja-nights", eyebrow: "Navratri · Durga Puja", title: "Garba and puja nights", body: "Velvet Rush for the dance floor and Oud Rush for the baraat that never ends.", products: ["velvet-rush-eau-de-parfum", "oud-rush-eau-de-parfum", "rose-lassi-body-hair-mist"], source: "Blueprint slide 132 (Oct: Velvet Rush, Oud Rush)" },
  { brand: "dhun", slug: "summer-drop", eyebrow: "April–June", title: "The summer drop", body: "Nimbu-soda fizz, Alphonso mango season and icy pudina. Mists and EDPs for peak heat.", products: ["neon-nimbu-eau-de-parfum", "mango-masti-body-hair-mist", "pudina-breeze-body-hair-mist", "coconut-cloud-body-hair-mist"], source: "Blueprint slide 132 (Apr: Neon Nimbu) and slide 201 (Mango Masti summer drop)" },
  { brand: "anvaya", slug: "private-preview", eyebrow: "By invitation", title: "The private preview", body: "Atelier films, private previews and a coffret of five extraits. Anvaya is shown by appointment.", products: ["rajmahal-rose-extrait", "champa-saffron-extrait", "anvaya-coffret"], source: "Blueprint slide 204 (Rajmahal Rose: atelier films, private previews)" },
];

const T = (key: string, channel: "EMAIL" | "WHATSAPP", subject: string | null, body: string, isMarketing = false) => ({ key, channel, subject, body, isMarketing });
export const MESSAGE_TEMPLATES = [
  T("WELCOME", "EMAIL", "Welcome to the house", "Hello {{name}},\n\nWelcome. Your Fragrance Wardrobe is ready. Save scents, take the Scent Finder and keep your layering pairs in one place.\n\n{{appUrl}}/account/wardrobe"),
  T("ORDER_CONFIRMED", "EMAIL", "Order {{orderNumber}} confirmed", "Thank you, {{name}}. We've confirmed payment for order {{orderNumber}} ({{total}}). Estimated delivery: {{deliveryEstimate}}.\n\nTrack it: {{appUrl}}/track?order={{orderNumber}}"),
  T("ORDER_CONFIRMED", "WHATSAPP", null, "Order {{orderNumber}} is confirmed. Total {{total}}. Track: {{appUrl}}/track?order={{orderNumber}}"),
  T("PAYMENT_FAILED", "EMAIL", "Payment for {{orderNumber}} didn't go through", "Your payment for order {{orderNumber}} failed and you have not been charged by us. You can retry here: {{appUrl}}/checkout/pay/{{orderId}}"),
  T("SHIPPED", "EMAIL", "Order {{orderNumber}} is on its way", "Carrier: {{carrier}} · AWB {{awb}}. Track: {{trackingUrl}}"),
  T("DISCOVERY_PURCHASE", "EMAIL", "Your discovery credit of {{credit}}", "Your discovery set is on its way. When you've found a favourite, use your credit of {{credit}} on an eligible full-size order before {{expiry}}."),
  T("DISCOVERY_DELIVERED", "WHATSAPP", null, "Hi {{name}}, it's been a few weeks with your discovery set. Which vial did you reach for most? Reply with its name and we'll suggest your full size. Your {{credit}} credit is valid until {{expiry}}.", true),
  T("FAVOURITE_IDENTIFIED", "EMAIL", "{{product}} — your full size", "You told us {{product}} was your favourite. Here it is in full size: {{appUrl}}/product/{{slug}}", true),
  T("FULL_SIZE_PURCHASE", "EMAIL", "Layer it, scent your home", "Now that {{product}} is yours, explore layering pairs and the home formats of your scent: {{appUrl}}/layering", true),
  T("REVIEW_REQUEST", "EMAIL", "How is {{product}}?", "Tell other customers how {{product}} wears on you. Verified-purchase reviews help everyone choose: {{appUrl}}/product/{{slug}}#reviews"),
  T("REPLENISHMENT", "EMAIL", "Running low on {{product}}?", "Based on typical use, your {{product}} may be running low. Reorder: {{appUrl}}/product/{{slug}}", true),
  T("REPLENISHMENT", "WHATSAPP", null, "Your {{product}} may be running low. Reorder: {{appUrl}}/product/{{slug}}", true),
  T("BIRTHDAY", "EMAIL", "Happy birthday, {{name}}", "Happy birthday from the house.", true),
  T("LOYALTY_MILESTONE", "EMAIL", "You've reached {{tier}}", "Welcome to {{tier}}. Your benefits: {{benefits}}", true),
  T("LAPSED", "EMAIL", "We've been making new things", "It's been a while. Here's what's new: {{appUrl}}/new", true),
  T("PASSWORD_RESET", "EMAIL", "Reset your password", "Reset your password with this link (valid for 1 hour): {{resetUrl}}\n\nIf you didn't ask to reset it, you can ignore this email."),
  T("SUPPORT_RECEIVED", "EMAIL", "We've received your request {{ticket}}", "Thank you, {{name}}. Your reference is {{ticket}}. Our team will reply by email."),
  T("B2B_ENQUIRY_RECEIVED", "EMAIL", "Odaya enquiry {{number}} received", "Thank you, {{name}}. Odaya Fragrance Works has received your {{kind}} for {{service}} (reference {{number}}). A specialist will be in touch."),
  T("APPOINTMENT_REQUESTED", "EMAIL", "Your Anvaya appointment request", "Thank you, {{name}}. We've received your request for a private appointment in {{city}} around {{date}}. A client advisor will confirm by email."),
];
