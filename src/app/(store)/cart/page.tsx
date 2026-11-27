import type { Metadata } from "next";
import { CartPageClient } from "@/components/cart/cart-page";
import { getAllCards } from "@/lib/catalog";

export const metadata: Metadata = { title: "Your bag", robots: { index: false } };

export default async function CartPage() {
  // Cross-sell candidates: discovery sets, travel sizes and gift-ready small formats (real catalogue items).
  const cards = await getAllCards();
  const crossSell = cards.filter((c) => c.available && (c.isDiscoverySet || c.format === "TRAVEL" || c.format === "SOLID")).slice(0, 8);
  return <CartPageClient crossSell={crossSell} />;
}
