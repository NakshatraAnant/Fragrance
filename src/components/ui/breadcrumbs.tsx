import Link from "next/link";
import { JsonLd, breadcrumbLd } from "@/components/seo/json-ld";
import { env } from "@/lib/env";

export function Breadcrumbs({ items }: { items: { name: string; href: string }[] }) {
  const all = [{ name: "Home", href: "/" }, ...items];
  return (
    <nav aria-label="Breadcrumb" className="text-xs text-muted">
      <JsonLd data={breadcrumbLd(all.map((i) => ({ name: i.name, url: `${env.appUrl()}${i.href}` })))} />
      <ol className="flex flex-wrap items-center gap-1.5">
        {all.map((i, idx) => (
          <li key={i.href + idx} className="flex items-center gap-1.5">
            {idx > 0 && <span aria-hidden>/</span>}
            {idx === all.length - 1 ? <span aria-current="page">{i.name}</span> : <Link href={i.href} className="hover:text-ink">{i.name}</Link>}
          </li>
        ))}
      </ol>
    </nav>
  );
}
