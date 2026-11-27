import type { Metadata } from "next";
import { bestsellerCards } from "@/lib/catalog";
import { ProductGrid } from "@/components/product/product-card";
import { PageHeader } from "@/components/listing/listing";

export const metadata: Metadata = { title: "Bestsellers", alternates: { canonical: "/bestsellers" } };

export default async function BestsellersPage() {
  const { cards, basis } = await bestsellerCards(24);
  return (
    <>
      <PageHeader eyebrow="Most loved" title="Bestsellers" crumbs={[{ name: "Bestsellers", href: "/bestsellers" }]}
        intro={basis === "SALES" ? "Ranked by units in confirmed, paid orders." : "We don't have enough confirmed orders to rank by sales yet. Until we do, this page shows the house's own selection, not sales data."} />
      <div className="container-x"><ProductGrid products={cards} list="bestsellers" /></div>
    </>
  );
}
