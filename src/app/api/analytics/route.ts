import { NextResponse } from "next/server";
import { z } from "zod";
import { EVENT_NAMES, recordEvent, type EventName } from "@/lib/analytics";
import { getCurrentUser, clientIp } from "@/lib/auth";
import { rateLimit } from "@/lib/rate-limit";

const Ev = z.object({
  name: z.string().max(40), brand: z.string().max(20).nullish(), productId: z.string().max(40).nullish(), sku: z.string().max(20).nullish(),
  props: z.record(z.string(), z.unknown()).optional(), valuePaise: z.number().int().nullish(), path: z.string().max(300).optional(), referrer: z.string().max(300).optional(),
});
const Body = z.object({ sessionId: z.string().max(64), events: z.array(Ev).max(25) });

/** First-party analytics ingestion. Unknown event names are dropped; rate-limited per IP. */
export async function POST(req: Request) {
  if (!rateLimit(`an:${await clientIp()}`, 240, 60_000).ok) return new NextResponse(null, { status: 429 });
  const parsed = Body.safeParse(await req.json().catch(() => null));
  if (!parsed.success) return new NextResponse(null, { status: 400 });
  const user = await getCurrentUser();
  for (const e of parsed.data.events) {
    if (!(EVENT_NAMES as readonly string[]).includes(e.name)) continue;
    // Server-authoritative events (purchase, add_to_cart…) are recorded by the server; ignore client copies.
    if (["purchase", "add_to_cart", "checkout_start", "payment_failure", "discovery_set_purchase", "discovery_credit_redeemed", "review_submit", "b2b_enquiry", "wishlist_add", "search"].includes(e.name)) continue;
    await recordEvent(e.name as EventName, { sessionId: parsed.data.sessionId, userId: user?.id, brand: e.brand, productId: e.productId, sku: e.sku, path: e.path, referrer: e.referrer, props: e.props, valuePaise: e.valuePaise });
  }
  return new NextResponse(null, { status: 204 });
}
