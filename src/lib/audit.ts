import { db } from "./db";

export async function audit(actorId: string | null | undefined, action: string, entity: string, entityId?: string | null, diff?: unknown) {
  await db.auditLog.create({ data: { actorId: actorId ?? null, action, entity, entityId: entityId ?? null, diff: diff === undefined ? null : JSON.stringify(diff).slice(0, 8000) } });
}

/** Shallow diff of changed fields for audit history. */
export function changed<T extends Record<string, unknown>>(before: T, after: Partial<T>): Record<string, { from: unknown; to: unknown }> {
  const out: Record<string, { from: unknown; to: unknown }> = {};
  for (const [k, v] of Object.entries(after)) if (before[k] !== v && !(before[k] instanceof Date)) out[k] = { from: before[k], to: v };
  return out;
}
