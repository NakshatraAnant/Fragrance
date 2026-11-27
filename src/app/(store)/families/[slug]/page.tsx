import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { db } from "@/lib/db";
import { Listing, PageHeader } from "@/components/listing/listing";

type P = { params: Promise<{ slug: string }>; searchParams: Promise<Record<string, string | string[] | undefined>> };

export async function generateMetadata({ params }: P): Promise<Metadata> {
  const f = await db.fragranceFamily.findUnique({ where: { slug: (await params).slug } });
  return f ? { title: `${f.name} fragrances`, description: f.description, alternates: { canonical: `/families/${f.slug}` } } : {};
}

export default async function FamilyPage({ params, searchParams }: P) {
  const { slug } = await params;
  const f = await db.fragranceFamily.findUnique({ where: { slug } });
  if (!f) notFound();
  return (
    <>
      <div aria-hidden className="h-2" style={{ background: f.colour }} />
      <PageHeader eyebrow="Fragrance family" title={f.name} intro={f.description} crumbs={[{ name: "Families", href: "/families" }, { name: f.name, href: `/families/${slug}` }]} />
      <div className="container-x"><Listing searchParams={await searchParams} base={{ family: [slug] }} hideFacets={["family"]} basePath={`/families/${slug}`} /></div>
    </>
  );
}
