import type { Metadata } from "next";
import { db } from "@/lib/db";
import { requireUser } from "@/lib/auth";
import { hasMarketingConsent } from "@/lib/messaging";
import { requestDataAction } from "@/app/actions/account";
import { PreferencesForm } from "@/components/forms/account-forms";
import { formatDate } from "@/lib/money";

export const metadata: Metadata = { title: "Preferences & privacy", robots: { index: false } };

export default async function PreferencesPage() {
  const user = await requireUser("/account/preferences");
  const [u, pref, fams, email, wa, requests, consents] = await Promise.all([
    db.user.findUniqueOrThrow({ where: { id: user.id } }), db.customerPreference.findUnique({ where: { userId: user.id } }),
    db.fragranceFamily.findMany({ orderBy: { sortOrder: "asc" } }), hasMarketingConsent("EMAIL", { userId: user.id, email: user.email }), hasMarketingConsent("WHATSAPP", { userId: user.id, phone: user.phone }),
    db.dataRequest.findMany({ where: { userId: user.id }, orderBy: { createdAt: "desc" } }), db.marketingConsent.findMany({ where: { userId: user.id }, orderBy: { createdAt: "desc" }, take: 10 }),
  ]);
  return (
    <div className="grid gap-12">
      <section><h1 className="display text-5xl">Preferences & privacy</h1>
        <div className="mt-8"><PreferencesForm families={fams} initial={{ name: u.name ?? "", phone: u.phone ?? "", birthday: u.birthday ? u.birthday.toISOString().slice(0, 10) : "", families: pref?.favouriteFamilies.split(",").filter(Boolean) ?? [], disliked: pref?.dislikedNotes.replace(/-/g, " ") ?? "", profiling: pref?.profilingConsent ?? false, email, whatsapp: wa }} /></div>
      </section>
      <section className="card p-6">
        <h2 className="display text-2xl">Your data</h2>
        <p className="mt-2 text-sm text-muted">Download a copy of the data we hold about you, or ask us to delete your account. We keep order records for as long as tax law requires.</p>
        <div className="mt-4 flex flex-wrap gap-3">
          <a href="/api/account/export" className="btn btn-outline btn-sm">Download my data (JSON)</a>
          <form action={requestDataAction}><input type="hidden" name="type" value="DELETION" /><button className="btn btn-ghost btn-sm text-danger">Request account deletion</button></form>
        </div>
        {requests.length > 0 && <ul className="mt-4 text-sm">{requests.map((r) => <li key={r.id}>{r.type.toLowerCase()} request · {r.status.toLowerCase()} · {formatDate(r.createdAt)}</li>)}</ul>}
        {consents.length > 0 && <details className="mt-4 text-sm"><summary className="cursor-pointer">Consent history</summary><ul className="mt-2 text-muted">{consents.map((c) => <li key={c.id}>{formatDate(c.createdAt, true)} · {c.channel} · {c.granted ? "granted" : "withdrawn"} ({c.source})</li>)}</ul></details>}
      </section>
    </div>
  );
}
