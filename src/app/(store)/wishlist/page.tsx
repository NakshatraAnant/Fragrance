import type { Metadata } from "next";
import Link from "next/link";
import { db } from "@/lib/db";
import { getCurrentUser, readGuestToken } from "@/lib/auth";
import { cardsByIds } from "@/lib/catalog";
import { ProductGrid } from "@/components/product/product-card";
import { PageHeader } from "@/components/listing/listing";
import { EmptyState } from "@/components/ui/empty-state";

export const metadata: Metadata = { title: "Wishlist", robots: { index: false } };
export const dynamic = "force-dynamic";

export default async function WishlistPage() {
  const user = await getCurrentUser();
  const token = await readGuestToken();
  const rows = user ? await db.wishlistItem.findMany({ where: { userId: user.id }, orderBy: { createdAt: "desc" } }) : token ? await db.wishlistItem.findMany({ where: { guestToken: token }, orderBy: { createdAt: "desc" } }) : [];
  const cards = await cardsByIds(rows.map((r) => r.productId));
  return (
    <>
      <PageHeader eyebrow="Saved" title="Wishlist" intro={user ? undefined : "Saved on this device. Sign in to keep your wishlist across devices; we'll merge it in."} crumbs={[{ name: "Wishlist", href: "/wishlist" }]} />
      <div className="container-x" data-testid="wishlist">
        {cards.length ? <ProductGrid products={cards} list="wishlist" /> : <EmptyState title="Nothing saved yet" body="Tap the heart on any product to save it here."><Link href="/shop" className="btn btn-primary">Browse the house</Link></EmptyState>}
      </div>
    </>
  );
}
