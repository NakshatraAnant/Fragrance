# Implementation report: Vasana House fragrance ecosystem

Date: 27 Nov 2026 · Repository: `NakshatraAnant/Fragrance` (`main`)

## 1. What was built

The repository was empty, so this is a greenfield build. It is one Next.js application with:

- **Consumer storefront ("the house")**: homepage, shop, search, families, new arrivals, bestsellers, Discover, Scent Finder, Discovery Studio, Layering Studio, Gifting Atelier, journal, CMS pages, store locator, support, FAQ, policies, wishlist, compare, cart, checkout, payment, order confirmation, order tracking and customer accounts.
- **Three brand storefronts with distinct design systems** on shared components:
  - **Dhun**: white canvas, six scent colours, rounded lowercase type, fast springy motion.
  - **Vasana**: champagne, clay, charcoal and muted gold; high-contrast serif with humanist sans; editorial layout.
  - **Anvaya**: charcoal, brass and ivory; engraved serif; slow fades; private appointments; never discounted.
  - Each brand has a home, collection pages, a story, campaign pages and themed PDPs.
- **Odaya Fragrance Works B2B portal**: a separate layout and identity, eight service pages, capabilities, quality & compliance, RFQ / sample / enquiry workflows with file attachments, and a full B2B pipeline in admin.
- **Admin & merchandising control centre** (14 areas, permission-gated): dashboard, analytics, products/variants/media, inventory & batches, merchandising, orders & refunds, customers & DPDP data requests, reviews & Q&A moderation, support & appointments, marketing & rules, homepage CMS & banners (with desktop/mobile preview), pages/journal/campaigns, B2B pipeline, and system (staff, roles, integrations, jobs, PIN-code rules, outbox, payment events, audit and error logs).

## 2. Architecture & technology

Next.js 16.4 (App Router, Turbopack, `proxy.ts`), React 19.3, TypeScript strict, Tailwind CSS 4 (with layered component CSS), Prisma 6.19 (SQLite locally, portable to PostgreSQL), Zod 4, Vitest 5 and Playwright 1.65. There are no UI, animation or auth libraries: motion is CSS plus IntersectionObserver, and auth is scrypt with hashed DB sessions. The only third-party script origin permitted by the CSP is Razorpay Checkout.

## 3. Routes & modules

The app has 79 pages and 14 API route handlers. See the README tree. Key APIs:

- `/api/cart`, `/api/wishlist`, `/api/search/suggest`, `/api/pincode`
- `/api/finder`, `/api/analytics`, `/api/reviews`, `/api/reviews/vote`, `/api/questions`, `/api/newsletter`, `/api/products`
- `/api/account/export`
- `/api/payments/razorpay/webhook`, `/api/payments/sandbox/webhook`

## 4. Database

There are 74 Prisma models across identity/RBAC, catalogue (brands, collections, categories, families, notes, scent concepts, products, variants/SKUs, media, related products, discovery-set contents, layering pairs, bundles), inventory (warehouses, inventory, movements, batches), commerce (carts, orders, items, payments, payment events, refunds, shipments, PIN-code rules), entitlements (coupons, redemptions, discovery credits, loyalty accounts and transactions, referrals), engagement (wishlist, reviews, review media and votes, Q&A, scent profiles), CRM (consents, CRM events, templates, message log, support tickets, appointments, data requests), B2B (accounts, contacts, enquiries, briefs, samples, quotations, attachments, activities, documents), CMS (pages, homepage sections, banners, campaigns, journal, stores, settings) and observability (audit log, analytics events, error log).

Two migrations apply cleanly from scratch, with no drift against the schema (verified). Money is stored as integer paise. Unique constraints and indexes cover every lookup path. Products are soft-deleted (archived), and admin mutations are audited.

## 5. Catalogue import

