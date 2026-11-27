import type { Metadata } from "next";
import Link from "next/link";
import { B2B_SERVICES } from "@/lib/b2b";

export const metadata: Metadata = {
  title: { default: "Odaya Fragrance Works — B2B fragrance manufacturing & development", template: "%s · Odaya Fragrance Works" },
  description: "Private label, fragrance development, contract manufacturing and filling, commercial scenting, and corporate and wedding gifting from India.",
};

export default function OdayaLayout({ children }: { children: React.ReactNode }) {
  return (
    <div data-theme="odaya" className="min-h-screen">
      <header className="sticky top-0 z-40 border-b border-line bg-surface/95 backdrop-blur">
        <div className="container-x flex h-16 items-center gap-6">
          <Link href="/odaya" className="flex items-center gap-2 font-semibold tracking-tight">
            <span aria-hidden className="grid h-7 w-7 place-items-center rounded bg-ink font-mono text-xs text-bg">OD</span>
            <span>Odaya <span className="font-normal text-muted">Fragrance Works</span></span>
          </Link>
          <nav aria-label="Odaya" className="ml-4 hidden items-center gap-5 text-sm lg:flex">
            <Link href="/odaya/capabilities" className="hover:text-accent">Capabilities</Link>
            <Link href="/odaya/private-label" className="hover:text-accent">Private label</Link>
            <Link href="/odaya/fragrance-development" className="hover:text-accent">Development</Link>
            <Link href="/odaya/commercial-scenting" className="hover:text-accent">Scenting</Link>
            <Link href="/odaya/corporate-gifting" className="hover:text-accent">Gifting</Link>
            <Link href="/odaya/quality" className="hover:text-accent">Quality</Link>
          </nav>
          <div className="ml-auto flex items-center gap-2">
            <Link href="/odaya/sample" className="btn btn-ghost btn-sm hidden sm:inline-flex">Request a sample</Link>
            <Link href="/odaya/quote" className="btn btn-accent btn-sm">Request a quote</Link>
          </div>
        </div>
      </header>
      <main id="main">{children}</main>
      <footer className="mt-24 border-t border-line bg-surface">
        <div className="container-x grid gap-10 py-14 md:grid-cols-4">
          <div><p className="font-semibold">Odaya Fragrance Works</p><p className="mt-2 text-sm text-muted">Fragrance development, manufacturing and scenting for businesses.</p></div>
          <nav aria-label="Services" className="grid gap-2 text-sm">{B2B_SERVICES.slice(0, 4).map((s) => <Link key={s.slug} href={`/odaya/${s.slug}`} className="text-muted hover:text-ink">{s.name}</Link>)}</nav>
          <nav aria-label="More services" className="grid gap-2 text-sm">{B2B_SERVICES.slice(4).map((s) => <Link key={s.slug} href={`/odaya/${s.slug}`} className="text-muted hover:text-ink">{s.name}</Link>)}</nav>
          <nav aria-label="Contact" className="grid gap-2 text-sm"><Link href="/odaya/enquiry" className="text-muted hover:text-ink">Business enquiry</Link><Link href="/odaya/sample" className="text-muted hover:text-ink">Sample request</Link><Link href="/odaya/quote" className="text-muted hover:text-ink">Request for quote</Link><Link href="/odaya/contact" className="text-muted hover:text-ink">Contact</Link></nav>
        </div>
        <p className="container-x border-t border-line py-5 font-mono text-xs text-muted">© {new Date().getFullYear()} Odaya Fragrance Works · Commercial terms are indicative until confirmed in a written quotation.</p>
      </footer>
    </div>
  );
}
