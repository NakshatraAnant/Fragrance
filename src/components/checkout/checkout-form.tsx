"use client";
import Link from "next/link";
import { useActionState, useEffect, useState } from "react";
import { placeOrder } from "@/app/actions/checkout";
import { useCart } from "@/components/cart/cart-provider";
import { OrderSummary } from "@/components/cart/cart-page";
import { Field, FormMessage, SelectField, Submit } from "@/components/forms/fields";
import { EmptyState } from "@/components/ui/empty-state";
import { formatINR } from "@/lib/money";
import { track } from "@/components/analytics-tracker";

type Addr = { id: string; label: string | null; name: string; phone: string; line1: string; line2: string | null; landmark: string | null; city: string; state: string; pincode: string };

export function CheckoutForm({ idempotencyKey, user, addresses, states, codEnabled, paymentMode }: { idempotencyKey: string; user: { email: string; name: string; phone: string } | null; addresses: Addr[]; states: string[]; codEnabled: boolean; paymentMode: "RAZORPAY" | "SANDBOX" | "UNAVAILABLE" }) {
  const { cart } = useCart();
  const [state, action] = useActionState(placeOrder, null);
  const [addr, setAddr] = useState<Addr | null>(addresses[0] ?? null);
  const [pin, setPin] = useState(addr?.pincode ?? "");
  const [delivery, setDelivery] = useState<{ ok: boolean; serviceable?: boolean; label?: string; message?: string } | null>(null);
  useEffect(() => { track("checkout_start"); }, []);
  useEffect(() => {
    if (!/^[1-9]\d{5}$/.test(pin)) { setDelivery(null); return; }
    fetch(`/api/pincode?code=${pin}`).then((r) => r.json()).then(setDelivery).catch(() => {});
  }, [pin]);

  if (!cart) return <div className="skeleton mt-8 h-96" />;
  if (cart.items.length === 0) return <div className="mt-8"><EmptyState title="Your bag is empty" body="Add something before checking out."><Link href="/shop" className="btn btn-primary">Shop</Link></EmptyState></div>;

  const d = (k: keyof Addr) => (state?.data?.[k] as string | undefined) ?? (addr?.[k] as string | undefined) ?? "";
  const v = (k: string, fallback = "") => (state?.data?.[k] as string | undefined) ?? fallback;
  const unserviceable = delivery?.ok && delivery.serviceable === false;
  return (
    <form action={action} className="mt-8 grid gap-12 lg:grid-cols-[1.5fr_1fr]" noValidate key={addr?.id ?? "new"}>
      <input type="hidden" name="idempotencyKey" value={idempotencyKey} />
      <div className="grid gap-10">
        <section aria-labelledby="c-contact">
          <div className="flex items-baseline justify-between"><h2 id="c-contact" className="display text-3xl">1 · Contact</h2>{!user && <Link href="/account/login?next=/checkout" className="text-sm underline">Sign in for faster checkout</Link>}</div>
          <p className="mt-1 text-sm text-muted">{user ? `Signed in as ${user.email}` : "Checking out as a guest. You can create an account afterwards, and your discovery credits will follow your email."}</p>
          <div className="mt-5 grid gap-4 md:grid-cols-2">
            <Field name="email" label="Email" type="email" required autoComplete="email" state={state} defaultValue={v("email", user?.email)} readOnly={!!user} />
            <Field name="phone" label="Mobile number" type="tel" required autoComplete="tel" state={state} defaultValue={v("phone", addr?.phone ?? user?.phone)} hint="For delivery updates." />
          </div>
        </section>
        <section aria-labelledby="c-address">
          <h2 id="c-address" className="display text-3xl">2 · Delivery address</h2>
          {addresses.length > 0 && (
            <div className="mt-4 flex flex-wrap gap-2">
              {addresses.map((a) => <button type="button" key={a.id} className="chip text-sm" aria-pressed={addr?.id === a.id} onClick={() => { setAddr(a); setPin(a.pincode); }}>{a.label ?? a.name} · {a.city} {a.pincode}</button>)}
              <button type="button" className="chip text-sm" aria-pressed={!addr} onClick={() => { setAddr(null); setPin(""); }}>+ New address</button>
            </div>
          )}
          <div className="mt-5 grid gap-4 md:grid-cols-2">
            <Field name="name" label="Full name" required autoComplete="name" state={state} defaultValue={d("name") || user?.name} className="md:col-span-2" />
            <Field name="line1" label="House / flat, building, street" required autoComplete="address-line1" state={state} defaultValue={d("line1")} className="md:col-span-2" />
            <Field name="line2" label="Area / locality" autoComplete="address-line2" state={state} defaultValue={d("line2")} />
            <Field name="landmark" label="Landmark (optional)" state={state} defaultValue={d("landmark")} />
            <div className="field">
              <label htmlFor="f-pincode" className="label">PIN code<span className="text-accent"> *</span></label>
              <input id="f-pincode" name="pincode" className="input" inputMode="numeric" maxLength={6} required autoComplete="postal-code" value={pin} onChange={(e) => setPin(e.target.value.replace(/\D/g, ""))} aria-invalid={!!state?.errors?.pincode || unserviceable} aria-describedby="pin-status" />
              <p id="pin-status" role="status" className={`text-sm ${delivery?.serviceable ? "text-ok" : "text-danger"}`}>{state?.errors?.pincode ?? (delivery ? (delivery.serviceable ? delivery.label : delivery.message) : "")}</p>
            </div>
            <Field name="city" label="City" required autoComplete="address-level2" state={state} defaultValue={d("city")} />
            <SelectField name="state" label="State / UT" required state={state} options={[["", "Choose…"], ...states.map((s) => [s, s] as [string, string])]} defaultValue={d("state")} />
            <Field name="gstin" label="GSTIN (optional, for a business invoice)" state={state} defaultValue={v("gstin")} className="md:col-span-2" />
            {cart.giftWrap && <Field name="giftRecipient" label="Gift recipient's name (optional)" state={state} defaultValue={v("giftRecipient")} className="md:col-span-2" />}
          </div>
          {user && !addr && <label className="mt-4 flex items-center gap-2 text-sm"><input type="checkbox" name="saveAddress" className="accent-[var(--accent)]" defaultChecked /> Save this address to my account</label>}
        </section>
        <section aria-labelledby="c-pay">
          <h2 id="c-pay" className="display text-3xl">3 · Payment</h2>
          <div className="mt-4 grid gap-3">
            <label className="card flex items-start gap-3 p-4">
              <input type="radio" name="paymentMethod" value="ONLINE" defaultChecked className="mt-1 accent-[var(--accent)]" />
              <span><span className="font-semibold">Pay online — UPI, cards, net banking</span>
                <span className="block text-sm text-muted">{paymentMode === "RAZORPAY" ? "Secured by Razorpay." : paymentMode === "SANDBOX" ? "This environment uses the local payment sandbox. No real money moves." : "Online payment isn't configured on this environment."}</span></span>
            </label>
            {codEnabled && <label className="card flex items-start gap-3 p-4"><input type="radio" name="paymentMethod" value="COD" className="mt-1 accent-[var(--accent)]" /><span><span className="font-semibold">Cash on delivery</span><span className="block text-sm text-muted">Available for eligible PIN codes.</span></span></label>}
          </div>
          <label className="mt-5 flex items-start gap-2 text-sm"><input type="checkbox" name="marketingOptIn" className="mt-0.5 accent-[var(--accent)]" defaultChecked={state?.data?.marketingOptIn === "on"} /> Email me about new scents and offers (optional — you can unsubscribe at any time).</label>
        </section>
      </div>
      <aside className="lg:sticky lg:top-24 lg:self-start">
        <div className="card p-6">
          <h2 className="display mb-4 text-2xl">Order summary</h2>
          <ul className="mb-5 grid gap-2 text-sm">{cart.items.map((i) => <li key={i.variantId} className="flex justify-between gap-3"><span>{i.name} · {i.label} × {i.quantity}</span><span>{formatINR(i.lineSubtotalPaise)}</span></li>)}</ul>
          <OrderSummary totals={cart.totals} />
          {cart.couponError && <p className="mt-2 text-sm text-danger">{cart.couponError}</p>}
          <div className="mt-5"><FormMessage state={state} /></div>
          <div className="mt-4"><Submit className="btn btn-primary btn-block">{`Place order · ${formatINR(cart.totals.totalPaise)}`}</Submit></div>
          <p className="mt-3 text-xs text-muted">By placing your order you agree to our <Link href="/terms" className="underline">terms</Link> and <Link href="/privacy" className="underline">privacy policy</Link>. We reserve your items for 30 minutes while you pay.</p>
        </div>
      </aside>
    </form>
  );
}