All **69/69 SKUs** are imported from the SKU master (slides 71–74): **17 Dhun, 44 Vasana, 8 Anvaya**, grouped into 55 products, with exact codes, names (kept as `sourceName`), formats, sizes, concentrations, MRPs, channels, and gift and replenishment flags. All **47 concept briefs** are imported (32 Phase-One plus 15 pipeline), with top/heart/base notes (133 notes), story, character, occasion, climate, gender and packaging direction. Collections follow slide 63, and scent re-use across home formats follows slide 64.

Governance flags are set: names are `WORKING_NAME`, concentrations and prices are `PROPOSED`, and claims are `UNVERIFIED`. INCI and allergen declarations are pending. The blueprint's *expected realised price* is stored as internal planning data. Because MRP is the everyday price (slide 83), the storefront sells at MRP.

Discovery set contents follow the SKU master descriptions. Coffret compositions are marked "to be confirmed". Layering pairs are limited to the one pairing the blueprint names (Velvet Rush × Rose Lassi), and bundles are limited to those slide 83 names, with no discount.

## 6–8. Functional status

Legend: ✅ implemented and tested · 🔑 implemented, awaiting external credentials · 🟡 partially implemented · ⛔ not implemented

| Area | Status | Notes |
|---|---|---|
| Homepage (17 CMS-driven sections), brand storefronts, collections, campaigns, story | ✅ | E2E: home → brand |
| Search (synonyms, price intents, suggestions, recent/popular, zero-result recovery, analytics) | ✅ | Unit + E2E |
| PLP filters (brand, category, family, format, occasion, season, mood, intensity, size, notes, price, stock), sort, pagination, quick view, quick add, compare, recently viewed | ✅ | E2E: filters |
| PDP: gallery, variant selector syncing SKU/price/stock/URL, PIN check, pyramid, reviews, Q&A, layering, same-scent formats, quality/batch/authenticity, FBT (real orders only), sticky mobile bar, Product JSON-LD | ✅ | E2E: size → price → URL |
| Cart: quantities, gift wrap/message, coupons within brand ceilings, discovery credit, shipping, included GST, cross-sell | ✅ | Unit + integration + E2E |
| Checkout: guest/login, Indian address & PIN validation, serviceability, idempotency, atomic stock reservation, credit/coupon holds, expiry | ✅ | Integration + E2E |
| Payments: local signed sandbox (success/failure/retry, verified events, idempotent) | ✅ | Integration + E2E |
| Payments: Razorpay (order creation, server-side signature + API verification, webhook HMAC, refunds) | 🔑 | Signature logic unit-tested; needs keys for a live test |
| COD | ✅ (off by default) | Configurable; requires a PIN rule with `codAllowed` |
| Order confirmation, tracking, history, admin fulfilment (pack, ship, deliver), cancellation, refunds | ✅ | Refund + credit void tested |
| Shipping estimates | ✅ (rules) / 🔑 (Shiprocket) | 26 anchor-city prefixes seeded as configured estimates; other PINs are not promised |
| Scent Finder (10 steps, rules engine with configurable weights, exclusions, explanations, discovery-set suggestion, family profile, save/share/retake) | ✅ | Unit + E2E |
| Discovery Studio, credit entitlement lifecycle (issue on verified payment → reserve → redeem / release / void), terms, history | ✅ | Integration: double redemption and cross-account use blocked |
| Layering Studio (curated pairs only, save, add both, same-scent home) | ✅ | |
| Fragrance Wardrobe (profile, owned, favourites, discovery history, saved layering, explored, replenishment, personalised picks with consent) | ✅ | Smoke-tested |
| Gifting Atelier (finder, six occasion pages, bundles, gift wrap/message) | ✅ | Engraving is boutique-only; gift cards ⛔ |
| Accounts: register, login, logout, forgot/reset, addresses, preferences, consent log, data export, deletion request | ✅ | Reset email 🔑 (link goes to the Outbox when email isn't configured) |
| Reviews (verified-purchase flag, photo/video upload, moderation, filters, helpful votes) and Q&A | ✅ | Empty by design |
| Loyalty (tiers, points, expiry, redemption cap, referrals, staff adjustments) | 🟡 | Engine built and unit-tested; **disabled** because reward economics aren't approved. Point redemption at checkout isn't wired into the UI |
| CRM lifecycle hooks (welcome, discovery purchase, Day-21 check-in, full-size, review request, replenishment, birthday, loyalty milestone, lapsed) | ✅ engine / 🔑 delivery | Consent-gated; logged as `NOT_CONFIGURED` until email/WhatsApp keys are set |
| Odaya portal & B2B lifecycle (lead → repeat), briefs, samples, quotations, activities and follow-ups, owner, attachments, B2B-only role | ✅ | Integration + E2E |
| Admin (all areas above) operating on DB records with audit | ✅ | E2E: admin product edit → storefront |
| Analytics (first-party events, funnel, brand/SKU, search, channels, discovery conversion, CLV to date) | ✅ / 🔑 (GA4) | CAC is shown as unavailable because no spend data exists |
| SEO (metadata, canonicals, OG, Product/Breadcrumb/Article/Organization JSON-LD, sitemap, robots) | ✅ | |
| 360° viewer | ⛔ | No approved assets; the gallery supports video and multiple image slots |
| Gift cards | ⛔ | Not in the Phase-One blueprint |
| Multi-currency / export | ⛔ | INR only; the schema stores `currency` per order |

## 9–10. Integrations

| Integration | State |
|---|---|
| Local payment sandbox | Operational in dev (labelled, no money moves) |
| Razorpay | 🔑 Awaiting `RAZORPAY_KEY_ID`, `RAZORPAY_KEY_SECRET`, `RAZORPAY_WEBHOOK_SECRET` |
| Email (Resend-compatible) | 🔑 Awaiting `EMAIL_PROVIDER_API_KEY`, `EMAIL_FROM` |
| WhatsApp Cloud API | 🔑 Awaiting `WHATSAPP_TOKEN`, `WHATSAPP_PHONE_NUMBER_ID`. Business-initiated messages need approved templates |
| Shiprocket | 🔑 Credentials variables reserved; the live serviceability call isn't implemented yet. PIN-code rules are used |
| GA4 Measurement Protocol | 🔑 Awaiting `GA4_MEASUREMENT_ID`, `GA4_API_SECRET` |

Admin → System → Integrations shows each integration's status without revealing secrets.

## 11–12. Testing performed (all actually executed)

- **Unit (34 tests)**: pricing and brand ceilings, coupons, credits rules, loyalty, PIN/delivery, Razorpay and sandbox signatures, scrypt, markdown XSS escaping, upload magic-byte sniffing, RBAC, catalogue counts, listing filters, recommendation engine, search (the blueprint's six example queries).
- **Integration (16 tests)**: registration and auth, stock limits, idempotent checkout, oversell prevention, unserviceable PIN, forged event rejection, failure → retry → paid, duplicate capture, amount mismatch, expiry releasing stock, Razorpay webhook rejection, credit issue → redeem → double-redemption block → cross-account block → refund void, coupon per-customer limit with Anvaya exclusion, admin update reflected and archived products hidden, B2B enquiry persistence.
- **E2E (15 tests, production build, Edge)**: all 17 journey steps in the brief, payment failure and retry, unauthenticated and customer access to admin, API auth/validation/signature checks, order access tokens, accessible form errors, empty states and real 404s, and the mobile journey (menu, filter sheet, sticky buy bar, no horizontal overflow).

**Result: 50/50 Vitest and 15/15 Playwright passing. `next build` and `tsc --noEmit` are clean.**

Defects found and fixed during QA:

- "₹3,000" was parsed as 3.
- A stale discovery credit blocked checkout retries.
- `notFound()` returned 200 because of a streaming loading boundary.
- Tailwind emitted component CSS unlayered, which overrode responsive utilities and crowded the mobile header.
- The hero headline's fade-in delayed LCP.
- Brand themes didn't reach utility classes (`@theme inline`).
- Coupon brand-scope checkboxes submitted "on".
- The admin action wrapper swallowed `redirect()`.
- A server component called a client-module helper.

## 13. Performance (measured, local production build)

| Page | Server response (TTFB, warm) | HTML |
|---|---|---|
| Home | ~46 ms | 254 KB |
| Shop | ~66 ms | 188 KB |
| PDP | ~116 ms | 101 KB |
| Vasana | ~94 ms | 123 KB |
| Odaya | ~7 ms | 36 KB |

The homepage at 375 px loads 156 KB of compressed JS, 14 KB of CSS and about 226 KB of fonts, with CLS 0 and no horizontal overflow.

**LCP could not be measured reliably in the embedded browser pane, so no Core Web Vitals scores are claimed.** Run Lighthouse or WebPageTest against a deployed build. Likely next optimisations: trim font weights (226 KB is the largest asset) and add HTTP caching or ISR for listing pages.

## 14. Security

- scrypt password hashing and hashed session tokens; httpOnly, SameSite=Lax, Secure in production.
- RBAC checked server-side on every admin page and action, plus a cookie gate in `proxy.ts`.
- Zod validation everywhere.
- Prisma parameterised queries; the one raw SQL statement (atomic reservation) uses tagged-template parameters.
- Markdown is escaped, and JSON-LD escapes `<`.
- CSP, `nosniff`, `frame-ancestors 'self'` and HSTS in production.
- Rate limits on auth, checkout, reviews, finder, analytics and forms (in-memory; use Redis for multi-instance).
- Uploads are typed by magic bytes, with SVG and HTML refused and random filenames.
- Payments: HMAC verification with timing-safe comparison, idempotent event store, amount checks, and late-capture refund flagging.
- Signed order-access tokens for guests.
- Audit log and error log.
- DPDP: consent ledger, data export, deletion workflow (anonymise while retaining orders).
- The Odaya role can't read consumer data.

`npm audit` reports advisories only in Prisma 6's CLI config tooling (`effect`, `deepmerge-ts`, build-time only). Fixing them needs Prisma 7, a breaking adapter migration that's recommended as a follow-up.

## 15. Known limitations

- **Imagery.** There's no real product photography yet. Labelled SVG illustrations stand in until approved photos are uploaded in Admin.
- **Policy pages.** Legal and policy pages are drafts flagged for legal review.
- **Commercial settings.** Shipping fees are placeholders (flagged in admin), loyalty is disabled, and COD is off.
- **Search.** It runs in memory over the catalogue, which suits a few hundred SKUs. Move to Postgres FTS or Meilisearch at scale.
- **Rate limiting and jobs.** The rate limiter is in-memory. Jobs need an external scheduler.
- **Database.** SQLite is for local use only; switch the provider to PostgreSQL for production.
- **Admin forms.** They don't keep entered values after a validation error.

## 16–18. Local URL, commands, environment

- URL: `http://localhost:3000`, admin at `/admin`, B2B at `/odaya`.
- Commands: `npm install && cp .env.example .env && npm run setup && npm run dev`.
- Environment variables: see the README table and `.env.example`.

## 19. Next operational steps

1. Provision PostgreSQL, set `provider = "postgresql"`, run `prisma migrate deploy` and seed with `SEED_TEST_DATA=false`.
2. Add Razorpay keys and the webhook secret, then run a live test-mode payment and refund.
3. Connect email and WhatsApp, and get WhatsApp templates approved.
4. Have counsel review the policy pages and clear `needsLegalReview`.
5. Approve prices, concentrations and names per SKU, and record INCI, allergen and IFRA batch data as formulas pass their gates.
6. Upload approved photography per slot.
7. Approve shipping fees, COD and loyalty economics.
8. Load real PIN serviceability from your 3PL, and implement the Shiprocket rate/serviceability call.
9. Schedule `npm run jobs:expire`.
10. Run Lighthouse on staging.
11. Plan the Prisma 7 upgrade.
