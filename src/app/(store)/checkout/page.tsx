import type { Metadata } from "next";
import { randomUUID } from "node:crypto";
import { db } from "@/lib/db";
import { getCurrentUser } from "@/lib/auth";
import { getSetting } from "@/lib/settings";
import { activePaymentMode } from "@/lib/payments";
import { INDIAN_STATES } from "@/lib/shipping";
import { CheckoutForm } from "@/components/checkout/checkout-form";

export const metadata: Metadata = { title: "Checkout", robots: { index: false } };
export const dynamic = "force-dynamic";

export default async function CheckoutPage() {
  const user = await getCurrentUser();
  const [addresses, cod] = await Promise.all([user ? db.address.findMany({ where: { userId: user.id }, orderBy: [{ isDefault: "desc" }, { createdAt: "desc" }] }) : [], getSetting("cod")]);
  return (
    <div className="container-x py-10">
      <h1 className="display text-5xl">Checkout</h1>
      <CheckoutForm
        idempotencyKey={randomUUID()}
        user={user ? { email: user.email, name: user.name ?? "", phone: user.phone ?? "" } : null}
        addresses={addresses.map((a) => ({ id: a.id, label: a.label, name: a.name, phone: a.phone, line1: a.line1, line2: a.line2, landmark: a.landmark, city: a.city, state: a.state, pincode: a.pincode }))}
        states={INDIAN_STATES}
        codEnabled={cod.enabled}
        paymentMode={activePaymentMode()}
      />
    </div>
  );
}
