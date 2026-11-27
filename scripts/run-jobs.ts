/**
 * Scheduled jobs: expire unpaid orders (releasing stock, credits, coupons), queue birthday/lapsed
 * events and send due lifecycle messages. Schedule every 5 minutes in production:
 *   npm run jobs:expire
 */
import { expireStaleOrders } from "../src/lib/payments/process";
import { processDueCrmEvents, scheduleScannedEvents } from "../src/lib/crm";
import { db } from "../src/lib/db";

(async () => {
  const expired = await expireStaleOrders();
  const scanned = await scheduleScannedEvents();
  const sent = await processDueCrmEvents();
  console.log(JSON.stringify({ ts: new Date().toISOString(), expired, scanned, sent }));
  await db.$disconnect();
})().catch((e) => { console.error(e); process.exit(1); });
