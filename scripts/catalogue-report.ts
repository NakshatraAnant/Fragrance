// Prints the imported catalogue for verification against the blueprint SKU master.
// Usage: npx tsx scripts/catalogue-report.ts
import { PrismaClient } from "@prisma/client";

const db = new PrismaClient();
(async () => {
  const ps = await db.product.findMany({
    include: { brand: true, collection: true, concept: true, variants: { orderBy: { sortOrder: "asc" } }, setContents: true },
    orderBy: { merchRank: "asc" },
  });
  for (const p of ps) {
    console.log(
      `${p.brand.slug.padEnd(6)} ${p.slug.padEnd(38)} ${(p.collection?.slug ?? "-").padEnd(16)} ${p.format.padEnd(10)} ${(p.concept?.code ?? "-").padEnd(4)} set:${p.setContents.length} | ` +
        p.variants.map((v) => `${v.sku} ${v.label} ₹${v.mrpPaise / 100}`).join(" ; "),
    );
  }
  console.log(`\n${ps.length} products, ${ps.reduce((n, p) => n + p.variants.length, 0)} SKUs`);
  await db.$disconnect();
})();
