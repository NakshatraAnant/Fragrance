import type { Metadata } from "next";
import { db } from "@/lib/db";
import { requireUser } from "@/lib/auth";
import { deleteAddress, makeDefaultAddress } from "@/app/actions/account";
import { AddressForm } from "@/components/forms/account-forms";
import { INDIAN_STATES } from "@/lib/shipping";

export const metadata: Metadata = { title: "Saved addresses", robots: { index: false } };

export default async function AddressesPage() {
  const user = await requireUser("/account/addresses");
  const addresses = await db.address.findMany({ where: { userId: user.id }, orderBy: [{ isDefault: "desc" }, { createdAt: "desc" }] });
  return (
    <div className="grid gap-10">
      <h1 className="display text-5xl">Saved addresses</h1>
      {addresses.length === 0 ? <p className="text-muted">No saved addresses yet.</p> : (
        <ul className="grid gap-4 md:grid-cols-2">
          {addresses.map((a) => (
            <li key={a.id} className="card p-5 text-sm">
              <p className="font-semibold">{a.label ?? a.name}{a.isDefault && <span className="badge ml-2">Default</span>}</p>
              <p className="mt-1 text-muted">{a.name}, {a.line1}{a.line2 ? `, ${a.line2}` : ""}{a.landmark ? ` (near ${a.landmark})` : ""}, {a.city}, {a.state} {a.pincode} · {a.phone}</p>
              <div className="mt-3 flex gap-3">
                {!a.isDefault && <form action={makeDefaultAddress}><input type="hidden" name="id" value={a.id} /><button className="underline">Make default</button></form>}
                <form action={deleteAddress}><input type="hidden" name="id" value={a.id} /><button className="text-danger underline">Delete</button></form>
              </div>
            </li>
          ))}
        </ul>
      )}
      <section className="card p-6"><h2 className="display mb-4 text-2xl">Add an address</h2><AddressForm states={INDIAN_STATES} /></section>
    </div>
  );
}
