import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { getAllCards } from "@/lib/catalog";
import { GIFT_OCCASIONS } from "@/lib/gifting";
import { PageHeader } from "@/components/listing/listing";
import { ProductGrid } from "@/components/product/product-card";

type P = { params: Promise<{ occasion: string }> };

export function generateStaticParams() { return Object.keys(GIFT_OCCASIONS).map((occasion) => ({ occasion })); }

export async function generateMetadata({ params }: P): Promise<Metadata> {
  const o = GIFT_OCCASIONS[(await params).occasion];
  return o ? { title: o.title, description: o.intro } : {};
}

export default async function OccasionPage({ params }: P) {
  const { occasion } = await params;
  const o = GIFT_OCCASIONS[occasion];
  if (!o) notFound();
  const products = (await getAllCards()).filter((c) => c.available && o.match(c)).slice(0, 24);
  return (
    <>
      <PageHeader eyebrow="Gifting Atelier" title={o.title} intro={o.intro} crumbs={[{ name: "Gifting", href: "/gifting" }, { name: o.title, href: `/gifting/${occasion}` }]}>
        {o.b2b && <Link href="/odaya/corporate-gifting" className="btn btn-outline mt-6">Bulk & personalised kits with Odaya →</Link>}
      </PageHeader>
      <div className="container-x"><ProductGrid products={products} list={`gifting-${occasion}`} /></div>
    </>
  );
}
