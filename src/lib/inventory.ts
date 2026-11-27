import { db, type Tx } from "./db";
import { AppError } from "./logger";

/** Sellable units per variant = onHand − reserved − safetyStock across active warehouses. */
export async function availabilityFor(variantIds: string[]): Promise<Record<string, number>> {
  if (!variantIds.length) return {};
  const rows = await db.inventory.findMany({ where: { variantId: { in: variantIds }, warehouse: { isActive: true } } });
  const out: Record<string, number> = Object.fromEntries(variantIds.map((id) => [id, 0]));
  for (const r of rows) out[r.variantId] += Math.max(0, r.onHand - r.reserved - r.safetyStock);
  return out;
}

export function stockLabel(available: number): { label: string; tone: "ok" | "low" | "none" } {
  if (available <= 0) return { label: "Out of stock", tone: "none" };
  if (available <= 5) return { label: `Only ${available} left`, tone: "low" };
  return { label: "In stock", tone: "ok" };
}

/**
 * Atomically reserve stock using a conditional UPDATE so two concurrent checkouts can never
 * oversell: the row is only updated if enough unreserved stock remains at that instant.
 */
export async function reserveStock(tx: Tx, variantId: string, qty: number, reference: string): Promise<string> {
  const candidates = await tx.inventory.findMany({ where: { variantId, warehouse: { isActive: true } }, orderBy: { onHand: "desc" } });
  for (const inv of candidates) {
    const updated = await tx.$executeRaw`UPDATE "Inventory" SET "reserved" = "reserved" + ${qty} WHERE "id" = ${inv.id} AND ("onHand" - "reserved" - "safetyStock") >= ${qty}`;
    if (updated === 1) {
      await tx.inventoryMovement.create({ data: { variantId, warehouseId: inv.warehouseId, delta: -qty, reason: "RESERVE", reference } });
      return inv.warehouseId;
    }
  }
  throw new AppError("Some items in your bag just sold out. Please review your bag.", "INVENTORY_CONFLICT", 409);
}

export async function releaseStock(tx: Tx, variantId: string, warehouseId: string, qty: number, reference: string) {
  // Only ever releases units this order reserved, so reserved cannot go negative.
  await tx.$executeRaw`UPDATE "Inventory" SET "reserved" = "reserved" - ${qty} WHERE "variantId" = ${variantId} AND "warehouseId" = ${warehouseId} AND "reserved" >= ${qty}`;
  await tx.inventoryMovement.create({ data: { variantId, warehouseId, delta: qty, reason: "RELEASE", reference } });
}

/** Converts a reservation into a sale (stock leaves the building). */
export async function commitStock(tx: Tx, variantId: string, warehouseId: string, qty: number, reference: string) {
  await tx.inventory.update({ where: { variantId_warehouseId: { variantId, warehouseId } }, data: { onHand: { decrement: qty }, reserved: { decrement: qty } } });
  await tx.inventoryMovement.create({ data: { variantId, warehouseId, delta: -qty, reason: "SALE", reference } });
}

export async function adjustStock(variantId: string, warehouseId: string, delta: number, reason: "RECEIPT" | "ADJUSTMENT" | "RETURN", actorId: string, reference?: string) {
  return db.$transaction(async (tx) => {
    const inv = await tx.inventory.upsert({ where: { variantId_warehouseId: { variantId, warehouseId } }, update: {}, create: { variantId, warehouseId } });
    if (inv.onHand + delta < inv.reserved) throw new AppError("Adjustment would drop stock below reserved units.", "INVALID_ADJUSTMENT");
    await tx.inventory.update({ where: { id: inv.id }, data: { onHand: { increment: delta } } });
    await tx.inventoryMovement.create({ data: { variantId, warehouseId, delta, reason, reference: reference ?? null, actorId } });
  });
}
