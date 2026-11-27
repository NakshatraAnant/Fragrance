// Removes products that have no variants and no orders (e.g. left behind by a renamed slug).
import { PrismaClient } from "@prisma/client";
const db = new PrismaClient();
(async () => {
  const orphans = await db.product.findMany({ where: { variants: { none: {} } }, select: { id: true, slug: true } });
  for (const o of orphans) { await db.product.delete({ where: { id: o.id } }); console.log("removed orphan", o.slug); }
  console.log("products:", await db.product.count());
  await db.$disconnect();
})();
