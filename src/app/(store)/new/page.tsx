import type { Metadata } from "next";
import { Listing, PageHeader } from "@/components/listing/listing";

export const metadata: Metadata = { title: "New arrivals", alternates: { canonical: "/new" } };

export default async function NewPage({ searchParams }: { searchParams: Promise<Record<string, string | string[] | undefined>> }) {
  const sp = await searchParams;
  return (
    <>
      <PageHeader eyebrow="Just in" title="New arrivals" intro="The launch collection. Products flagged as new by our merchandising team appear here." crumbs={[{ name: "New arrivals", href: "/new" }]} />
      <div className="container-x"><Listing searchParams={{ sort: "new", ...sp }} basePath="/new" /></div>
    </>
  );
}
