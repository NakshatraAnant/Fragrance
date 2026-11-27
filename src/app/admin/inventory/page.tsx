import { db } from "@/lib/db";
import { requireStaff } from "@/lib/auth";
import { saveBatch, stockAdjust } from "@/app/actions/admin/catalog";
import { AdminHeader, Btn, Flash, In, Pill, Section, Sel, Table, statusTone } from "@/components/admin/ui";
import { formatDate } from "@/lib/money";

export default async function InventoryPage({ searchParams }: { searchParams: Promise<{ q?: string; msg?: string; err?: string }> }) {
  await requireStaff("inventory:write", "/admin/inventory");
  const sp = await searchParams;
  const [warehouses, variants, batches, movements] = await Promise.all([
    db.warehouse.findMany({ orderBy: [{ isTest: "asc" }, { code: "asc" }] }),
    db.variant.findMany({ where: sp.q ? { OR: [{ sku: { contains: sp.q.toUpperCase() } }, { product: { name: { contains: sp.q } } }] } : {}, include: { product: { select: { name: true } }, inventory: true }, orderBy: { sku: "asc" } }),
    db.batch.findMany({ include: { variant: { select: { sku: true } } }, orderBy: { createdAt: "desc" }, take: 50 }),
    db.inventoryMovement.findMany({ orderBy: { createdAt: "desc" }, take: 25, include: { variant: { select: { sku: true } }, warehouse: { select: { code: true } } } }),
  ]);
  return (
    <>
      <AdminHeader title="Inventory & batches" sub="Available = on hand − reserved − safety stock. Reservations hold stock while a payment is pending; they are released when an order expires or is cancelled." />
      <Flash msg={sp.msg} err={sp.err} />
      <form className="mb-4 flex gap-2"><input name="q" defaultValue={sp.q} placeholder="SKU or product" className="input !min-h-9 max-w-xs !py-1 text-sm" /><button className="btn btn-outline btn-sm">Search</button></form>
      <Section title="Stock by warehouse">
        <Table head={["SKU", "Product", ...warehouses.map((w) => `${w.code}${w.isTest ? " (TEST)" : ""}`), "Total available"]}>
          {variants.map((v) => {
            let total = 0;
            return (
              <tr key={v.id}>
                <td className="px-3 py-2 font-mono text-xs">{v.sku}</td><td className="px-3 py-2">{v.product.name} · {v.label}</td>
                {warehouses.map((w) => { const inv = v.inventory.find((i) => i.warehouseId === w.id); const a = inv ? inv.onHand - inv.reserved - inv.safetyStock : 0; total += Math.max(0, a); return <td key={w.id} className="px-3 py-2 text-xs">{inv ? `${inv.onHand} / r${inv.reserved}` : "—"}</td>; })}
                <td className="px-3 py-2"><Pill tone={total === 0 ? "danger" : total <= 5 ? "warn" : "ok"}>{total}</Pill></td>
              </tr>
            );
          })}
        </Table>
        <p className="mt-1 text-xs text-muted">Cells show on hand / r = reserved.</p>
      </Section>
      <Section title="Adjust stock (goods receipt, correction, return)">
        <form action={stockAdjust} className="card grid items-end gap-3 p-4 md:grid-cols-6">
          <Sel label="SKU" name="variantId" options={variants.map((v) => [v.id, `${v.sku} · ${v.product.name} ${v.label}`])} className="md:col-span-2" />
          <Sel label="Warehouse" name="warehouseId" options={warehouses.map((w) => [w.id, `${w.code}${w.isTest ? " (TEST)" : ""}`])} />
          <In label="Quantity (+/−)" name="delta" type="number" required />
          <Sel label="Reason" name="reason" options={["RECEIPT", "ADJUSTMENT", "RETURN"]} />
          <In label="Reference (GRN, note)" name="reference" />
          <div className="md:col-span-6"><Btn>Apply</Btn></div>
        </form>
      </Section>
      <Section title="Batches">
        <form action={saveBatch} className="card mb-3 grid items-end gap-3 p-4 md:grid-cols-6">
          <In label="SKU" name="sku" required /><In label="Batch code" name="batchCode" required /><In label="Manufactured" name="manufacturedAt" type="date" /><In label="Best before" name="bestBefore" type="date" /><In label="IFRA certificate ref" name="ifraCertificate" /><In label="CoA URL" name="coaUrl" />
          <div className="md:col-span-6"><Btn>Record batch (quarantine)</Btn></div>
        </form>
        <Table head={["SKU", "Batch", "Made", "Best before", "IFRA", "Status", ""]} empty="No batches recorded yet. Production batches will appear here.">
          {batches.map((b) => <tr key={b.id}><td className="px-3 py-2 font-mono text-xs">{b.variant.sku}</td><td className="px-3 py-2">{b.batchCode}</td><td className="px-3 py-2 text-xs">{b.manufacturedAt ? formatDate(b.manufacturedAt) : "—"}</td><td className="px-3 py-2 text-xs">{b.bestBefore ? formatDate(b.bestBefore) : "—"}</td><td className="px-3 py-2 text-xs">{b.ifraCertificate ?? "missing"}</td><td className="px-3 py-2"><Pill tone={statusTone(b.status)}>{b.status}</Pill></td>
            <td className="px-3 py-2"><form action={saveBatch} className="flex gap-1"><input type="hidden" name="id" value={b.id} />{b.status !== "RELEASED" && <button name="status" value="RELEASED" className="text-xs underline">Release</button>}{b.status !== "BLOCKED" && <button name="status" value="BLOCKED" className="text-xs text-danger underline">Block</button>}</form></td></tr>)}
        </Table>
      </Section>
      <Section title="Recent movements">
        <Table head={["When", "SKU", "Warehouse", "Δ", "Reason", "Reference"]}>{movements.map((m) => <tr key={m.id}><td className="px-3 py-2 text-xs">{formatDate(m.createdAt, true)}</td><td className="px-3 py-2 font-mono text-xs">{m.variant.sku}</td><td className="px-3 py-2 text-xs">{m.warehouse.code}</td><td className="px-3 py-2">{m.delta > 0 ? `+${m.delta}` : m.delta}</td><td className="px-3 py-2 text-xs">{m.reason}</td><td className="px-3 py-2 text-xs">{m.reference}</td></tr>)}</Table>
      </Section>
    </>
  );
}
