import { db } from "@/lib/db";
import { requireStaff } from "@/lib/auth";
import { getSetting } from "@/lib/settings";
import { bundleAction, layeringAction, relatedAction, saveRanking } from "@/app/actions/admin/growth";
import { AdminHeader, Area, Btn, Flash, In, Pill, Section, Sel, Table } from "@/components/admin/ui";
import { SettingEditor } from "@/components/admin/setting-editor";

export default async function Merchandising({ searchParams }: { searchParams: Promise<{ brand?: string; msg?: string; err?: string }> }) {
  await requireStaff("merch:write", "/admin/merchandising");
  const sp = await searchParams;
  const brand = sp.brand ?? "vasana";
  const [products, all, related, pairs, bundles, weights] = await Promise.all([
    db.product.findMany({ where: { brand: { slug: brand }, deletedAt: null }, orderBy: { merchRank: "asc" } }),
    db.product.findMany({ where: { deletedAt: null }, orderBy: [{ brand: { sortOrder: "asc" } }, { name: "asc" }], select: { id: true, name: true, subtitle: true } }),
    db.relatedProduct.findMany({ include: { from: true, to: true }, orderBy: { fromId: "asc" } }),
    db.layeringPair.findMany({ include: { productA: true, productB: true } }),
    db.bundle.findMany({ include: { items: { include: { product: true } } } }),
    getSetting("finderWeights"),
  ]);
  const opts = all.map((p) => [p.id, `${p.name} · ${p.subtitle}`] as [string, string]);
  return (
    <>
      <AdminHeader title="Merchandising studio" sub="Ranking, featured placements, cross-sell, curated layering, bundles and recommendation weights." />
      <Flash msg={sp.msg} err={sp.err} />
      <Section title="Product ranking & flags" aside={<div className="flex gap-1">{["dhun", "vasana", "anvaya"].map((b) => <a key={b} href={`/admin/merchandising?brand=${b}`} className={`btn btn-sm ${b === brand ? "btn-primary" : "btn-outline"}`}>{b}</a>)}</div>}>
        <form action={saveRanking}>
          <Table head={["Rank", "Product", "Featured", "New"]}>
            {products.map((p) => <tr key={p.id}><td className="px-3 py-1"><input type="hidden" name="id" value={p.id} /><input name={`rank_${p.id}`} type="number" defaultValue={p.merchRank} className="w-20 rounded border border-line bg-surface px-2 py-1 text-sm" aria-label={`Rank for ${p.name}`} /></td><td className="px-3 py-1">{p.name} <span className="text-xs text-muted">{p.subtitle}</span></td><td className="px-3 py-1"><input type="checkbox" name={`featured_${p.id}`} defaultChecked={p.isFeatured} aria-label="Featured" /></td><td className="px-3 py-1"><input type="checkbox" name={`new_${p.id}`} defaultChecked={p.isNew} aria-label="New" /></td></tr>)}
          </Table>
          <div className="mt-2"><Btn>Save ranking</Btn></div>
        </form>
      </Section>
      <Section title="Cross-sell, upsell & related products">
        <form action={relatedAction} className="card mb-3 grid items-end gap-3 p-4 md:grid-cols-5"><Sel label="From" name="fromId" options={opts} /><Sel label="Show" name="toId" options={opts} /><Sel label="Type" name="kind" options={["CROSS_SELL", "UPSELL", "SIMILAR", "FREQUENTLY_BOUGHT"]} /><In label="Rationale" name="rationale" /><Btn>Add relation</Btn></form>
        <Table head={["From", "Type", "To", "Rationale", ""]} empty="No manual relations. The storefront derives same-scent and similar products from catalogue data, and frequently-bought-together from real orders.">
          {related.map((r) => <tr key={r.id}><td className="px-3 py-2">{r.from.name}</td><td className="px-3 py-2"><Pill>{r.kind}</Pill></td><td className="px-3 py-2">{r.to.name}</td><td className="px-3 py-2 text-xs">{r.rationale}</td><td className="px-3 py-2"><form action={relatedAction}><input type="hidden" name="op" value="delete" /><input type="hidden" name="id" value={r.id} /><button className="text-xs text-danger underline">Remove</button></form></td></tr>)}
        </Table>
      </Section>
      <Section title="Curated layering pairs">
        <Table head={["Pairing", "Source", "Status", ""]}>{pairs.map((p) => <tr key={p.id}><td className="px-3 py-2">{p.title}<p className="text-xs text-muted">{p.productA.name} + {p.productB.name}</p></td><td className="px-3 py-2 text-xs">{p.source}</td><td className="px-3 py-2"><Pill tone={p.isActive ? "ok" : "warn"}>{p.isActive ? "Live" : "Hidden"}</Pill></td><td className="px-3 py-2"><form action={layeringAction}><input type="hidden" name="op" value="toggle" /><input type="hidden" name="id" value={p.id} /><button className="text-xs underline">{p.isActive ? "Hide" : "Publish"}</button></form></td></tr>)}</Table>
        <form action={layeringAction} className="card mt-3 grid gap-3 p-4 md:grid-cols-2"><input type="hidden" name="op" value="create" /><Sel label="Product A (apply first)" name="productAId" options={opts} /><Sel label="Product B" name="productBId" options={opts} /><In label="Title" name="title" required /><In label="Source / approval (e.g. perfumer sign-off ref)" name="source" required /><Area label="Rationale" name="rationale" /><Area label="How to wear (sequence)" name="sequence" /><div><Btn>Add curated pairing</Btn></div></form>
      </Section>
      <Section title="Bundles">
        <Table head={["Bundle", "Items", "Status", ""]}>{bundles.map((b) => <tr key={b.id}><td className="px-3 py-2">{b.name}<p className="text-xs text-muted">{b.source}</p></td><td className="px-3 py-2 text-xs">{b.items.map((i) => i.product.name + " " + i.product.subtitle).join(" + ")}</td><td className="px-3 py-2"><Pill tone={b.isActive ? "ok" : "warn"}>{b.isActive ? "Active" : "Paused"}</Pill></td><td className="px-3 py-2"><form action={bundleAction}><input type="hidden" name="op" value="toggle" /><input type="hidden" name="id" value={b.id} /><button className="text-xs underline">{b.isActive ? "Pause" : "Activate"}</button></form></td></tr>)}</Table>
        <form action={bundleAction} className="card mt-3 grid items-end gap-3 p-4 md:grid-cols-3"><input type="hidden" name="op" value="create" /><In label="Name" name="name" required /><In label="Slug" name="slug" required /><In label="Description" name="description" /><Sel label="Product 1" name="productIds" options={opts} /><Sel label="Product 2" name="productIds" options={opts} /><Sel label="Product 3 (optional)" name="productIds" options={[["", "—"], ...opts]} /><div><Btn>Create bundle</Btn></div></form>
      </Section>
      <Section title="Scent Finder weights (rules engine)"><SettingEditor k="finderWeights" value={weights} back="/admin/merchandising" note="Relative weight of each dimension in the transparent rules-based match score." rows={9} /></Section>
    </>
  );
}
