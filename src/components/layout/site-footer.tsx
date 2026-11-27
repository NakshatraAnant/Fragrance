import Link from "next/link";
import { NewsletterForm } from "@/components/forms/newsletter-form";

const COLS = [
  { title: "Shop", links: [["Shop all", "/shop"], ["New arrivals", "/new"], ["Bestsellers", "/bestsellers"], ["Discovery sets", "/discovery"], ["Gifting", "/gifting"], ["Home fragrance", "/shop?category=home-fragrance"]] },
  { title: "The Houses", links: [["Dhun", "/dhun"], ["Vasana", "/vasana"], ["Anvaya", "/anvaya"], ["Odaya Fragrance Works (B2B)", "/odaya"]] },
  { title: "Discover", links: [["Scent Finder", "/scent-finder"], ["Fragrance families", "/families"], ["Layering Studio", "/layering"], ["The Scent Journal", "/journal"], ["Our craft", "/craft"], ["Ingredients & materials", "/ingredients"], ["About the house", "/about"]] },
  { title: "Help", links: [["Customer support", "/support"], ["Track an order", "/track"], ["FAQ", "/faq"], ["Shipping policy", "/shipping"], ["Returns & refunds", "/returns"], ["Store locator", "/stores"], ["Contact", "/contact"]] },
];

export function SiteFooter() {
  return (
    <footer className="mt-24 border-t border-line bg-surface-2/60 pb-24 md:pb-0">
      <div className="container-x grid gap-12 py-16 lg:grid-cols-[1.3fr_2fr]">
        <div className="max-w-sm">
          <p className="display text-3xl">Vasana <span className="italic text-accent">House</span></p>
          <p className="mt-3 text-muted">Original Indian scents, made properly, easy to try.</p>
          <div className="mt-6"><NewsletterForm compact /></div>
        </div>
        <div className="grid grid-cols-2 gap-8 md:grid-cols-4">
          {COLS.map((c) => (
            <nav key={c.title} aria-label={c.title}>
              <p className="eyebrow mb-3">{c.title}</p>
              <ul className="grid gap-2 text-sm">{c.links.map(([l, h]) => <li key={h}><Link href={h} className="hover:text-accent">{l}</Link></li>)}</ul>
            </nav>
          ))}
        </div>
      </div>
      <div className="border-t border-line">
        <div className="container-x flex flex-col gap-3 py-6 text-xs text-muted md:flex-row md:items-center md:justify-between">
          <p>© {new Date().getFullYear()} Vasana House Pvt Ltd (working name). Prices in INR, inclusive of GST.</p>
          <nav aria-label="Legal" className="flex flex-wrap gap-4"><Link href="/privacy">Privacy</Link><Link href="/terms">Terms</Link><Link href="/returns">Returns</Link><Link href="/shipping">Shipping</Link></nav>
        </div>
      </div>
    </footer>
  );
}
