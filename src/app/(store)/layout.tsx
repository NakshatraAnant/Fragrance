import { db } from "@/lib/db";
import { getCurrentUser } from "@/lib/auth";
import { isStaff } from "@/lib/auth-core";
import { CartProvider } from "@/components/cart/cart-provider";
import { CartDrawer } from "@/components/cart/cart-drawer";
import { WishlistProvider } from "@/components/product/wishlist";
import { SiteHeader } from "@/components/layout/site-header";
import { SiteFooter } from "@/components/layout/site-footer";
import { AnnouncementBar, MobileBottomNav, ThemeShell } from "@/components/layout/store-chrome";
import { CompareTray } from "@/components/product/local-lists";

export const dynamic = "force-dynamic";

export default async function StoreLayout({ children }: { children: React.ReactNode }) {
  const now = new Date();
  const [user, announcement] = await Promise.all([
    getCurrentUser(),
    db.banner.findFirst({ where: { placement: "ANNOUNCEMENT", isActive: true, OR: [{ startsAt: null }, { startsAt: { lte: now } }], AND: [{ OR: [{ endsAt: null }, { endsAt: { gte: now } }] }] }, orderBy: { sortOrder: "asc" } }),
  ]);
  return (
    <CartProvider>
      <WishlistProvider>
        <ThemeShell>
          {announcement && <AnnouncementBar text={announcement.title} href={announcement.ctaHref} cta={announcement.ctaLabel} />}
          <SiteHeader signedIn={!!user} isStaff={isStaff(user)} />
          <main id="main">{children}</main>
          <SiteFooter />
          <MobileBottomNav />
          <CompareTray />
          <CartDrawer />
        </ThemeShell>
      </WishlistProvider>
    </CartProvider>
  );
}
