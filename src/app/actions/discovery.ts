"use server";
import { revalidatePath } from "next/cache";
import { db } from "@/lib/db";
import { requireUser } from "@/lib/auth";
import { recordServerEvent } from "@/lib/analytics";

/** Attaches an anonymous Scent Finder result to the signed-in customer's Wardrobe. */
export async function claimProfile(fd: FormData) {
  const shareId = String(fd.get("shareId"));
  const user = await requireUser(`/scent-finder/results/${shareId}`);
  await db.scentProfile.updateMany({ where: { shareId, userId: null }, data: { userId: user.id } });
  // Saving a profile is an explicit request to personalise.
  await db.customerPreference.upsert({ where: { userId: user.id }, update: { profilingConsent: true }, create: { userId: user.id, profilingConsent: true } });
  revalidatePath(`/scent-finder/results/${shareId}`);
}

export async function saveLayering(fd: FormData) {
  const pairId = String(fd.get("pairId"));
  const user = await requireUser("/layering");
  const pair = await db.layeringPair.findUnique({ where: { id: pairId } });
  if (!pair || !pair.isActive) return;
  await db.savedLayering.upsert({ where: { userId_pairId: { userId: user.id, pairId } }, update: {}, create: { userId: user.id, pairId } });
  await recordServerEvent("layering_save", { userId: user.id, props: { pairId } });
  revalidatePath("/layering");
}
