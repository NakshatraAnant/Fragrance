"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";
import { confirmRazorpay } from "@/app/actions/checkout";

declare global { interface Window { Razorpay?: new (opts: Record<string, unknown>) => { open: () => void; on: (ev: string, cb: (r: unknown) => void) => void } } }

function loadScript(): Promise<boolean> {
  return new Promise((resolve) => {
    if (window.Razorpay) return resolve(true);
    const s = document.createElement("script");
    s.src = "https://checkout.razorpay.com/v1/checkout.js";
    s.onload = () => resolve(true);
    s.onerror = () => resolve(false);
    document.body.appendChild(s);
  });
}

/** Opens Razorpay Checkout. The handler response is sent to the server for signature + API verification. */
export function RazorpayButton(props: { orderId: string; token: string; keyId: string; providerOrderId: string; amount: number; name: string; email: string; contact: string }) {
  const router = useRouter();
  const [msg, setMsg] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  async function pay() {
    setBusy(true); setMsg(null);
    if (!(await loadScript()) || !window.Razorpay) { setMsg("Couldn't load the payment window. Check your connection and try again."); setBusy(false); return; }
    const rz = new window.Razorpay({
      key: props.keyId, order_id: props.providerOrderId, amount: props.amount, currency: "INR", name: "Vasana House",
      prefill: { name: props.name, email: props.email, contact: props.contact }, theme: { color: "#9c5034" },
      handler: async (r: { razorpay_order_id: string; razorpay_payment_id: string; razorpay_signature: string }) => {
        setMsg("Verifying your payment…");
        const res = await confirmRazorpay({ orderId: props.orderId, token: props.token, razorpayOrderId: r.razorpay_order_id, razorpayPaymentId: r.razorpay_payment_id, razorpaySignature: r.razorpay_signature });
        setMsg(res.message ?? null);
        if (res.ok && res.redirectTo) router.push(res.redirectTo); else router.refresh();
      },
      modal: { ondismiss: () => setBusy(false) },
    });
    rz.on("payment.failed", () => { setMsg("The payment failed. You haven't been charged. You can try again."); setBusy(false); });
    rz.open();
  }
  return (
    <div className="grid gap-3">
      <button className="btn btn-primary" onClick={pay} disabled={busy}>Pay securely with Razorpay</button>
      {msg && <p role="status" className="text-sm">{msg}</p>}
      <p className="text-xs text-muted">UPI, cards, net banking and wallets. We confirm your order only after the payment has been verified on our servers.</p>
    </div>
  );
}
