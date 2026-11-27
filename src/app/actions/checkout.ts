"use server";
import { redirect } from "next/navigation";
import { clientIp, getCurrentUser, readGuestToken } from "@/lib/auth";
import { findCart } from "@/lib/cart";
import { CheckoutSchema, createOrderFromCart } from "@/lib/checkout";
import { AppError, log } from "@/lib/logger";
import { orderAccessToken, canAccessOrder } from "@/lib/order-access";
import { rateLimit } from "@/lib/rate-limit";
import { zodErrors, formObject, type FormState } from "@/lib/form-state";
import { runSandboxPayment, verifyRazorpayCheckout } from "@/lib/payments";
import { db } from "@/lib/db";
import { isStaff } from "@/lib/auth-core";

export async function placeOrder(_: FormState, fd: FormData): Promise<FormState> {
  const ip = await clientIp();
  if (!rateLimit(`checkout:${ip}`, 12, 600_000).ok) return { ok: false, message: "Too many attempts. Please wait a few minutes." };
  const raw = formObject(fd);
  const parsed = CheckoutSchema.safeParse({ ...raw, marketingOptIn: raw.marketingOptIn === "on", saveAddress: raw.saveAddress === "on" });
  if (!parsed.success) return { ok: false, errors: zodErrors(parsed.error), data: raw, message: "Please check the highlighted fields." };
  const user = await getCurrentUser();
  const cart = await findCart(await readGuestToken(), user?.id ?? null);
  if (!cart) return { ok: false, message: "Your bag is empty.", data: raw };
  let target: string;
  try {
    const order = await createOrderFromCart(cart.id, parsed.data, { userId: user?.id ?? null, ip });
    target = order.paymentMethod === "COD" ? `/order/${order.number}?t=${orderAccessToken(order.id)}&placed=1` : `/checkout/pay/${order.id}?t=${orderAccessToken(order.id)}`;
  } catch (e) {
    if (e instanceof AppError) return { ok: false, message: e.message, data: raw };
    log.error("placeOrder failed", { error: e });
    return { ok: false, message: "We couldn't place your order. Nothing has been charged. Please try again.", data: raw };
  }
  redirect(target);
}

async function authorise(orderId: string, token: string | null) {
  const order = await db.order.findUnique({ where: { id: orderId } });
  const user = await getCurrentUser();
  if (!order || !canAccessOrder(order, { userId: user?.id ?? null, token, isStaff: isStaff(user) })) throw new AppError("Order not found.", "NOT_FOUND", 404);
  return order;
}

/** Sandbox only: the tester chooses the outcome; the event is signed and verified server-side. */
export async function sandboxPay(fd: FormData) {
  const orderId = String(fd.get("orderId"));
  const token = String(fd.get("t") ?? "");
  const outcome = fd.get("outcome") === "failure" ? "failure" : "success";
  const order = await authorise(orderId, token);
  await runSandboxPayment(order.id, outcome, String(fd.get("method") ?? "upi"));
  const fresh = await db.order.findUniqueOrThrow({ where: { id: orderId } });
  if (fresh.paymentStatus === "PAID") redirect(`/order/${fresh.number}?t=${orderAccessToken(fresh.id)}&placed=1`);
  redirect(`/checkout/pay/${fresh.id}?t=${orderAccessToken(fresh.id)}&failed=1`);
}

/** Razorpay Checkout handler callback — verified server-side before anything changes. */
export async function confirmRazorpay(input: { orderId: string; token: string; razorpayOrderId: string; razorpayPaymentId: string; razorpaySignature: string }) {
  const order = await authorise(input.orderId, input.token);
  try {
    await verifyRazorpayCheckout({ orderId: order.id, razorpayOrderId: input.razorpayOrderId, razorpayPaymentId: input.razorpayPaymentId, razorpaySignature: input.razorpaySignature });
  } catch (e) {
    return { ok: false, message: e instanceof AppError ? e.message : "We couldn't verify the payment yet. If you were charged, your order will update automatically." };
  }
  const fresh = await db.order.findUniqueOrThrow({ where: { id: order.id } });
  return { ok: fresh.paymentStatus === "PAID", redirectTo: `/order/${fresh.number}?t=${orderAccessToken(fresh.id)}&placed=1`, message: fresh.paymentStatus === "PAID" ? "Payment confirmed." : "Payment is processing. This page will update once the provider confirms it." };
}
