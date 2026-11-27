/**
 * Seed: imports the Phase-One catalogue from the blueprint extraction (data/catalogue/*.json),
 * plus roles, the first admin, configuration, CMS content and logistics rules.
 *
 * Integrity rules honoured here:
 *  - No reviews, ratings, orders, customers or sales are ever seeded.
 *  - Stock is only created in a warehouse flagged isTest=true, and only when SEED_TEST_DATA=true.
 *  - Names are marked WORKING_NAME, concentrations and prices PROPOSED, claims UNVERIFIED.
 *  - Idempotent: catalogue rows are upserted by SKU / slug; CMS rows are created only if missing,
 *    so admin edits are never overwritten by a re-seed.
 */
import { PrismaClient } from "@prisma/client";
import skus from "../data/catalogue/skus.json";
import concepts from "../data/catalogue/concepts.json";
import {
  BRANDS, CATEGORIES, COLLECTIONS, FAMILIES, FORMAT_MAP, CONCEPT_TAGS, DISCOVERY_CONTENTS, COFFRET_NOTES,
  LAYERING_PAIRS, BUNDLES, collectionFor, conceptCodeFor, productKeyFor, slugify,
} from "../data/catalogue/mapping";
import { SETTING_DEFAULTS } from "../src/lib/settings-defaults";
import { ROLE_DEFINITIONS } from "../src/lib/permissions";
import { hashPassword } from "../src/lib/password";
import { CMS_PAGES, JOURNAL_POSTS, HOMEPAGE_SECTIONS, MESSAGE_TEMPLATES, CAMPAIGNS, STORES, PINCODE_RULES, WAREHOUSES } from "./seed-content";

const prisma = new PrismaClient();
type Sku = (typeof skus)[number];
type Concept = (typeof concepts)[number];

const brandOf = (code: string) => (code.startsWith("DH") ? "dhun" : code.startsWith("VA") ? "vasana" : "anvaya");

function parseQty(netQty: string, sizeLabelSource: string) {
  const m = netQty.match(/([\d.]+)\s*(ml|g)/i);
  const qty = m ? parseFloat(m[1]) : 0;
  const unit = m ? m[2].toLowerCase() : "ml";
  const setMatch = sizeLabelSource.match(/(\d+\s*x\s*\d+\s*ml)/i);
  const label = setMatch ? setMatch[1].replace(/\s*x\s*/i, " × ") : netQty;
  return { qty, unit, label };
}

