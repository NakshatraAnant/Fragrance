import { db } from "@/lib/db";
import { requireStaff } from "@/lib/auth";
import { saveCampaign, saveJournal, savePage } from "@/app/actions/admin/content";
import { AdminHeader, Area, Btn, Check, Flash, In, Pill, Section, Sel } from "@/components/admin/ui";

const d = (x: Date | null) => (x ? x.toISOString().slice(0, 10) : "");

export default async function ContentAdmin({ searchParams }: { searchParams: Promise<{ msg?: string; err?: string }> }) {
  await requireStaff("cms:write", "/admin/content");
  const sp = await searchParams;
  const [pages, posts, campaigns, brands] = await Promise.all([db.cmsPage.findMany({ orderBy: { slug: "asc" } }), db.journalPost.findMany({ orderBy: { publishedAt: "desc" } }), db.campaign.findMany({ include: { brand: true }, orderBy: { createdAt: "desc" } }), db.brand.findMany({ orderBy: { sortOrder: "asc" } })]);
  const brandOpts = brands.map((b) => [b.id, b.name] as [string, string]);
  return (
    <>
      <AdminHeader title="Pages, journal & campaigns" sub="Body text supports a safe subset of markdown: ## headings, - lists, **bold**, *italic*, [links](/path) and > notes." />
      <Flash msg={sp.msg} err={sp.err} />
      <Section title="CMS pages">
        <div className="grid gap-2">
          {pages.map((p) => (
            <details key={p.id} className="card p-4">
              <summary className="flex cursor-pointer flex-wrap items-center gap-2"><strong>/{p.slug}</strong> {p.title} <Pill tone={p.status === "PUBLISHED" ? "ok" : "warn"}>{p.status}</Pill>{p.needsLegalReview && <Pill tone="danger">Needs legal review</Pill>}</summary>
              <form action={savePage} className="mt-3 grid gap-3 md:grid-cols-3">
                <input type="hidden" name="slug" value={p.slug} />
                <In label="Title" name="title" defaultValue={p.title} /><In label="Eyebrow" name="eyebrow" defaultValue={p.eyebrow} /><Sel label="Status" name="status" defaultValue={p.status} options={["PUBLISHED", "DRAFT"]} />
                <Area label="Intro" name="intro" defaultValue={p.intro} rows={2} className="md:col-span-3" /><Area label="Body (markdown)" name="body" defaultValue={p.body} rows={12} className="md:col-span-3" />
                <In label="SEO title" name="seoTitle" defaultValue={p.seoTitle} /><In label="SEO description" name="seoDescription" defaultValue={p.seoDescription} /><div className="flex items-end"><Check label="Needs legal review" name="needsLegalReview" defaultChecked={p.needsLegalReview} /></div>
                <div><Btn>Save page</Btn></div>
              </form>
            </details>
          ))}
        </div>
      </Section>
      <Section title="The Scent Journal">
        <div className="grid gap-2">
          {[...posts, null].map((p) => (
            <details key={p?.id ?? "new"} className="card p-4" open={!p && posts.length === 0}>
              <summary className="cursor-pointer">{p ? <><strong>{p.title}</strong> <Pill tone={p.status === "PUBLISHED" ? "ok" : "warn"}>{p.status}</Pill></> : <strong>+ New journal post</strong>}</summary>
              <form action={saveJournal} className="mt-3 grid gap-3 md:grid-cols-3">
                {p && <input type="hidden" name="id" value={p.id} />}
                <In label="Title" name="title" defaultValue={p?.title} required /><In label="Slug" name="slug" defaultValue={p?.slug} required /><Sel label="House" name="brandId" defaultValue={p?.brandId ?? ""} options={[["", "The house"], ...brandOpts]} />
                <Area label="Excerpt" name="excerpt" defaultValue={p?.excerpt} rows={2} className="md:col-span-3" /><Area label="Body (markdown)" name="body" defaultValue={p?.body} rows={10} className="md:col-span-3" />
                <Sel label="Status" name="status" defaultValue={p?.status ?? "DRAFT"} options={["PUBLISHED", "DRAFT"]} /><In label="Publish date" name="publishedAt" type="date" defaultValue={d(p?.publishedAt ?? null)} />
                <div className="flex items-end"><Btn>{p ? "Save post" : "Create post"}</Btn></div>
              </form>
            </details>
          ))}
        </div>
      </Section>
      <Section title="Campaign landing pages">
        <div className="grid gap-2">
          {[...campaigns, null].map((c) => (
            <details key={c?.id ?? "new"} className="card p-4">
              <summary className="cursor-pointer">{c ? <><strong>{c.title}</strong> · /{c.brand.slug}/campaign/{c.slug} <Pill tone={c.status === "PUBLISHED" ? "ok" : "warn"}>{c.status}</Pill></> : <strong>+ New campaign</strong>}</summary>
              <form action={saveCampaign} className="mt-3 grid gap-3 md:grid-cols-3">
                {c && <input type="hidden" name="id" value={c.id} />}
                <Sel label="House" name="brandId" defaultValue={c?.brandId} options={brandOpts} /><In label="Title" name="title" defaultValue={c?.title} required /><In label="Slug" name="slug" defaultValue={c?.slug} required />
                <In label="Eyebrow" name="eyebrow" defaultValue={c?.eyebrow} /><In label="Starts" name="startsAt" type="date" defaultValue={d(c?.startsAt ?? null)} /><In label="Ends" name="endsAt" type="date" defaultValue={d(c?.endsAt ?? null)} />
                <Area label="Body" name="body" defaultValue={c?.body} rows={3} className="md:col-span-3" /><In label="Featured product slugs (comma-separated)" name="productSlugs" defaultValue={c?.productSkus} className="md:col-span-2" /><Sel label="Status" name="status" defaultValue={c?.status ?? "DRAFT"} options={["PUBLISHED", "DRAFT"]} />
                {c?.source && <p className="text-xs text-muted md:col-span-3">Source: {c.source}</p>}
                <div><Btn>{c ? "Save campaign" : "Create campaign"}</Btn></div>
              </form>
            </details>
          ))}
        </div>
      </Section>
    </>
  );
}
