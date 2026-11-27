import type { Metadata } from "next";
import Link from "next/link";
import { journalPosts } from "@/lib/content";
import { PageHeader } from "@/components/listing/listing";
import { formatDate } from "@/lib/money";

export const metadata: Metadata = { title: "The Scent Journal", description: "Stories behind our scents: petrichor, mogra, attar and how a brief becomes a perfume.", alternates: { canonical: "/journal" } };

const GRADS = ["linear-gradient(135deg,#b5725a,#e6d6b0)", "linear-gradient(135deg,#e6d6b0,#8fa889)", "linear-gradient(135deg,#3b2a20,#c9a24a)", "linear-gradient(135deg,#2b3550,#c8a55a)"];

export default async function JournalIndex() {
  const posts = await journalPosts(50);
  const [lead, ...rest] = posts;
  return (
    <>
      <PageHeader eyebrow="Editorial" title="The Scent Journal" intro="Notes from the house: ingredients, places and the stories behind each brief." crumbs={[{ name: "Journal", href: "/journal" }]} />
      {lead && (
        <Link href={`/journal/${lead.slug}`} className="container-x group grid gap-8 pb-16 md:grid-cols-2 md:items-center">
          <div className="reveal-img aspect-[4/3] rounded-[var(--radius)]" style={{ background: GRADS[0] }} />
          <div><p className="eyebrow">{lead.brand?.name ?? "The house"} · {formatDate(lead.publishedAt)}</p><h2 className="display mt-3 text-5xl group-hover:text-accent">{lead.title}</h2><p className="lede mt-4">{lead.excerpt}</p></div>
        </Link>
      )}
      <section className="container-x grid gap-10 pb-16 md:grid-cols-3">
        {rest.map((p, i) => (
          <Link key={p.slug} href={`/journal/${p.slug}`} className="group reveal">
            <div className="aspect-[3/2] rounded-[var(--radius)]" style={{ background: GRADS[(i + 1) % GRADS.length] }} />
            <p className="eyebrow mt-4">{p.brand?.name ?? "The house"} · {formatDate(p.publishedAt)}</p>
            <h2 className="display mt-2 text-2xl group-hover:text-accent">{p.title}</h2><p className="mt-2 text-muted">{p.excerpt}</p>
          </Link>
        ))}
      </section>
    </>
  );
}
