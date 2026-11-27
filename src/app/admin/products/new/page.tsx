import { db } from "@/lib/db";
import { requireStaff } from "@/lib/auth";
import { createProduct } from "@/app/actions/admin/catalog";
import { AdminHeader, Flash } from "@/components/admin/ui";
import { ProductFields } from "@/components/admin/product-form";

export default async function NewProduct({ searchParams }: { searchParams: Promise<{ msg?: string; err?: string }> }) {
  await requireStaff("catalog:write", "/admin/products/new");
  const sp = await searchParams;
  const [brands, categories, collections, concepts, families] = await Promise.all([db.brand.findMany({ orderBy: { sortOrder: "asc" } }), db.category.findMany({ orderBy: { sortOrder: "asc" } }), db.collection.findMany({ include: { brand: true } }), db.scentConcept.findMany({ orderBy: { code: "asc" } }), db.fragranceFamily.findMany({ orderBy: { sortOrder: "asc" } })]);
  return (
    <>
      <AdminHeader title="New product" sub="Products start as drafts. Add variants, media and approvals before activating." />
      <Flash msg={sp.msg} err={sp.err} />
      <form action={createProduct} className="grid gap-6">
        <ProductFields p={{ status: "DRAFT", merchRank: 100, intensity: "MODERATE", nameStatus: "WORKING_NAME", claimsStatus: "UNVERIFIED" }} brands={brands} categories={categories} collections={collections.map((c) => ({ id: c.id, name: c.name, brand: c.brand.name }))} concepts={concepts} families={families} famWeights={{}} />
        <div><button className="btn btn-primary">Create draft</button></div>
      </form>
    </>
  );
}
