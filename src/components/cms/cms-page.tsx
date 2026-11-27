import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { cmsPage } from "@/lib/content";
import { renderMarkdown } from "@/lib/markdown";
import { PageHeader } from "@/components/listing/listing";
import { db } from "@/lib/db";
import { SupportForm } from "@/components/forms/appointment-form";
import { formatDate } from "@/lib/money";

export async function cmsMetadata(slug: string): Promise<Metadata> {
  const p = await cmsPage(slug);
  return p ? { title: p.seoTitle ?? p.title, description: p.seoDescription ?? p.intro ?? undefined, alternates: { canonical: `/${slug}` } } : {};
}

/** Renders an admin-editable CMS page. Some slugs get a functional block (form, store list). */
export async function CmsPageView({ slug }: { slug: string }) {
  const p = await cmsPage(slug);
  if (!p) notFound();
  const stores = slug === "stores" ? await db.storeLocation.findMany({ orderBy: { sortOrder: "asc" } }) : [];
  return (
    <>
      <PageHeader eyebrow={p.eyebrow ?? undefined} title={p.title} intro={p.intro} crumbs={[{ name: p.title, href: `/${slug}` }]} />
      <div className="container-x grid gap-12 pb-16 lg:grid-cols-[1fr_20rem]">
        <article className="prose-house" dangerouslySetInnerHTML={{ __html: renderMarkdown(p.body) }} />
        <aside className="text-xs text-muted lg:pt-3">Last updated {formatDate(p.updatedAt)}{p.needsLegalReview ? " · Draft pending legal review" : ""}</aside>
      </div>
      {slug === "stores" && (
        <section className="container-x pb-16" aria-label="Store locations">
          <ul className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
            {stores.map((s) => (
              <li key={s.id} className="card p-6">
                <div className="flex items-center justify-between"><p className="display text-2xl">{s.name}</p><span className={`badge ${s.status === "OPEN" ? "badge-ok" : "badge-warn"}`}>{s.status === "OPEN" ? "Open" : "Planned"}</span></div>
                <p className="mt-1 text-sm">{s.city}</p>{s.address && <p className="text-sm text-muted">{s.address}</p>}{s.note && <p className="mt-2 text-sm text-muted">{s.note}</p>}
              </li>
            ))}
          </ul>
        </section>
      )}
      {(slug === "contact" || slug === "support") && <section className="container-x max-w-3xl pb-16"><h2 className="display mb-6 text-3xl">Send us a message</h2><SupportForm /></section>}
    </>
  );
}
