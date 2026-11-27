import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";
import { getCurrentUser } from "@/lib/auth";
import { can } from "@/lib/auth-core";
import { logout } from "@/app/actions/auth";
import type { Permission } from "@/lib/permissions";
import { AdminNav } from "@/components/admin/nav";

export const metadata: Metadata = { title: { default: "Admin", template: "%s · Admin" }, robots: { index: false, follow: false } };
export const dynamic = "force-dynamic";

const NAV: { label: string; href: string; perm: Permission; group: string }[] = [
  { label: "Dashboard", href: "/admin", perm: "dashboard:read", group: "Overview" },
  { label: "Analytics", href: "/admin/analytics", perm: "analytics:read", group: "Overview" },
  { label: "Products", href: "/admin/products", perm: "catalog:write", group: "Catalogue" },
  { label: "Inventory & batches", href: "/admin/inventory", perm: "inventory:write", group: "Catalogue" },
  { label: "Merchandising", href: "/admin/merchandising", perm: "merch:write", group: "Catalogue" },
  { label: "Orders", href: "/admin/orders", perm: "orders:read", group: "Commerce" },
  { label: "Customers", href: "/admin/customers", perm: "customers:read", group: "Commerce" },
  { label: "Reviews & Q&A", href: "/admin/reviews", perm: "reviews:write", group: "Commerce" },
  { label: "Support & appointments", href: "/admin/support", perm: "support:write", group: "Commerce" },
  { label: "Marketing & rules", href: "/admin/marketing", perm: "marketing:write", group: "Growth" },
  { label: "Homepage & banners", href: "/admin/cms", perm: "cms:write", group: "Content" },
  { label: "Pages, journal & campaigns", href: "/admin/content", perm: "cms:write", group: "Content" },
  { label: "B2B pipeline", href: "/admin/b2b", perm: "b2b:read", group: "Odaya" },
  { label: "System", href: "/admin/system", perm: "system:write", group: "System" },
];

export default async function AdminLayout({ children }: { children: React.ReactNode }) {
  const user = await getCurrentUser();
  if (!user) redirect("/account/login?next=/admin");
  if (!user.role) redirect("/account");
  const items = NAV.filter((n) => can(user, n.perm));
  return (
    <div data-theme="admin" className="min-h-screen text-[15px]">
      <div className="flex min-h-screen">
        <aside className="hidden w-60 shrink-0 border-r border-line bg-surface lg:block">
          <div className="sticky top-0 flex h-screen flex-col p-4">
            <Link href="/admin" className="text-lg font-bold">Vasana House <span className="text-xs font-semibold text-muted">Control Centre</span></Link>
            <AdminNav items={items} />
            <div className="mt-auto border-t border-line pt-3 text-xs text-muted">
              <p className="font-semibold text-ink">{user.name ?? user.email}</p><p>{user.role.name}</p>
              <div className="mt-2 flex gap-3"><Link href="/" className="underline">Storefront</Link><Link href="/odaya" className="underline">Odaya</Link><form action={logout}><button className="underline">Sign out</button></form></div>
            </div>
          </div>
        </aside>
        <div className="min-w-0 flex-1">
          <div className="border-b border-line bg-surface p-3 lg:hidden">
            <details><summary className="cursor-pointer font-semibold">Menu · {user.role.name}</summary><AdminNav items={items} /></details>
          </div>
          <main id="main" className="mx-auto max-w-[96rem] p-4 md:p-8">{children}</main>
        </div>
      </div>
    </div>
  );
}
