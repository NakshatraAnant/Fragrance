import type { Metadata } from "next";
import { db } from "@/lib/db";
import { getAllCards } from "@/lib/catalog";
import { getCurrentUser } from "@/lib/auth";
import { PageHeader } from "@/components/listing/listing";
import { LayeringStudio } from "@/components/discovery/layering-studio";

export const metadata: Metadata = { title: "Layering Studio", description: "Curated fragrance pairings from the house, with the order to wear them in.", alternates: { canonical: "/layering" } };

export default async function LayeringPage({ searchParams }: { searchParams: Promise<{ pair?: string; p?: string }> }) {
  const sp = await searchParams;
  const [pairs, cards, user] = await Promise.all([db.layeringPair.findMany({ where: { isActive: true } }), getAllCards(), getCurrentUser()]);
  const saved = user ? (await db.savedLayering.findMany({ where: { userId: user.id }, select: { pairId: true } })).map((s) => s.pairId) : [];
  const wearable = cards.filter((c) => ["EDP", "MIST", "ATTAR", "EXTRAIT", "SOLID", "TRAVEL", "RUH"].includes(c.format));
  const initial = sp.p ?? (sp.pair ? pairs.find((p) => p.id === sp.pair)?.productAId : undefined) ?? pairs[0]?.productAId ?? wearable[0]?.id;
  return (
    <>
      <PageHeader eyebrow="Layering Studio" title="Wear two, smell like one" intro="Every pairing here has been curated by the house from the scents' briefs. We don't generate combinations automatically, so a scent without a curated pairing yet will say so." crumbs={[{ name: "Layering Studio", href: "/layering" }]} />
      <div className="container-x pb-16">
        <LayeringStudio
          wearable={wearable}
          home={cards.filter((c) => ["CANDLE", "REED", "ROOM_SPRAY", "CAR", "BAKHOOR"].includes(c.format))}
          pairs={pairs.map((p) => ({ id: p.id, a: p.productAId, b: p.productBId, title: p.title, rationale: p.rationale, sequence: p.sequence, source: p.source }))}
          initialId={initial}
          savedPairIds={saved}
          signedIn={!!user}
        />
      </div>
    </>
  );
}
