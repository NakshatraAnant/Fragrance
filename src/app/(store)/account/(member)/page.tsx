import type { Metadata } from "next";
import Link from "next/link";
import { db } from "@/lib/db";
import { requireUser } from "@/lib/auth";
import { availableCredits } from "@/lib/credits";
import { formatINR, formatDate } from "@/lib/money";

export const metadata: Metadata = { title: "Your account", robots: { index: false } };

export default async function AccountHome() {
  const user = await requireUser();
  const [orders, credits, profile, wish] = await Promise.all([
    db.order.findMany({ where: { userId: user.id }, orderBy: { createdAt: "desc" }, take: 3 }),
    availableCredits(user.id, user.email),
    db.scentProfile.findFirst({ where: { userId: user.id }, orderBy: { createdAt: "desc" } }),
    db.wishlistItem.count({ where: { userId: user.id } }),
  ]);
  return (
    <div className="grid gap-8">
      <h1 className="display text-5xl">Hello{user.name ? `, ${user.name.split(" ")[0]}` : ""}</h1>
      <div className="grid gap-4 md:grid-cols-3">
        <Link href="/account/wardrobe" className="lift card p-6"><p className="eyebrow">Scent profile</p><p className="display mt-2 text-2xl">{profile?.personalityTitle ?? "Not yet created"}</p><p className="mt-2 text-sm text-muted">{profile ? "View your Fragrance Wardrobe" : "Take the Scent Finder"}</p></Link>
        <Link href="/account/loyalty" className="lift card p-6"><p className="eyebrow">Discovery credits</p><p className="display mt-2 text-2xl">{credits.length ? formatINR(credits.reduce((s, c) => s + c.amountPaise, 0)) : "None available"}</p><p className="mt-2 text-sm text-muted">{credits[0] ? `Next expiry ${formatDate(credits[0].expiresAt)}` : "Buy a discovery set to earn one"}</p></Link>
        <Link href="/wishlist" className="lift card p-6"><p className="eyebrow">Wishlist</p><p className="display mt-2 text-2xl">{wish} saved</p></Link>
      </div>
      <section>
        <div className="flex items-baseline justify-between"><h2 className="display text-3xl">Recent orders</h2><Link href="/account/orders" className="text-sm underline">All orders</Link></div>
        {orders.length === 0 ? <p className="mt-3 text-muted">No orders yet.</p> : (
          <ul className="mt-4 divide-y divide-line border-y border-line">{orders.map((o) => <li key={o.id}><Link href={`/order/${o.number}`} className="flex flex-wrap justify-between gap-2 py-4 hover:bg-surface-2"><span className="font-semibold">{o.number}</span><span className="text-sm text-muted">{formatDate(o.createdAt)} · {o.status.replace(/_/g, " ").toLowerCase()}</span><span>{formatINR(o.totalPaise)}</span></Link></li>)}</ul>
        )}
      </section>
    </div>
  );
}
