import { NextResponse } from "next/server";
import { z } from "zod";
import { db } from "@/lib/db";
import { getAllCards } from "@/lib/catalog";
import { rulesRecommender } from "@/lib/recommend";
import { getSetting } from "@/lib/settings";
import { getCurrentUser, clientIp } from "@/lib/auth";
import { rateLimit } from "@/lib/rate-limit";
import { randomToken } from "@/lib/password";
import { recordServerEvent } from "@/lib/analytics";

const slug = z.string().regex(/^[a-z0-9-]{1,40}$/);
const AnswersSchema = z.object({
  families: z.array(slug).max(16),
  likedNotes: z.array(slug).max(20),
  dislikedNotes: z.array(slug).max(20),
  moods: z.array(slug).max(10),
  occasions: z.array(slug).max(12),
  seasons: z.array(slug).max(4),
  intensity: z.enum(["SOFT", "MODERATE", "RICH", "ANY"]),
  formats: z.array(z.enum(["EDP", "MIST", "ATTAR", "SOLID", "TRAVEL", "EXTRAIT", "HOME"])).max(7),
  budgetMaxPaise: z.number().int().min(0).max(5_000_000).nullable(),
  leaning: z.enum(["feminine", "masculine", "unisex", "any"]),
  brands: z.array(z.enum(["dhun", "vasana", "anvaya"])).max(3),
});

export async function POST(req: Request) {
  if (!rateLimit(`finder:${await clientIp()}`, 20, 600_000).ok) return NextResponse.json({ error: "Too many attempts. Please wait a moment." }, { status: 429 });
  const parsed = AnswersSchema.safeParse(await req.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ error: "Some answers were invalid." }, { status: 400 });
  const [cards, weights, user] = await Promise.all([getAllCards(), getSetting("finderWeights"), getCurrentUser()]);
  const r = rulesRecommender.recommend(parsed.data, cards, weights, 6);
  const shareId = randomToken(9).replace(/[^A-Za-z0-9]/g, "").slice(0, 10);
  await db.scentProfile.create({
    data: {
      shareId, userId: user?.id ?? null, answers: JSON.stringify(parsed.data), personalityTitle: r.personalityTitle, summary: r.summary, engineVersion: r.engineVersion,
      results: JSON.stringify({ matches: r.matches.map((m) => ({ productId: m.productId, score: m.score, reasons: m.reasons })), discoverySet: r.discoverySet, familyProfile: r.familyProfile, excludedCount: r.excludedCount, exclusions: r.exclusions }),
    },
  });
  await recordServerEvent("finder_complete", { userId: user?.id, props: { shareId, matches: r.matches.length, top: r.matches[0]?.slug } });
  return NextResponse.json({ shareId });
}
