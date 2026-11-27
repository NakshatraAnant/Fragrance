import { NextResponse } from "next/server";
import { getAllCards } from "@/lib/catalog";

export const dynamic = "force-dynamic";

/** Public card data for client widgets (recently viewed, compare, quick view). ?ids=a,b or ?slugs=a,b */
export async function GET(req: Request) {
  const url = new URL(req.url);
  const ids = (url.searchParams.get("ids") ?? "").split(",").filter(Boolean).slice(0, 24);
  const slugs = (url.searchParams.get("slugs") ?? "").split(",").filter(Boolean).slice(0, 24);
  const cards = await getAllCards();
  const out = cards.filter((c) => ids.includes(c.id) || slugs.includes(c.slug));
  const order = ids.length ? ids : slugs;
  out.sort((a, b) => order.indexOf(ids.length ? a.id : a.slug) - order.indexOf(ids.length ? b.id : b.slug));
  return NextResponse.json({ products: out });
}
