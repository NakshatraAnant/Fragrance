import { Area, Check, In, Sel } from "./ui";

type Opt = { id: string; name: string };
export type ProductFormData = {
  id?: string; name?: string; subtitle?: string; slug?: string; brandId?: string; categoryId?: string; collectionId?: string | null; conceptId?: string | null; format?: string; status?: string;
  shortDescription?: string; description?: string; moods?: string; occasions?: string; seasons?: string; intensity?: string; gender?: string | null; giftSuitability?: string | null; replenishment?: string | null;
  channels?: string; isNew?: boolean; isFeatured?: boolean; isDiscoverySet?: boolean; isGiftSet?: boolean; merchRank?: number; nameStatus?: string; claimsStatus?: string; longevityNote?: string | null; projectionNote?: string | null;
  ingredientsDeclaration?: string | null; allergenDeclaration?: string | null; regulatoryNotes?: string | null; contentsNote?: string | null; seoTitle?: string | null; seoDescription?: string | null; sourceRef?: string | null;
};

export function ProductFields({ p, brands, categories, collections, concepts, families, famWeights }: { p: ProductFormData; brands: Opt[]; categories: Opt[]; collections: (Opt & { brand: string })[]; concepts: (Opt & { code: string })[]; families: { slug: string; name: string }[]; famWeights: Record<string, number> }) {
  return (
    <div className="grid gap-8">
      {p.id && <input type="hidden" name="id" value={p.id} />}
      <fieldset className="card grid gap-4 p-5 md:grid-cols-3"><legend className="px-1 font-semibold">Core</legend>
        <In label="Name" name="name" defaultValue={p.name} required />
        <In label="Subtitle (format descriptor)" name="subtitle" defaultValue={p.subtitle} required />
        <In label="Slug" name="slug" defaultValue={p.slug} required pattern="[a-z0-9-]{3,80}" />
        <Sel label="Brand" name="brandId" defaultValue={p.brandId} options={brands.map((b) => [b.id, b.name])} />
        <Sel label="Category" name="categoryId" defaultValue={p.categoryId} options={categories.map((c) => [c.id, c.name])} />
        <Sel label="Collection" name="collectionId" defaultValue={p.collectionId ?? ""} options={[["", "—"], ...collections.map((c) => [c.id, `${c.brand} · ${c.name}`] as [string, string])]} />
        <Sel label="Scent concept (brief)" name="conceptId" defaultValue={p.conceptId ?? ""} options={[["", "— none (set/coffret)"], ...concepts.map((c) => [c.id, `${c.code} · ${c.name}`] as [string, string])]} />
        <Sel label="Format" name="format" defaultValue={p.format} options={["EDP", "EXTRAIT", "MIST", "ATTAR", "RUH", "TRAVEL", "SOLID", "DISCOVERY", "CANDLE", "REED", "ROOM_SPRAY", "CAR", "BAKHOOR", "GIFT"]} />
        <Sel label="Status" name="status" defaultValue={p.status ?? "DRAFT"} options={["DRAFT", "ACTIVE", "ARCHIVED"]} />
        <Area label="Short description" name="shortDescription" defaultValue={p.shortDescription} rows={2} className="md:col-span-3" />
        <Area label="Description" name="description" defaultValue={p.description} rows={4} className="md:col-span-3" />
        <In label="Gender (as briefed)" name="gender" defaultValue={p.gender} />
        <Sel label="Gift suitability" name="giftSuitability" defaultValue={p.giftSuitability ?? ""} options={[["", "—"], "High", "Medium", "Low"]} />
        <Sel label="Replenishment" name="replenishment" defaultValue={p.replenishment ?? ""} options={[["", "—"], "High", "High (refill)", "Medium", "Low"]} />
        <In label="Primary channels" name="channels" defaultValue={p.channels} className="md:col-span-3" />
      </fieldset>
      <fieldset className="card grid gap-4 p-5 md:grid-cols-3"><legend className="px-1 font-semibold">Merchandising</legend>
        <In label="Merch rank (lower shows first)" name="merchRank" type="number" defaultValue={p.merchRank ?? 100} />
        <div className="flex flex-wrap items-end gap-4 md:col-span-2"><Check label="New" name="isNew" defaultChecked={p.isNew} /><Check label="Featured" name="isFeatured" defaultChecked={p.isFeatured} /><Check label="Discovery set" name="isDiscoverySet" defaultChecked={p.isDiscoverySet} /><Check label="Gift set" name="isGiftSet" defaultChecked={p.isGiftSet} /></div>
      </fieldset>
      <fieldset className="card grid gap-4 p-5 md:grid-cols-3"><legend className="px-1 font-semibold">Discovery engine attributes (configurable mapping)</legend>
        <In label="Moods (comma-separated)" name="moods" defaultValue={p.moods} />
        <In label="Occasions" name="occasions" defaultValue={p.occasions} />
        <In label="Seasons" name="seasons" defaultValue={p.seasons} />
        <Sel label="Intensity guide" name="intensity" defaultValue={p.intensity} options={["SOFT", "MODERATE", "RICH", "AMBIENT"]} />
        <div className="md:col-span-3"><p className="label mb-2">Family weights (0 = not in family, 100 = primary)</p>
          <div className="grid grid-cols-2 gap-2 md:grid-cols-4">{families.map((f) => <label key={f.slug} className="flex items-center justify-between gap-2 rounded border border-line px-2 py-1 text-sm">{f.name}<input name={`fam_${f.slug}`} type="number" min={0} max={100} defaultValue={famWeights[f.slug] ?? 0} className="w-16 rounded border border-line bg-surface px-1 text-right" /></label>)}</div>
        </div>
      </fieldset>
      <fieldset className="card grid gap-4 p-5 md:grid-cols-2"><legend className="px-1 font-semibold">Governance & compliance</legend>
        <Sel label="Name status" name="nameStatus" defaultValue={p.nameStatus} options={[["WORKING_NAME", "Working name (pending legal clearance)"], ["LEGALLY_CLEARED", "Legally cleared"]]} />
        <Sel label="Performance claims" name="claimsStatus" defaultValue={p.claimsStatus} options={[["UNVERIFIED", "Unverified (not shown)"], ["VERIFIED", "Verified by panel test (shown)"]]} />
        <In label="Longevity (substantiated wording)" name="longevityNote" defaultValue={p.longevityNote} />
        <In label="Projection (substantiated wording)" name="projectionNote" defaultValue={p.projectionNote} />
        <Area label="Ingredients (INCI) — only once formula approved" name="ingredientsDeclaration" defaultValue={p.ingredientsDeclaration} rows={3} />
        <Area label="Allergen declaration (IS 4707-2)" name="allergenDeclaration" defaultValue={p.allergenDeclaration} rows={3} />
        <Area label="Regulatory notes (internal)" name="regulatoryNotes" defaultValue={p.regulatoryNotes} rows={2} />
        <Area label="Contents note (sets/coffrets)" name="contentsNote" defaultValue={p.contentsNote} rows={2} />
        {p.sourceRef && <p className="text-xs text-muted md:col-span-2">Source: {p.sourceRef}</p>}
      </fieldset>
      <fieldset className="card grid gap-4 p-5 md:grid-cols-2"><legend className="px-1 font-semibold">SEO</legend>
        <In label="SEO title" name="seoTitle" defaultValue={p.seoTitle} />
        <In label="SEO description" name="seoDescription" defaultValue={p.seoDescription} />
      </fieldset>
    </div>
  );
}
