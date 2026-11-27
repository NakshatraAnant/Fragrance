import { NextResponse } from "next/server";
import { getAllCards } from "@/lib/catalog";
import { POPULAR_SEARCHES, suggest } from "@/lib/search";

export async function GET(req: Request) {
  const q = (new URL(req.url).searchParams.get("q") ?? "").slice(0, 80);
  const cards = await getAllCards();
  const s = suggest(q, cards);
  return NextResponse.json({
    products: s.products.map((p) => ({ id: p.id, slug: p.slug, name: p.name, subtitle: p.subtitle, brand: { name: p.brand.name } })),
    terms: s.terms,
    popular: POPULAR_SEARCHES,
  });
}
