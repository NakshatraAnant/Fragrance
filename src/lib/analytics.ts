/**
 * First-party analytics. Every event is stored in AnalyticsEvent (actual data). If GA4 credentials
 * are configured, events are also forwarded via the Measurement Protocol. Nothing is estimated here.
 */
import { db } from "./db";
import { env } from "./env";

export const EVENT_NAMES = [
  "page_view", "brand_visit", "product_impression", "product_click", "product_view", "search", "filter_use",
  "finder_start", "finder_complete", "recommendation_click", "discovery_set_purchase", "discovery_credit_redeemed",
  "add_to_cart", "checkout_start", "purchase", "payment_failure", "wishlist_add", "review_submit", "repeat_purchase",
  "referral", "b2b_enquiry", "newsletter_signup", "layering_save",
] as const;
export type EventName = (typeof EVENT_NAMES)[number];

export type EventInput = { sessionId?: string; userId?: string | null; brand?: string | null; productId?: string | null; sku?: string | null; path?: string | null; referrer?: string | null; props?: Record<string, unknown>; valuePaise?: number | null };

export async function recordEvent(name: EventName, e: EventInput) {
  const row = await db.analyticsEvent.create({
    data: {
      name, sessionId: e.sessionId ?? "server", userId: e.userId ?? null, brand: e.brand ?? null, productId: e.productId ?? null, sku: e.sku ?? null,
      path: e.path?.slice(0, 300) ?? null, referrer: e.referrer?.slice(0, 300) ?? null, props: JSON.stringify(e.props ?? {}).slice(0, 4000), valuePaise: e.valuePaise ?? null,
    },
  });
  void forwardToGa4(name, e);
  return row;
}

export async function recordServerEvent(name: EventName, e: EventInput) {
  try {
    await recordEvent(name, e);
  } catch {
    /* analytics must never break commerce */
  }
}

async function forwardToGa4(name: string, e: EventInput) {
  const { measurementId, apiSecret } = env.ga4();
  if (!measurementId || !apiSecret || process.env.NODE_ENV === "test") return;
  try {
    await fetch(`https://www.google-analytics.com/mp/collect?measurement_id=${encodeURIComponent(measurementId)}&api_secret=${encodeURIComponent(apiSecret)}`, {
      method: "POST",
      body: JSON.stringify({ client_id: e.sessionId ?? "server", events: [{ name, params: { brand: e.brand, sku: e.sku, value: e.valuePaise ? e.valuePaise / 100 : undefined, currency: "INR" } }] }),
    });
  } catch {
    /* ignore */
  }
}
