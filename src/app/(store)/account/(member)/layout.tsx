import Link from "next/link";
import { requireUser } from "@/lib/auth";
import { logout } from "@/app/actions/auth";

const NAV = [["Overview", "/account"], ["Fragrance Wardrobe", "/account/wardrobe"], ["Orders", "/account/orders"], ["Addresses", "/account/addresses"], ["Loyalty & credits", "/account/loyalty"], ["My reviews", "/account/reviews"], ["Wishlist", "/wishlist"], ["Preferences & privacy", "/account/preferences"]];

export default async function MemberLayout({ children }: { children: React.ReactNode }) {
  const user = await requireUser();
  return (
    <div className="container-x grid gap-10 py-10 lg:grid-cols-[15rem_1fr]">
      <aside>
        <p className="eyebrow">Your account</p>
        <p className="display mt-2 text-2xl">{user.name ?? user.email}</p>
        <nav aria-label="Account" className="no-scrollbar mt-6 flex gap-2 overflow-x-auto lg:grid lg:gap-1">
          {NAV.map(([l, h]) => <Link key={h} href={h} className="shrink-0 rounded px-3 py-2 text-sm hover:bg-surface-2">{l}</Link>)}
        </nav>
        <form action={logout} className="mt-4"><button className="btn btn-ghost btn-sm">Sign out</button></form>
      </aside>
      <div>{children}</div>
    </div>
  );
}
