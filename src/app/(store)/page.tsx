import { db } from "@/lib/db";
import { bestsellerCards, getAllCards } from "@/lib/catalog";
import { activeHomepageSections, approvedReviews, getFamiliesWithCounts, journalPosts, layeringPairs } from "@/lib/content";
import { getSetting } from "@/lib/settings";
import { Hero, Proposition, FinderCta, Carousel, BrandWorlds, DiscoveryBand, StoryBand, FamiliesSection, GiftingBand, ReviewsSection, LayeringBand, JournalSection, LoyaltyBand, NewsletterBand } from "@/components/home/sections";
import { JsonLd } from "@/components/seo/json-ld";
import { env } from "@/lib/env";

export default async function HomePage() {
  const [sections, cards, brands, families, reviews, pairs, posts, best, credit] = await Promise.all([
    activeHomepageSections(), getAllCards(), db.brand.findMany({ orderBy: { sortOrder: "asc" } }), getFamiliesWithCounts(),
    approvedReviews(), layeringPairs(), journalPosts(3), bestsellerCards(8), getSetting("discoveryCredit"),
  ]);
  const carousel = (cfg: Record<string, unknown>) => {
    const limit = Number(cfg.limit ?? 8);
    switch (cfg.source) {
      case "featured": return cards.filter((c) => c.isFeatured && c.brand.slug === "vasana").slice(0, limit);
      case "new": return cards.filter((c) => c.isNew).slice(0, limit);
      case "category": return cards.filter((c) => c.category === cfg.slug).slice(0, limit);
      case "slugs": return cards.filter((c) => (cfg.slugs as string[] | undefined)?.includes(c.slug)).slice(0, limit);
      case "bestsellers": return best.cards;
      default: return cards.slice(0, limit);
    }
  };
  return (
    <>
      <JsonLd data={{ "@context": "https://schema.org", "@type": "Organization", name: "Vasana House", url: env.appUrl(), brand: brands.map((b) => ({ "@type": "Brand", name: b.name })) }} />
      {sections.map((s) => {
        switch (s.type) {
          case "HERO": return <Hero key={s.key} s={s} />;
          case "PROPOSITION": return <Proposition key={s.key} s={s} brands={brands} />;
          case "FINDER": return <FinderCta key={s.key} s={s} />;
          case "FAMILIES": return <FamiliesSection key={s.key} s={s} families={families.filter((f) => f.count > 0)} />;
          case "PRODUCT_CAROUSEL": return <Carousel key={s.key} s={s} products={carousel(s.config)} note={s.config.source === "bestsellers" && best.basis === "CURATED" ? "Not enough confirmed orders yet to rank by sales, so this shows the house's curated selection." : undefined} />;
          case "BRAND_WORLDS": return <BrandWorlds key={s.key} s={s} brands={brands} />;
          case "DISCOVERY": return <DiscoveryBand key={s.key} s={s} sets={cards.filter((c) => c.isDiscoverySet)} creditDays={credit.validityDays} />;
          case "STORY": return <StoryBand key={s.key} s={s} />;
          case "CRAFT": return <StoryBand key={s.key} s={s} tone="craft" />;
          case "GIFTING": return <GiftingBand key={s.key} s={s} />;
          case "REVIEWS": return <ReviewsSection key={s.key} s={s} reviews={reviews} />;
          case "LAYERING": return pairs.length ? <LayeringBand key={s.key} s={s} pairs={pairs} /> : null;
          case "JOURNAL": return <JournalSection key={s.key} s={s} posts={posts} />;
          case "LOYALTY": return <LoyaltyBand key={s.key} s={s} />;
          case "NEWSLETTER": return <NewsletterBand key={s.key} s={s} />;
          default: return null;
        }
      })}
    </>
  );
}
