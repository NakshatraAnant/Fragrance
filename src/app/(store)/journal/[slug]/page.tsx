import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { db } from "@/lib/db";
import { renderMarkdown } from "@/lib/markdown";
import { formatDate } from "@/lib/money";
import { Breadcrumbs } from "@/components/ui/breadcrumbs";
import { JsonLd } from "@/components/seo/json-ld";
import { env } from "@/lib/env";

type P = { params: Promise<{ slug: string }> };
const load = (slug: string) => db.journalPost.findFirst({ where: { slug, status: "PUBLISHED" }, include: { brand: true } });

export async function generateMetadata({ params }: P): Promise<Metadata> {
  const p = await load((await params).slug);
  return p ? { title: p.title, description: p.excerpt, alternates: { canonical: `/journal/${p.slug}` }, openGraph: { type: "article", title: p.title, description: p.excerpt } } : {};
}

export default async function JournalPost({ params }: P) {
  const p = await load((await params).slug);
  if (!p) notFound();
  return (
    <article className="container-x max-w-3xl py-12">
      <JsonLd data={{ "@context": "https://schema.org", "@type": "Article", headline: p.title, datePublished: p.publishedAt.toISOString(), publisher: { "@type": "Organization", name: "Vasana House" }, mainEntityOfPage: `${env.appUrl()}/journal/${p.slug}` }} />
      <Breadcrumbs items={[{ name: "Journal", href: "/journal" }, { name: p.title, href: `/journal/${p.slug}` }]} />
      <p className="eyebrow mt-8">{p.brand?.name ?? "The house"} · {formatDate(p.publishedAt)}</p>
      <h1 className="display mt-4 text-5xl md:text-7xl">{p.title}</h1>
      <p className="lede mt-6">{p.excerpt}</p>
      <div className="mt-10 prose-house" dangerouslySetInnerHTML={{ __html: renderMarkdown(p.body) }} />
      <div className="mt-12 flex flex-wrap gap-3 border-t border-line pt-8"><Link href="/journal" className="btn btn-outline">More stories</Link><Link href="/scent-finder" className="btn btn-primary">Find your scent</Link></div>
    </article>
  );
}
