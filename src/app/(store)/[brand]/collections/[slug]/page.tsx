import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { db } from "@/lib/db";
import { Listing, PageHeader } from "@/components/listing/listing";

type P = { params: Promise<{ brand: string; slug: string }>; searchParams: Promise<Record<string, string | string[] | undefined>> };

async function load(brand: string, slug: string) {
  return db.collection.findFirst({ where: { slug, brand: { slug: brand }, isActive: true }, include: { brand: true } });
}

export async function generateMetadata({ params }: P): Promise<Metadata> {
  const { brand, slug } = await params;
  const c = await load(brand, slug);
  return c ? { title: `${c.name} — ${c.brand.name}`, description: c.description, alternates: { canonical: `/${brand}/collections/${slug}` } } : {};
}

export default async function CollectionPage({ params, searchParams }: P) {
  const { brand, slug } = await params;
  const c = await load(brand, slug);
  if (!c) notFound();
  return (
    <>
      <PageHeader eyebrow={c.brand.name} title={c.name} intro={c.description} crumbs={[{ name: c.brand.name, href: `/${brand}` }, { name: c.name, href: `/${brand}/collections/${slug}` }]} />
      <div className="container-x"><Listing searchParams={await searchParams} base={{ brand: [brand], collection: slug }} hideFacets={["brand"]} basePath={`/${brand}/collections/${slug}`} /></div>
    </>
  );
}
