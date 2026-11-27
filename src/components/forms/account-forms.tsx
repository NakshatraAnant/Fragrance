"use client";
import { useActionState } from "react";
import { saveAddress, savePreferences } from "@/app/actions/account";
import { Field, FormMessage, SelectField, Submit } from "./fields";

export function AddressForm({ states }: { states: string[] }) {
  const [state, action] = useActionState(saveAddress, null);
  return (
    <form action={action} className="grid gap-4 md:grid-cols-2" key={state?.ok ? Date.now() : "f"}>
      <Field name="label" label="Label (e.g. Home, Office)" state={state} />
      <Field name="name" label="Full name" required state={state} />
      <Field name="phone" label="Mobile" type="tel" required state={state} />
      <Field name="pincode" label="PIN code" inputMode="numeric" maxLength={6} required state={state} />
      <Field name="line1" label="House / flat, building, street" required state={state} className="md:col-span-2" />
      <Field name="line2" label="Area / locality" state={state} />
      <Field name="landmark" label="Landmark" state={state} />
      <Field name="city" label="City" required state={state} />
      <SelectField name="state" label="State / UT" required state={state} options={[["", "Choose…"], ...states.map((s) => [s, s] as [string, string])]} />
      <div className="md:col-span-2 grid gap-3"><FormMessage state={state} /><Submit>Save address</Submit></div>
    </form>
  );
}

export function PreferencesForm({ initial, families }: { initial: { name: string; phone: string; birthday: string; families: string[]; disliked: string; profiling: boolean; email: boolean; whatsapp: boolean }; families: { slug: string; name: string }[] }) {
  const [state, action] = useActionState(savePreferences, null);
  return (
    <form action={action} className="grid gap-6">
      <div className="grid gap-4 md:grid-cols-3">
        <Field name="name" label="Name" defaultValue={initial.name} state={state} />
        <Field name="phone" label="Mobile" type="tel" defaultValue={initial.phone} state={state} />
        <Field name="birthday" label="Birthday (optional)" type="date" defaultValue={initial.birthday} state={state} />
      </div>
      <fieldset><legend className="label mb-2">Favourite fragrance families</legend>
        <div className="flex flex-wrap gap-2">{families.map((f) => <label key={f.slug} className="chip text-sm"><input type="checkbox" name="families" value={f.slug} defaultChecked={initial.families.includes(f.slug)} className="accent-[var(--accent)]" /> {f.name}</label>)}</div>
      </fieldset>
      <Field name="disliked" label="Notes you'd rather avoid (comma-separated)" defaultValue={initial.disliked} state={state} placeholder="e.g. oud accord, vanilla" />
      <fieldset className="grid gap-3"><legend className="label mb-1">Consent</legend>
        <label className="flex items-start gap-2 text-sm"><input type="checkbox" name="profiling" defaultChecked={initial.profiling} className="mt-0.5 accent-[var(--accent)]" /> Use my Scent Finder answers, purchases and browsing to personalise recommendations.</label>
        <label className="flex items-start gap-2 text-sm"><input type="checkbox" name="emailConsent" defaultChecked={initial.email} className="mt-0.5 accent-[var(--accent)]" /> Email me news, offers and replenishment reminders.</label>
        <label className="flex items-start gap-2 text-sm"><input type="checkbox" name="whatsappConsent" defaultChecked={initial.whatsapp} className="mt-0.5 accent-[var(--accent)]" /> Send me WhatsApp messages (concierge, reminders, offers).</label>
        <p className="text-xs text-muted">Order and account messages, such as confirmations and password resets, are always sent. Every change to your consent is recorded with a timestamp.</p>
      </fieldset>
      <FormMessage state={state} />
      <Submit>Save preferences</Submit>
    </form>
  );
}
