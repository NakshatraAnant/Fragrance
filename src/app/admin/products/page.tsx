import Link from "next/link";
import { db } from "@/lib/db";
import { requireStaff } from "@/lib/auth";
import { availabilityFor } from "@/lib/inventory";
import { formatINR } from "@/lib/money";
import { AdminHeader, Flash, Pill, Table, statusTone } from "@/components/admin/ui";

export default async function AdminProducts({ searchParams }: { searchParams: Promise<{ q?: string; brand?: string; status?: string; msg?: string; err?: string }> }) {
  await requireStaff("catalog:write", "/admin/products");
  const sp = await searchParams;
  const products = await db.product.findMany({
    where: { ...(sp.brand ? { brand: { slug: sp.brand } } : {}), ...(sp.status ? { status: sp.status } : {}), ...(sp.q ? { OR: [{ name: { contains: sp.q } }, { slug: { contains: sp.q } }, { variants: { some: { sku: { contains: sp.q.toUpperCase() } } } }] } : {}) },
    include: { brand: true, variants: true, media: { where: { isApproved: true } }, _count: { select: { reviews: true } } },
    orderBy: [{ brand: { sortOrder: "asc" } }, { merchRank: "asc" }],
  });
  const avail = await availabilityFor(products.flatMap((p) => p.variants.map((v) => v.id)));
  const gaps = (p: (typeof products)[number]) => [
    p.nameStatus !== "LEGALLY_CLEARED" && "working name",
    p.variants.some((v) => v.priceStatus !== "APPROVED") && "price proposed",
    p.variants.some((v) => v.concentrationPct && v.concentrationStatus !== "VERIFIED") && "concentration proposed",
    !p.ingredientsDeclaration && "INCI pending",
    p.media.length === 0 && "no approved photography",
  ].filter(Boolean) as string[];
  return (
    <>
      <AdminHeader title="Products" sub={`${products.length} products · ${products.reduce((n, p) => n + p.variants.length, 0)} SKUs. Data gaps from the blueprint are flagged until a person approves them.`}>
        <Link href="/admin/products/new" className="btn btn-primary btn-sm">New product</Link>
      </AdminHeader>
      <Flash msg={sp.msg} err={sp.err} />
      <form className="mb-4 flex flex-wrap gap-2">
        <input name="q" defaultValue={sp.q} placeholder="Search name, slug or SKU" className="input !min-h-9 max-w-xs !py-1 text-sm" />
        <select name="brand" defaultValue={sp.brand ?? ""} className="select !min-h-9 w-auto !py-1 text-sm"><option value="">All brands</option><option value="dhun">Dhun</option><option value="vasana">Vasana</option><option value="anvaya">Anvaya</option></select>
        <select name="status" defaultValue={sp.status ?? ""} className="select !min-h-9 w-auto !py-1 text-sm"><option value="">Any status</option><option>ACTIVE</option><option>DRAFT</option><option>ARCHIVED</option></select>
        <button className="btn btn-outline btn-sm">Filter</button>
      </form>
      <Table head={["Product", "Brand", "SKUs", "Price", "Available", "Status", "Data gaps"]}>
        {products.map((p) => (
          <tr key={p.id}>
            <td className="px-3 py-2"><Link href={`/admin/products/${p.id}`} className="font-semibold underline-offset-2 hover:underline">{p.name}</Link><p className="text-xs text-muted">{p.subtitle} · /{p.slug}</p></td>
            <td className="px-3 py-2 capitalize">{p.brand.slug}</td>
            <td className="px-3 py-2 font-mono text-xs">{p.variants.map((v) => v.sku).join(", ")}</td>
            <td className="px-3 py-2">{p.variants.map((v) => formatINR(v.pricePaise)).join(" / ")}</td>
            <td className="px-3 py-2">{p.variants.map((v) => avail[v.id] ?? 0).join(" / ")}</td>
            <td className="px-3 py-2"><Pill tone={statusTone(p.status)}>{p.status}</Pill></td>
            <td className="px-3 py-2 text-xs text-muted">{gaps(p).join(" · ")}</td>
          </tr>
        ))}
      </Table>
    </>
  );
}
