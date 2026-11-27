import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { db } from "@/lib/db";
import { getAllCards } from "@/lib/catalog";
import { ProductGrid } from "@/components/product/product-card";
import { Breadcrumbs } from "@/components/ui/breadcrumbs";

type P = { params: Promise<{ brand: string; slug: string }> };

async function load(brand: string, slug: string) {
  const now = new Date();
  const c = await db.campaign.findFirst({ where: { slug, brand: { slug: brand }, status: "PUBLISHED" }, include: { brand: true } });
  if (!c || (c.startsAt && c.startsAt > now) || (c.endsAt && c.endsAt < now)) return null;
  return c;
}

export async function generateMetadata({ params }: P): Promise<Metadata> {
  const { brand, slug } = await params;
  const c = await load(brand, slug);
  return c ? { title: `${c.title} — ${c.brand.name}`, description: c.body } : {};
}

export default async function CampaignPage({ params }: P) {
  const { brand, slug } = await params;
  const c = await load(brand, slug);
  if (!c) notFound();
  const slugs = c.productSkus.split(",").filter(Boolean);
  const products = (await getAllCards()).filter((p) => slugs.includes(p.slug)).sort((a, b) => slugs.indexOf(a.slug) - slugs.indexOf(b.slug));
  return (
    <>
      <section className="relative overflow-hidden border-b border-line grain">
        <div className="container-x py-20 md:py-28">
          <Breadcrumbs items={[{ name: c.brand.name, href: `/${brand}` }, { name: c.title, href: `/${brand}/campaign/${slug}` }]} />
          <p className="eyebrow mt-8">{c.eyebrow}</p>
          <h1 className="display mt-4 text-6xl md:text-8xl">{c.title}</h1>
          <p className="lede mt-6">{c.body}</p>
        </div>
      </section>
      <section className="container-x py-16"><ProductGrid products={products} list={`campaign-${slug}`} /></section>
    </>
  );
}