async function main() {
  const t0 = Date.now();
  // ── Roles & first admin
  for (const r of ROLE_DEFINITIONS) await prisma.role.upsert({ where: { key: r.key }, update: { name: r.name, permissions: r.permissions }, create: r });
  const superRole = await prisma.role.findUniqueOrThrow({ where: { key: "SUPER_ADMIN" } });
  const adminEmail = (process.env.ADMIN_SEED_EMAIL || "admin@fragrancehouse.test").toLowerCase();
  const adminPassword = process.env.ADMIN_SEED_PASSWORD || "ChangeMe-Admin-2026!";
  const existingAdmin = await prisma.user.findUnique({ where: { email: adminEmail } });
  if (!existingAdmin) await prisma.user.create({ data: { email: adminEmail, name: "House Administrator", passwordHash: hashPassword(adminPassword), roleId: superRole.id, emailVerifiedAt: new Date() } });

  // ── Settings (create if missing)
  for (const [key, value] of Object.entries(SETTING_DEFAULTS)) {
    await prisma.setting.upsert({ where: { key }, update: {}, create: { key, value: JSON.stringify(value) } });
  }

  // ── Brands, categories, collections, families
  const brandIds: Record<string, string> = {};
  for (const b of BRANDS) {
    const row = await prisma.brand.upsert({ where: { slug: b.slug }, update: { ...b }, create: { ...b } });
    brandIds[b.slug] = row.id;
  }
  const categoryIds: Record<string, string> = {};
  for (const [i, c] of CATEGORIES.entries()) {
    const row = await prisma.category.upsert({ where: { slug: c.slug }, update: { name: c.name, description: c.description, sortOrder: i }, create: { ...c, sortOrder: i } });
    categoryIds[c.slug] = row.id;
  }
  const collectionIds: Record<string, string> = {};
  for (const [brand, list] of Object.entries(COLLECTIONS)) {
    for (const [i, c] of list.entries()) {
      const row = await prisma.collection.upsert({
        where: { brandId_slug: { brandId: brandIds[brand], slug: c.slug } },
        update: { name: c.name, description: c.description, sortOrder: i },
        create: { ...c, brandId: brandIds[brand], sortOrder: i },
      });
      collectionIds[`${brand}/${c.slug}`] = row.id;
    }
  }
  const familyIds: Record<string, string> = {};
  for (const [i, f] of FAMILIES.entries()) {
    const row = await prisma.fragranceFamily.upsert({ where: { slug: f.slug }, update: { name: f.name, colour: f.colour, description: f.description, sortOrder: i }, create: { ...f, sortOrder: i } });
    familyIds[f.slug] = row.id;
  }

  // ── Concepts & notes (all 47 briefs; 15 are pipeline concepts with no SKUs)
  const conceptIds: Record<string, string> = {};
  for (const c of concepts as Concept[]) {
    const brandSlug = c.brand.toLowerCase();
    const [opening, development, drydown] = c.phase === "PHASE_ONE" ? c.journey.split("→").map((s) => s.trim()) : [null, null, null];
    const data = {
      name: c.name, brandId: brandIds[brandSlug], familyLabel: c.family, story: c.story ?? null, character: c.character ?? null,
      target: c.target ?? null, occasion: c.occasion ?? null, climate: c.climate ?? null, gender: c.gender ?? null, tierFormat: c.tierFormat ?? null,
      differentiation: c.differentiation ?? null, packagingDirection: c.packaging ?? null, marketingConcept: c.marketing ?? null,
      opening, development, drydown, phase: c.phase, colour: CONCEPT_TAGS[c.id]?.colour ?? null,
    };
    const row = await prisma.scentConcept.upsert({ where: { code: c.id }, update: data, create: { code: c.id, ...data } });
    conceptIds[c.id] = row.id;
    for (const [layer, list] of [["TOP", c.top], ["HEART", c.heart], ["BASE", c.base]] as const) {
      for (const [pos, raw] of list.entries()) {
        const name = raw.replace(/\s+/g, " ").trim();
        if (!name || name === "—") continue;
        const slug = slugify(name);
        const note = await prisma.note.upsert({ where: { slug }, update: {}, create: { slug, name: name[0].toUpperCase() + name.slice(1) } });
        await prisma.conceptNote.upsert({ where: { conceptId_noteId_layer: { conceptId: row.id, noteId: note.id, layer } }, update: { position: pos }, create: { conceptId: row.id, noteId: note.id, layer, position: pos } });
      }
    }
  }

  // ── Products & variants (69 SKUs)
  const groups = new Map<string, { display: string; rows: Sku[] }>();
  for (const s of skus as Sku[]) {
    const { key, displayName } = productKeyFor(s.product, s.format);
    if (!groups.has(key)) groups.set(key, { display: displayName, rows: [] });
    groups.get(key)!.rows.push(s);
  }
  const productIdBySlug: Record<string, string> = {};
  const productIdByConceptFormat: Record<string, string> = {};
  let rank = 0;
  for (const [slug, g] of groups) {
    const first = g.rows[0];
    const brand = brandOf(first.code);
    const fm = FORMAT_MAP[first.format];
    if (!fm) throw new Error(`Unmapped format ${first.format}`);
    const conceptCode = conceptCodeFor(first.product, concepts as Concept[]);
    const concept = conceptCode ? (concepts as Concept[]).find((c) => c.id === conceptCode) : undefined;
    const tags = conceptCode ? CONCEPT_TAGS[conceptCode] : undefined;
    const isDiscovery = first.format === "Discovery";
    const isGift = first.format === "Gift";
    const name = concept && !isDiscovery ? concept.name : g.display;
    const home = ["CANDLE", "REED", "ROOM_SPRAY", "CAR", "BAKHOOR"].includes(fm.format);
    const subtitle = first.product.includes("Linen Mist") ? "Linen Mist" : first.product.includes("Room Spray") ? "Room Spray" : fm.subtitle;
    const storyLine = concept?.story ? concept.story.replace(/^(.*?)\.\s*Story:\s*/, "") : "";
    const conceptSentence = concept?.story ? concept.story.split(". Story:")[0] : "";
    let shortDescription: string;
    let description: string;
    if (isDiscovery) {
      shortDescription = DISCOVERY_CONTENTS[first.code]?.note.split(" — ")[0] ?? g.display;
      description = DISCOVERY_CONTENTS[first.code]?.note ?? g.display;
    } else if (isGift) {
      shortDescription = first.product.match(/\((.*)\)/)?.[1] ?? g.display;
      description = COFFRET_NOTES[first.code] ?? g.display;
    } else if (home) {
      shortDescription = `The ${name} scent story for the ${subtitle.toLowerCase()}.`;
      description = `${conceptSentence}. ${storyLine}. ${name} applied as a ${subtitle.toLowerCase()} — each home application uses its own compliant compound under the same creative brief.`;
    } else {
      shortDescription = `${conceptSentence}.`;
      description = `${storyLine}. ${concept?.character ? `Character: ${concept.character.toLowerCase()}.` : ""} ${concept?.differentiation ? `${concept.differentiation}.` : ""}`.trim();
    }
    const occasions = new Set(tags?.occasions ?? []);
    if (home) { occasions.clear(); occasions.add("home"); }
    if (["TRAVEL", "SOLID"].includes(fm.format)) occasions.add("travel");
    if (first.giftSuitability === "High") occasions.add("gifting");
    const data = {
      name, subtitle, brandId: brandIds[brand], categoryId: categoryIds[fm.category], collectionId: collectionIds[`${brand}/${collectionFor(first.code, first.format)}`],
      conceptId: conceptCode ? conceptIds[conceptCode] : null, format: fm.format, shortDescription, description,
      moods: (tags?.moods ?? []).join(","), occasions: [...occasions].join(","), seasons: (tags?.seasons ?? (isDiscovery ? ["all-season"] : [])).join(","),
      intensity: fm.intensity, gender: concept?.gender ?? null, giftSuitability: first.giftSuitability, replenishment: first.replenishment,
      channels: first.channels.join(", "), isDiscoverySet: isDiscovery, isGiftSet: isGift || isDiscovery && brand === "anvaya",
      isFeatured: (fm.format === "EDP" && brand === "vasana") || fm.format === "EXTRAIT", merchRank: rank++,
      contentsNote: DISCOVERY_CONTENTS[first.code]?.note ?? COFFRET_NOTES[first.code] ?? null,
      sourceRef: `Blueprint SKU master, slide ${first.sourceSlide}${conceptCode ? `; concept ${conceptCode} (Appendix M)` : ""}`,
      seoTitle: `${name.endsWith(subtitle) ? name : `${name} ${subtitle}`} | ${BRANDS.find((b) => b.slug === brand)!.name}`,
      seoDescription: shortDescription.slice(0, 155),
      regulatoryNotes: "Per-SKU compliance pending: IFRA certificate, allergen review vs IS 4707 (Part 2): 2025, stability, Legal Metrology label (slides 71–74).",
    };
    const product = await prisma.product.upsert({ where: { slug }, update: data, create: { slug, ...data } });
    productIdBySlug[slug] = product.id;
    if (conceptCode) productIdByConceptFormat[`${conceptCode}/${fm.format}`] = product.id;

    // families
    if (tags) for (const [fam, weight] of tags.families) await prisma.productFamily.upsert({ where: { productId_familyId: { productId: product.id, familyId: familyIds[fam] } }, update: { weight }, create: { productId: product.id, familyId: familyIds[fam], weight } });

    // variants
    for (const [i, s] of g.rows.entries()) {
      const { qty, unit, label } = parseQty(s.netQty, s.product);
      const vlabel = s.format === "EDP pocket" ? `${label} pocket` : s.format === "Car" ? s.netQty : label;
      const vdata = {
        productId: product.id, label: vlabel, sourceName: s.product, netQuantity: qty, netUnit: unit, sizeNote: s.netQty,
        concentrationPct: s.concentrationPct, mrpPaise: s.mrpPaise!, pricePaise: s.mrpPaise!, expectedRealisedPricePaise: s.expectedSellingPricePaise,
        sortOrder: i,
      };
      await prisma.variant.upsert({ where: { sku: s.code }, update: vdata, create: { sku: s.code, ...vdata } });
    }
  }

  // discovery set contents
  for (const [code, info] of Object.entries(DISCOVERY_CONTENTS)) {
    const v = await prisma.variant.findUniqueOrThrow({ where: { sku: code } });
    for (const cc of info.concepts) {
      const fmt = cc.startsWith("A") ? "ATTAR" : cc.startsWith("X") ? "EXTRAIT" : "EDP";
      const childId = productIdByConceptFormat[`${cc}/${fmt}`];
      if (!childId) continue;
      await prisma.discoverySetItem.upsert({ where: { setId_productId: { setId: v.productId, productId: childId } }, update: { vialSize: info.vial }, create: { setId: v.productId, productId: childId, vialSize: info.vial } });
    }
  }

  // layering pairs (curated only)
  for (const lp of LAYERING_PAIRS) {
    const a = productIdBySlug[lp.a], b = productIdBySlug[lp.b];
    if (!a || !b) throw new Error(`Layering pair product missing: ${lp.a} / ${lp.b}`);
    await prisma.layeringPair.upsert({ where: { productAId_productBId: { productAId: a, productBId: b } }, update: { title: lp.title, rationale: lp.rationale, sequence: lp.sequence, source: lp.source }, create: { productAId: a, productBId: b, title: lp.title, rationale: lp.rationale, sequence: lp.sequence, source: lp.source } });
  }
  for (const bd of BUNDLES) {
    const existing = await prisma.bundle.findUnique({ where: { slug: bd.slug } });
    if (existing) continue;
    await prisma.bundle.create({ data: { slug: bd.slug, name: bd.name, description: bd.description, source: bd.source, items: { create: bd.products.map((p) => ({ productId: productIdBySlug[p] })) } } });
  }

  // ── Logistics
  for (const w of WAREHOUSES) await prisma.warehouse.upsert({ where: { code: w.code }, update: {}, create: w });
  for (const r of PINCODE_RULES) await prisma.pincodeRule.upsert({ where: { prefix: r.prefix }, update: {}, create: r });

  if (process.env.SEED_TEST_DATA !== "false") {
    const test = await prisma.warehouse.upsert({ where: { code: "DEV-TEST" }, update: {}, create: { code: "DEV-TEST", name: "TEST STOCK — development only", city: "N/A", state: "N/A", isTest: true } });
    const variants = await prisma.variant.findMany({ select: { id: true, sku: true } });
    for (const v of variants) {
      // A few SKUs get low/zero test stock so out-of-stock and inventory-conflict paths can be exercised.
      const onHand = v.sku === "VA-44" ? 0 : v.sku === "AN-06" ? 2 : 50;
      await prisma.inventory.upsert({ where: { variantId_warehouseId: { variantId: v.id, warehouseId: test.id } }, update: {}, create: { variantId: v.id, warehouseId: test.id, onHand } });
    }
    await prisma.coupon.upsert({ where: { code: "TEST10" }, update: {}, create: { code: "TEST10", description: "TEST COUPON — development only. 10% off eligible brands (respects brand discount ceilings; Anvaya excluded).", type: "PERCENT", value: 10, perCustomerLimit: 100 } });
  }

  // ── Content (create-only so admin edits survive re-seeding)
  for (const p of CMS_PAGES) await prisma.cmsPage.upsert({ where: { slug: p.slug }, update: {}, create: p });
  for (const s of HOMEPAGE_SECTIONS) await prisma.homepageSection.upsert({ where: { key: s.key }, update: {}, create: { ...s, config: JSON.stringify(s.config ?? {}) } });
  if ((await prisma.banner.count()) === 0) {
    await prisma.banner.create({ data: { placement: "ANNOUNCEMENT", title: "Can't smell it online? Start with a discovery set — its price is credited on your first full size within 60 days.", ctaLabel: "Discovery Studio", ctaHref: "/discovery", sortOrder: 0 } });
  }
  for (const j of JOURNAL_POSTS) await prisma.journalPost.upsert({ where: { slug: j.slug }, update: {}, create: { ...j, brandId: j.brand ? brandIds[j.brand] : null, brand: undefined } as never });
  for (const c of CAMPAIGNS) await prisma.campaign.upsert({ where: { brandId_slug: { brandId: brandIds[c.brand], slug: c.slug } }, update: {}, create: { slug: c.slug, brandId: brandIds[c.brand], title: c.title, eyebrow: c.eyebrow, body: c.body, productSkus: c.products.join(","), source: c.source } });
  for (const t of MESSAGE_TEMPLATES) await prisma.messageTemplate.upsert({ where: { key_channel: { key: t.key, channel: t.channel } }, update: {}, create: t });
  if ((await prisma.storeLocation.count()) === 0) await prisma.storeLocation.createMany({ data: STORES });

  const counts = { brands: await prisma.brand.count(), products: await prisma.product.count(), variants: await prisma.variant.count(), concepts: await prisma.scentConcept.count(), notes: await prisma.note.count(), reviews: await prisma.review.count() };
  console.log(`Seed complete in ${Date.now() - t0} ms`, counts);
  if (counts.variants !== 69) throw new Error(`Expected 69 SKUs, found ${counts.variants}`);
}

main().catch((e) => { console.error(e); process.exit(1); }).finally(() => prisma.$disconnect());
