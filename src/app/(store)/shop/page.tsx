import type { Metadata } from "next";
import { Listing, PageHeader } from "@/components/listing/listing";

export const metadata: Metadata = { title: "Shop all fragrances", description: "Every Dhun, Vasana and Anvaya product: eaux de parfum, extraits, attar, mists, discovery sets, home fragrance and gifting.", alternates: { canonical: "/shop" } };

export default async function ShopPage({ searchParams }: { searchParams: Promise<Record<string, string | string[] | undefined>> }) {
  const sp = await searchParams;
  return (
    <>
      <PageHeader eyebrow="Shop" title="Shop all" intro="The full Phase-One portfolio, from ₹299 Dhun pocket sprays to Anvaya extraits. Filter by family, note, mood, occasion or climate." crumbs={[{ name: "Shop", href: "/shop" }]} />
      <div className="container-x"><Listing searchParams={sp} basePath="/shop" /></div>
    </>
  );
}
