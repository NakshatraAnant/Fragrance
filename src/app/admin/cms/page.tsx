import { db } from "@/lib/db";
import { requireStaff } from "@/lib/auth";
import { bannerAction, saveSection } from "@/app/actions/admin/content";
import { AdminHeader, Area, Btn, Check, Flash, In, Pill, Section, Sel } from "@/components/admin/ui";
import { PreviewFrame } from "@/components/admin/preview-frame";

const dt = (d: Date | null) => (d ? new Date(d.getTime() - d.getTimezoneOffset() * 60000).toISOString().slice(0, 16) : "");

export default async function CmsAdmin({ searchParams }: { searchParams: Promise<{ msg?: string; err?: string }> }) {
  await requireStaff("cms:write", "/admin/cms");
  const sp = await searchParams;
  const [sections, banners] = await Promise.all([db.homepageSection.findMany({ orderBy: { sortOrder: "asc" } }), db.banner.findMany({ orderBy: [{ placement: "asc" }, { sortOrder: "asc" }] })]);
  return (
    <>
      <AdminHeader title="Homepage & banners" sub="Every homepage section, placement and banner is managed here. Changes publish immediately, and scheduling windows apply." />
      <Flash msg={sp.msg} err={sp.err} />
      <Section title="Preview"><PreviewFrame path="/" /></Section>
      <Section title="Homepage sections">
        <div className="grid gap-3">
          {sections.map((s) => (
            <details key={s.id} className="card p-4">
              <summary className="flex cursor-pointer flex-wrap items-center gap-2"><span className="font-mono text-xs text-muted">{String(s.sortOrder).padStart(2, "0")}</span><strong>{s.title}</strong><Pill>{s.type}</Pill><Pill tone={s.isActive ? "ok" : "warn"}>{s.isActive ? "Live" : "Hidden"}</Pill>{(s.startsAt || s.endsAt) && <Pill tone="accent">Scheduled</Pill>}</summary>
              <form action={saveSection} className="mt-4 grid gap-3 md:grid-cols-4">
                <input type="hidden" name="id" value={s.id} />
                <In label="Title" name="title" defaultValue={s.title} className="md:col-span-2" /><In label="Order" name="sortOrder" type="number" defaultValue={s.sortOrder} /><div className="flex items-end"><Check label="Live" name="isActive" defaultChecked={s.isActive} /></div>
                <Area label="Subtitle" name="subtitle" defaultValue={s.subtitle} rows={2} className="md:col-span-2" /><Area label="Body" name="body" defaultValue={s.body} rows={2} className="md:col-span-2" />
                <In label="CTA label" name="ctaLabel" defaultValue={s.ctaLabel} /><In label="CTA link" name="ctaHref" defaultValue={s.ctaHref} /><In label="Starts" name="startsAt" type="datetime-local" defaultValue={dt(s.startsAt)} /><In label="Ends" name="endsAt" type="datetime-local" defaultValue={dt(s.endsAt)} />
                <label className="field md:col-span-2"><span className="label">Desktop image {s.imageDesktop && <a href={s.imageDesktop} className="underline" target="_blank">current</a>}</span><input type="file" name="imageDesktop" accept="image/*" className="text-sm" />{s.imageDesktop && <Check label="Remove" name="imageDesktop_clear" />}</label>
                <label className="field md:col-span-2"><span className="label">Mobile image {s.imageMobile && <a href={s.imageMobile} className="underline" target="_blank">current</a>}</span><input type="file" name="imageMobile" accept="image/*" className="text-sm" />{s.imageMobile && <Check label="Remove" name="imageMobile_clear" />}</label>
                <Area label='Config (JSON) — carousels: {"source":"featured|new|bestsellers|category|slugs","slug":"…","slugs":[…],"limit":8}' name="config" defaultValue={JSON.stringify(JSON.parse(s.config), null, 1)} rows={3} className="md:col-span-4" />
                <div><Btn>Save section</Btn></div>
              </form>
            </details>
          ))}
        </div>
      </Section>
      <Section title="Banners & placements">
        <div className="grid gap-3">
          {[...banners, null].map((b) => (
            <form key={b?.id ?? "new"} action={bannerAction} className="card grid gap-3 p-4 md:grid-cols-6">
              {b && <input type="hidden" name="id" value={b.id} />}
              <Sel label="Placement" name="placement" defaultValue={b?.placement ?? "HOME_PROMO"} options={["ANNOUNCEMENT", "HOME_PROMO", "BRAND_DHUN", "BRAND_VASANA", "BRAND_ANVAYA", "CART"]} />
              <In label="Title" name="title" defaultValue={b?.title} className="md:col-span-3" /><In label="Order" name="sortOrder" type="number" defaultValue={b?.sortOrder ?? 0} /><div className="flex items-end"><Check label="Live" name="isActive" defaultChecked={b?.isActive ?? true} /></div>
              <In label="Body" name="body" defaultValue={b?.body} className="md:col-span-2" /><In label="CTA label" name="ctaLabel" defaultValue={b?.ctaLabel} /><In label="CTA link" name="ctaHref" defaultValue={b?.ctaHref} /><In label="Starts" name="startsAt" type="datetime-local" defaultValue={dt(b?.startsAt ?? null)} /><In label="Ends" name="endsAt" type="datetime-local" defaultValue={dt(b?.endsAt ?? null)} />
              <label className="field md:col-span-3"><span className="label">Desktop image</span><input type="file" name="imageDesktop" accept="image/*" className="text-sm" /></label>
              <label className="field md:col-span-3"><span className="label">Mobile image</span><input type="file" name="imageMobile" accept="image/*" className="text-sm" /></label>
              <div className="flex gap-2 md:col-span-6"><Btn>{b ? "Save banner" : "Add banner"}</Btn>{b && <button name="op" value="delete" className="btn btn-ghost btn-sm text-danger">Delete</button>}</div>
            </form>
          ))}
        </div>
      </Section>
    </>
  );
}
