import Link from "next/link";
import { notFound } from "next/navigation";
import { db } from "@/lib/db";
import { requireStaff } from "@/lib/auth";
import { availabilityFor } from "@/lib/inventory";
import { archiveProduct, mediaAction, saveVariant, updateProduct, uploadMedia } from "@/app/actions/admin/catalog";
import { AdminHeader, Btn, Flash, In, Pill, Section, Sel, Table, statusTone } from "@/components/admin/ui";
import { ProductFields } from "@/components/admin/product-form";
import { formatDate } from "@/lib/money";

const SLOTS = ["MAIN", "SECONDARY", "DETAIL", "PACKAGING", "LIFESTYLE", "CAMPAIGN", "VIDEO", "MOBILE", "DESKTOP"];

export default async function EditProduct({ params, searchParams }: { params: Promise<{ id: string }>; searchParams: Promise<{ msg?: string; err?: string }> }) {
  await requireStaff("catalog:write", "/admin/products");
  const { id } = await params;
  const sp = await searchParams;
  const p = await db.product.findUnique({ where: { id }, include: { variants: { orderBy: { sortOrder: "asc" } }, media: { orderBy: [{ slot: "asc" }, { sortOrder: "asc" }] }, families: { include: { family: true } }, brand: true } });
  if (!p) notFound();
  const [brands, categories, collections, concepts, families, avail, history] = await Promise.all([
    db.brand.findMany({ orderBy: { sortOrder: "asc" } }), db.category.findMany({ orderBy: { sortOrder: "asc" } }), db.collection.findMany({ include: { brand: true } }),
    db.scentConcept.findMany({ orderBy: { code: "asc" } }), db.fragranceFamily.findMany({ orderBy: { sortOrder: "asc" } }), availabilityFor(p.variants.map((v) => v.id)),
    db.auditLog.findMany({ where: { OR: [{ entityId: id }, { entityId: { in: p.variants.map((v) => v.id) } }] }, orderBy: { createdAt: "desc" }, take: 15, include: { actor: { select: { email: true } } } }),
  ]);
  const famWeights = Object.fromEntries(p.families.map((f) => [f.family.slug, f.weight]));
  return (
    <>
      <AdminHeader title={`${p.name} · ${p.subtitle}`} sub={`${p.brand.name} · /product/${p.slug}`}>
        <Link href={`/product/${p.slug}`} className="btn btn-outline btn-sm" target="_blank">View on storefront</Link>
        <form action={archiveProduct}><input type="hidden" name="id" value={p.id} />{p.status === "ARCHIVED" ? <><input type="hidden" name="restore" value="1" /><Btn tone="outline">Restore</Btn></> : <Btn tone="danger">Archive</Btn>}</form>
      </AdminHeader>
      <Flash msg={sp.msg} err={sp.err} />
      <form action={updateProduct} className="grid gap-6" data-testid="product-form">
        <ProductFields p={p} brands={brands} categories={categories} collections={collections.map((c) => ({ id: c.id, name: c.name, brand: c.brand.name }))} concepts={concepts} families={families} famWeights={famWeights} />
        <div className="sticky bottom-0 z-10 -mx-4 border-t border-line bg-bg/95 p-3 backdrop-blur md:-mx-8 md:px-8"><button className="btn btn-primary" data-testid="save-product">Save product</button></div>
      </form>

      <Section title="Variants (SKUs)">
        <p className="mb-3 text-xs text-muted">MRP is the everyday price and includes tax. The selling price may sit below MRP only within the {p.brand.name} discount ceiling of {p.brand.discountCeilingPct}%. The blueprint's expected realised price is planning data only and is never shown to customers.</p>
        <div className="grid gap-3">
          {[...p.variants, null].map((v, i) => (
            <form key={v?.id ?? "new"} action={saveVariant} className="card grid grid-cols-2 items-end gap-3 p-4 md:grid-cols-6 xl:grid-cols-12" data-testid={v ? `variant-form-${v.sku}` : "variant-form-new"}>
              <input type="hidden" name="productId" value={p.id} />{v && <input type="hidden" name="id" value={v.id} />}
              <In label="SKU" name="sku" defaultValue={v?.sku} readOnly={!!v} required />
              <In label="Label" name="label" defaultValue={v?.label} required />
              <In label="Net qty" name="netQuantity" type="number" step="0.1" defaultValue={v?.netQuantity ?? ""} required />
              <Sel label="Unit" name="netUnit" defaultValue={v?.netUnit ?? "ml"} options={["ml", "g"]} />
              <In label="MRP ₹" name="mrp" type="number" step="1" defaultValue={v ? v.mrpPaise / 100 : ""} required />
              <In label="Price ₹" name="price" type="number" step="1" defaultValue={v ? v.pricePaise / 100 : ""} required />
              <In label="Conc. %" name="concentrationPct" type="number" step="0.1" defaultValue={v?.concentrationPct ?? ""} />
              <Sel label="Conc. status" name="concentrationStatus" defaultValue={v?.concentrationStatus ?? "PROPOSED"} options={["PROPOSED", "VERIFIED"]} />
              <Sel label="Price status" name="priceStatus" defaultValue={v?.priceStatus ?? "PROPOSED"} options={["PROPOSED", "APPROVED"]} />
              <In label="GST %" name="gstRatePct" type="number" step="0.5" defaultValue={v?.gstRatePct ?? 18} />
              <In label="HSN" name="hsnCode" defaultValue={v?.hsnCode} />
              <Sel label="Status" name="status" defaultValue={v?.status ?? "ACTIVE"} options={["ACTIVE", "INACTIVE"]} />
              <input type="hidden" name="sortOrder" value={v?.sortOrder ?? i} />
              <input type="hidden" name="barcode" value={v?.barcode ?? ""} />
              <div className="col-span-2 flex items-center gap-3 md:col-span-6 xl:col-span-12">
                <Btn tone={v ? "outline" : "primary"}>{v ? "Save variant" : "Add variant"}</Btn>
                {v && <span className="text-xs text-muted">Available: {avail[v.id] ?? 0} · Source: “{v.sourceName ?? "—"}”{v.expectedRealisedPricePaise ? ` · Blueprint expected realised ₹${v.expectedRealisedPricePaise / 100} (planning only)` : ""}</span>}
              </div>
            </form>
          ))}
        </div>
      </Section>

      <Section title="Photography & media">
        <p className="mb-3 text-xs text-muted">Only approved final photography is shown to customers. Until then the storefront shows a labelled illustration. Never upload AI-generated concept bottles as product photography.</p>
        <div className="mb-4 grid grid-cols-2 gap-3 md:grid-cols-6">
          {p.media.map((m) => (
            <div key={m.id} className="card overflow-hidden text-xs">
              {m.mimeType?.startsWith("video") ? <video src={m.url} className="aspect-square w-full object-cover" /> : <img src={m.url} alt={m.alt} className="aspect-square w-full object-cover" />}
              <div className="p-2"><p className="font-semibold">{m.slot}</p><Pill tone={m.isApproved ? "ok" : "warn"}>{m.isApproved ? "Approved" : "Pending"}</Pill>
                <form action={mediaAction} className="mt-2 flex gap-2"><input type="hidden" name="productId" value={p.id} /><input type="hidden" name="mediaId" value={m.id} /><button name="op" value={m.isApproved ? "unapprove" : "approve"} className="underline">{m.isApproved ? "Hide" : "Approve"}</button><button name="op" value="delete" className="text-danger underline">Delete</button></form>
              </div>
            </div>
          ))}
          {p.media.length === 0 && <p className="col-span-full text-sm text-muted">No media yet. Each slot can hold final photography: {SLOTS.join(", ").toLowerCase()}.</p>}
        </div>
        <form action={uploadMedia} className="card grid items-end gap-3 p-4 md:grid-cols-5">
          <input type="hidden" name="productId" value={p.id} />
          <Sel label="Slot" name="slot" options={SLOTS} />
          <In label="Alt text" name="alt" required />
          <In label="Order" name="sortOrder" type="number" defaultValue={0} />
          <label className="field"><span className="label">File (JPG/PNG/WebP/AVIF ≤ 8 MB, MP4/WebM ≤ 40 MB)</span><input type="file" name="file" required className="text-sm" /></label>
          <Btn>Upload</Btn>
        </form>
      </Section>

      <Section title="Change history">
        <Table head={["When", "Who", "Action", "Changes"]} empty="No changes recorded.">
          {history.map((h) => <tr key={h.id}><td className="px-3 py-2 text-xs">{formatDate(h.createdAt, true)}</td><td className="px-3 py-2 text-xs">{h.actor?.email ?? "system"}</td><td className="px-3 py-2"><Pill tone={statusTone(h.action.toUpperCase())}>{h.action}</Pill></td><td className="max-w-md truncate px-3 py-2 font-mono text-xs">{h.diff}</td></tr>)}
        </Table>
      </Section>
    </>
  );
}
