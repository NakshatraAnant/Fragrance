import type { Metadata } from "next";
import { db } from "@/lib/db";
import { getFamiliesWithCounts } from "@/lib/content";
import { FinderQuiz } from "@/components/discovery/finder-quiz";

export const metadata: Metadata = { title: "Scent Finder", description: "Ten questions to find your scent, with every recommendation explained. A transparent, rules-based match built on our catalogue.", alternates: { canonical: "/scent-finder" } };

export default async function ScentFinderPage() {
  const [families, notes] = await Promise.all([
    getFamiliesWithCounts(),
    db.note.findMany({ include: { _count: { select: { concepts: true } } }, orderBy: { name: "asc" } }),
  ]);
  const popularNotes = notes.filter((n) => n._count.concepts >= 2).sort((a, b) => b._count.concepts - a._count.concepts).slice(0, 30).map((n) => ({ slug: n.slug, name: n.name }));
  return <FinderQuiz families={families.filter((f) => f.count > 0).map((f) => ({ slug: f.slug, name: f.name, colour: f.colour, description: f.description }))} notes={popularNotes} />;
}
