# Vasana House: fragrance discovery & commerce ecosystem

This is one commerce platform with three consumer storefronts (**Dhun**, **Vasana**, **Anvaya**), an independent B2B portal (**Odaya Fragrance Works**) and an admin & merchandising control centre. The source of truth is *Fragrance_Enterprise_Blueprint.pptx*. Its Phase-One catalogue (69 SKUs, 32 scent concepts, plus 15 pipeline concepts) is imported from the SKU master and concept library.

> Full build report, including feature status, test results, measurements and limitations: [`docs/IMPLEMENTATION_REPORT.md`](docs/IMPLEMENTATION_REPORT.md)

## Quick start (local, zero external services)

Requirements: Node.js 20+ (tested on 24) and npm. No database server is needed, because local development uses SQLite.

```bash
npm install                 # also runs `prisma generate`
cp .env.example .env        # defaults work as-is for local development
npm run setup               # applies migrations + seeds the catalogue, admin user, CMS and test stock
npm run dev                 # http://localhost:3000
```

| What | Where |
|---|---|
| Storefront | http://localhost:3000 |
| Brand storefronts | `/dhun`, `/vasana`, `/anvaya` |
| Odaya B2B portal | http://localhost:3000/odaya |
| Admin control centre | http://localhost:3000/admin |
| Admin sign-in (local test only) | `ADMIN_SEED_EMAIL` / `ADMIN_SEED_PASSWORD` from your `.env` (defaults in `.env.example`) |

Payments run in the **local sandbox** until Razorpay keys are set. The sandbox is clearly labelled, moves no money and contacts no bank. Each payment event is HMAC-signed and verified server-side before an order changes state.

## Commands

| Command | Purpose |
|---|---|
| `npm run dev` | Development server (port 3000) |
| `npm run build` / `npm start` | Production build / server |
| `npm run setup` | `prisma migrate deploy` + seed (idempotent; never overwrites admin edits to CMS content) |
| `npm run db:migrate` | Create a new migration after editing `prisma/schema.prisma` |
| `npm run db:seed` | Re-run the seed (upserts catalogue by SKU/slug) |
| `npm test` | Unit + integration tests (Vitest; uses an isolated `prisma/test.db`) |
| `npm run test:e2e` | End-to-end tests (Playwright) against the production build on port 3217 with an isolated `prisma/e2e.db`. Run `npm run build` first. Uses the installed Microsoft Edge by default; set `PW_CHANNEL=""` and run `npx playwright install chromium` to use bundled Chromium. |
| `npm run typecheck` | TypeScript strict check |
| `npm run jobs:expire` | Scheduled jobs: expire unpaid orders (release stock, credit, coupon), queue birthday/lapsed events, send due lifecycle messages. Schedule every ~5 min in production. |
| `npm run catalogue:report` | Print the imported catalogue for verification against the SKU master |
| `npm run catalogue:parse <extracted.txt> data/catalogue` | Re-parse the blueprint extraction (see `scripts/extract-pptx-text.js`) |

## Environment variables

See [`.env.example`](.env.example). Every integration degrades gracefully when its credentials are absent.

| Variable | Required | Purpose |
|---|---|---|
| `DATABASE_URL` | yes | `file:./dev.db` locally. For production PostgreSQL, set the provider in `prisma/schema.prisma` to `postgresql` |
| `APP_URL` | yes | Canonical URLs, sitemap, email links |
| `SESSION_SECRET` | yes (prod) | Signs order-access tokens. Use 32+ random bytes |
| `ADMIN_SEED_EMAIL`, `ADMIN_SEED_PASSWORD` | seed | First super-admin |
| `SEED_TEST_DATA` | seed | `true` adds clearly-labelled TEST stock in a `DEV-TEST` warehouse and a `TEST10` coupon. Use `false` for production |
| `RAZORPAY_KEY_ID`, `RAZORPAY_KEY_SECRET`, `RAZORPAY_WEBHOOK_SECRET` | for live payments | UPI, cards, net banking. Webhook URL: `/api/payments/razorpay/webhook` |
| `PAYMENTS_SANDBOX_ENABLED`, `PAYMENTS_SANDBOX_SECRET` | dev | Local signed payment sandbox. Refuses to run in production unless explicitly `true` |
| `EMAIL_PROVIDER_API_KEY`, `EMAIL_FROM` | optional | Resend-compatible email. Without it, messages are logged to Admin → System → Outbox as `NOT_CONFIGURED` |
| `WHATSAPP_TOKEN`, `WHATSAPP_PHONE_NUMBER_ID` | optional | WhatsApp Cloud API |
| `SHIPROCKET_EMAIL`, `SHIPROCKET_PASSWORD` | optional | Reserved for live serviceability. Until connected, delivery estimates come from admin-configured PIN-code rules |
| `GA4_MEASUREMENT_ID`, `GA4_API_SECRET` | optional | Server-side GA4 forwarding. First-party analytics are always stored |

## Architecture

- **Next.js 16 (App Router, Turbopack) + React 19 + TypeScript (strict) + Tailwind CSS v4**
- **Prisma 6** with SQLite locally and a portable schema for PostgreSQL in production (74 models, two migrations)
- **Zod** validation on every API route, server action and setting
- Server actions for forms (built-in origin checks), route handlers for JSON, webhooks and uploads
- Own session auth: scrypt hashes, hashed DB session tokens in httpOnly cookies, and RBAC with six roles. The Odaya team is firewalled from consumer data.
- `src/lib/*` holds the domain services: pricing, coupons, credits, inventory, checkout, payments, CRM, search, recommendations, metrics
- `data/catalogue/*` holds the blueprint extraction (`skus.json`, `concepts.json`) and the documented mapping to commerce records

```
src/app/(store)     consumer storefront (house + brand storefronts, PDP, cart, checkout, account…)
src/app/odaya       B2B portal (separate layout and identity)
src/app/admin       control centre (permission-gated)
src/app/api         cart, wishlist, search, finder, analytics, reviews, webhooks, export
src/lib             domain services (pure engines are unit-tested)
prisma              schema, migrations, seed
tests               unit + integration (Vitest)    e2e/  Playwright
```

## Data integrity rules built in

- No fake reviews, ratings, orders, sales or testimonials are seeded. The review UI ships genuinely empty.
- Stock is seeded only in a warehouse flagged `isTest`, and only when `SEED_TEST_DATA=true`.
- Names are *working names*, concentrations and prices are *proposed*, and claims are *unverified* until a person approves them in Admin.
- The MRP is the selling price, with no fictitious strike-through prices. Coupons are capped per brand (Dhun 25%, Vasana 15%, Anvaya 0%).
- Products show a labelled **illustration** until approved final photography is uploaded. No AI concept bottle is presented as a product.
- Bestsellers rank by real paid orders and are clearly labelled as "house selection" until enough sales exist.
- Delivery promises come only from configured PIN-code rules. Unknown PIN codes are told "we can't confirm delivery yet".
