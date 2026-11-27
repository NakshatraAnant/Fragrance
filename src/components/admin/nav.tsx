"use client";
import Link from "next/link";
import { usePathname } from "next/navigation";

export function AdminNav({ items }: { items: { label: string; href: string; group: string }[] }) {
  const path = usePathname();
  const groups = [...new Set(items.map((i) => i.group))];
  return (
    <nav aria-label="Admin" className="mt-6 grid gap-4 overflow-y-auto">
      {groups.map((g) => (
        <div key={g}>
          <p className="px-2 text-[11px] font-semibold uppercase tracking-wider text-muted">{g}</p>
          <ul className="mt-1 grid">
            {items.filter((i) => i.group === g).map((i) => {
              const active = i.href === "/admin" ? path === "/admin" : path.startsWith(i.href);
              return <li key={i.href}><Link href={i.href} aria-current={active ? "page" : undefined} className={`block rounded-md px-2 py-1.5 text-sm ${active ? "bg-ink text-bg" : "hover:bg-surface-2"}`}>{i.label}</Link></li>;
            })}
          </ul>
        </div>
      ))}
    </nav>
  );
}
