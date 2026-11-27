import { describe, it, expect, beforeAll } from "vitest";
import { randomUUID } from "node:crypto";
import { db } from "@/lib/db";
import { addToCart, getOrCreateCart, buildCartView, setCartQuantity } from "@/lib/cart";
import { createOrderFromCart, type CheckoutInput } from "@/lib/checkout";
import { runSandboxPayment, handleSandboxEvent, handleRazorpayWebhook } from "@/lib/payments";
import { expireStaleOrders, refundOrder, markOrderPaid } from "@/lib/payments/process";
import { availabilityFor } from "@/lib/inventory";
import { registerUser, authenticate } from "@/lib/auth-core";
import { submitEnquiry } from "@/lib/b2b";
import { getAllCards } from "@/lib/catalog";
import { resetRateLimits } from "@/lib/rate-limit";

const sku = async (code: string) => db.variant.findUniqueOrThrow({ where: { sku: code } });
const address = (o: Partial<CheckoutInput> = {}): CheckoutInput => ({
  idempotencyKey: randomUUID(), email: "buyer@example.test", phone: "9876543210", name: "Test Buyer", line1: "12 Test Lane", line2: "", landmark: "",
  city: "Mumbai", state: "Maharashtra", pincode: "400001", gstin: "", giftRecipient: "", paymentMethod: "ONLINE", marketingOptIn: false, saveAddress: false, ...o,
});
async function cartWith(items: [string, number][], userId: string | null = null) {
  const cart = await getOrCreateCart(randomUUID(), userId);
  await db.cartItem.deleteMany({ where: { cartId: cart.id } });
  for (const [code, q] of items) await addToCart(cart.id, (await sku(code)).id, q);
  return cart;
}

let userId: string;
beforeAll(async () => {
  resetRateLimits();
  const u = await registerUser({ email: "member@example.test", password: "Member-Pass-2026", name: "Member" });
  userId = u.id;
});

describe("authentication", () => {
  it("registers, rejects duplicates and authenticates with the right password only", async () => {
    await expect(registerUser({ email: "MEMBER@example.test", password: "Member-Pass-2026", name: "Dup" })).rejects.toThrow(/already exists/);
    await expect(authenticate("member@example.test", "wrong-password-1")).rejects.toThrow(/don't match/);
    expect((await authenticate("member@example.test", "Member-Pass-2026")).id).toBe(userId);
  });
});

describe("cart & inventory", () => {
  it("refuses to add more than is available and refuses out-of-stock SKUs", async () => {
    const cart = await getOrCreateCart(randomUUID(), null);
    await expect(addToCart(cart.id, (await sku("VA-44")).id, 1)).rejects.toThrow(/out of stock/);
    await expect(addToCart(cart.id, (await sku("AN-06")).id, 3)).rejects.toThrow(/Only 2/);
    await addToCart(cart.id, (await sku("AN-06")).id, 2);
    await expect(setCartQuantity(cart.id, (await sku("AN-06")).id, 5)).rejects.toThrow(/Only/);
  });
});

describe("checkout, payment and order lifecycle", () => {
  it("creates an order, reserves stock atomically and is idempotent on double submit", async () => {
    const v = await sku("VA-01");
    const before = (await availabilityFor([v.id]))[v.id];
    const cart = await cartWith([["VA-01", 2]]);
    const input = address();
    const order = await createOrderFromCart(cart.id, input, { userId: null });
    expect(order.status).toBe("PENDING_PAYMENT");
    expect(order.totalPaise).toBe(2 * 295000); // free shipping above threshold
    expect((await availabilityFor([v.id]))[v.id]).toBe(before - 2);
    const again = await createOrderFromCart(cart.id, input, { userId: null });
    expect(again.id).toBe(order.id);
    expect(await db.order.count({ where: { idempotencyKey: input.idempotencyKey } })).toBe(1);
  });

  it("prevents overselling when the last units are reserved by another order", async () => {
    const a = await cartWith([["AN-06", 2]]);
    await createOrderFromCart(a.id, address(), { userId: null });
    const b = await getOrCreateCart(randomUUID(), null);
    await expect(addToCart(b.id, (await sku("AN-06")).id, 1)).rejects.toThrow(/out of stock/);
  });

  it("rejects unserviceable PIN codes and invalid addresses", async () => {
    const cart = await cartWith([["DH-01", 1]]);
    await expect(createOrderFromCart(cart.id, address({ pincode: "799001" }), { userId: null })).rejects.toThrow(/can't confirm delivery/);
  });

  it("marks an order paid only through a verified payment event, commits stock and is idempotent", async () => {
    const v = await sku("DH-03");
    const cart = await cartWith([["DH-03", 1]]);
    const order = await createOrderFromCart(cart.id, address(), { userId: null });
    const inv0 = await db.inventory.findFirstOrThrow({ where: { variantId: v.id } });
    // Tampered event is rejected and changes nothing
    await expect(handleSandboxEvent(JSON.stringify({ eventId: "forged-1", type: "payment.captured", orderId: order.id, paymentId: "p", amountPaise: order.totalPaise, method: "upi", issuedAt: 1 }), "bad-signature")).rejects.toThrow(/signature/i);
    expect((await db.order.findUniqueOrThrow({ where: { id: order.id } })).paymentStatus).toBe("UNPAID");
    // Failure, then retry success
    await runSandboxPayment(order.id, "failure");
    expect((await db.order.findUniqueOrThrow({ where: { id: order.id } })).status).toBe("PAYMENT_FAILED");
    await runSandboxPayment(order.id, "success");
    const paid = await db.order.findUniqueOrThrow({ where: { id: order.id } });
    expect(paid.paymentStatus).toBe("PAID");
    expect(paid.status).toBe("CONFIRMED");
    const inv1 = await db.inventory.findFirstOrThrow({ where: { variantId: v.id } });
    expect(inv1.onHand).toBe(inv0.onHand - 1);
    expect(inv1.reserved).toBe(inv0.reserved - 1);
    // A duplicate capture doesn't double-commit
    await markOrderPaid(order.id, { provider: "SANDBOX", providerPaymentId: "dup", amountPaise: order.totalPaise });
    expect((await db.inventory.findFirstOrThrow({ where: { variantId: v.id } })).onHand).toBe(inv1.onHand);
  });

  it("rejects a capture whose amount doesn't match the order total", async () => {
    const cart = await cartWith([["DH-05", 1]]);
    const order = await createOrderFromCart(cart.id, address(), { userId: null });
    await expect(markOrderPaid(order.id, { provider: "SANDBOX", providerPaymentId: "x1", amountPaise: 100 })).rejects.toThrow(/Amount mismatch/);
  });

  it("expires unpaid orders and releases their reserved stock", async () => {
    const v = await sku("DH-07");
    const before = (await availabilityFor([v.id]))[v.id];
    const cart = await cartWith([["DH-07", 3]]);
    const order = await createOrderFromCart(cart.id, address(), { userId: null });
    expect((await availabilityFor([v.id]))[v.id]).toBe(before - 3);
    await db.order.update({ where: { id: order.id }, data: { expiresAt: new Date(Date.now() - 1000) } });
    expect(await expireStaleOrders()).toBeGreaterThanOrEqual(1);
    expect((await db.order.findUniqueOrThrow({ where: { id: order.id } })).status).toBe("EXPIRED");
    expect((await availabilityFor([v.id]))[v.id]).toBe(before);
  });

  it("rejects Razorpay webhooks without a valid signature", async () => {
    await expect(handleRazorpayWebhook(JSON.stringify({ event: "payment.captured", payload: {} }), "nope", "evt_1")).rejects.toThrow(/signature/i);
  });
});

describe("discovery credits", () => {
  let creditId: string;
  it("issues a credit only after a discovery set is paid", async () => {
    const cart = await cartWith([["VA-21", 1]], userId);
    const order = await createOrderFromCart(cart.id, address({ email: "member@example.test" }), { userId });
    expect(await db.discoveryCredit.count({ where: { userId } })).toBe(0);
    await runSandboxPayment(order.id, "success");
    const credits = await db.discoveryCredit.findMany({ where: { userId } });
    expect(credits).toHaveLength(1);
    expect(credits[0].amountPaise).toBe(125000);
    expect(credits[0].status).toBe("AVAILABLE");
    expect(Math.round((credits[0].expiresAt.getTime() - Date.now()) / 86400_000)).toBe(60);
    creditId = credits[0].id;
  });

  it("redeems the credit once on an eligible full size and blocks a second redemption", async () => {
    const cart = await cartWith([["VA-03", 1]], userId);
    await db.cart.update({ where: { id: cart.id }, data: { creditId } });
    const view = await buildCartView(await db.cart.findUniqueOrThrow({ where: { id: cart.id }, include: { items: { include: { variant: { include: { product: { include: { brand: true, concept: { select: { colour: true } } } } } } } } } }), { userId, email: "member@example.test" });
    expect(view.totals.creditPaise).toBe(125000);
    const order = await createOrderFromCart(cart.id, address({ email: "member@example.test" }), { userId });
    expect(order.creditPaise).toBe(125000);
    expect(order.totalPaise).toBe(295000 - 125000);
    expect((await db.discoveryCredit.findUniqueOrThrow({ where: { id: creditId } })).status).toBe("RESERVED");
    // Second order trying to use the same credit fails
    const cart2 = await cartWith([["VA-05", 1]], userId);
    await db.cart.update({ where: { id: cart2.id }, data: { creditId } });
    await expect(createOrderFromCart(cart2.id, address({ email: "member@example.test" }), { userId })).rejects.toThrow(/no longer available/);
    await runSandboxPayment(order.id, "success");
    const c = await db.discoveryCredit.findUniqueOrThrow({ where: { id: creditId } });
    expect(c.status).toBe("REDEEMED");
    expect(c.redeemedOrderId).toBe(order.id);
  });

  it("does not let another customer or a guest use someone else's credit", async () => {
    const other = await registerUser({ email: "other@example.test", password: "Other-Pass-2026", name: "Other" });
    const credit = await db.discoveryCredit.findFirstOrThrow({ where: { userId } });
    const cart = await cartWith([["VA-07", 1]], other.id);
    await db.cart.update({ where: { id: cart.id }, data: { creditId: credit.id } });
    await expect(createOrderFromCart(cart.id, address({ email: "other@example.test" }), { userId: other.id })).rejects.toThrow(/no longer available/);
  });

  it("voids an unused credit when its source order is fully refunded", async () => {
    const cart = await cartWith([["DH-17", 1]], userId);
    const order = await createOrderFromCart(cart.id, address({ email: "member@example.test" }), { userId });
    await runSandboxPayment(order.id, "success");
    const credit = await db.discoveryCredit.findFirstOrThrow({ where: { sourceOrderItem: { orderId: order.id } } });
    expect(credit.status).toBe("AVAILABLE");
    const admin = await db.user.findFirstOrThrow({ where: { role: { key: "SUPER_ADMIN" } } });
    const r = await refundOrder(order.id, order.totalPaise, "Customer changed mind", admin.id);
    expect(r.status).toBe("COMPLETED");
    expect((await db.discoveryCredit.findUniqueOrThrow({ where: { id: credit.id } })).status).toBe("VOID");
    expect((await db.order.findUniqueOrThrow({ where: { id: order.id } })).paymentStatus).toBe("REFUNDED");
    await expect(refundOrder(order.id, 100, "again", admin.id)).rejects.toThrow(/Only paid orders/);
  });
});

describe("coupons", () => {
  it("applies the test coupon within brand ceilings and enforces the per-customer limit", async () => {
    await db.coupon.create({ data: { code: "ONCE10", description: "test", type: "PERCENT", value: 10, perCustomerLimit: 1 } });
    const cart = await cartWith([["VA-09", 1], ["AN-03", 1]]);
    await db.cart.update({ where: { id: cart.id }, data: { couponCode: "ONCE10" } });
    const order = await createOrderFromCart(cart.id, address({ email: "coupon@example.test" }), { userId: null });
    expect(order.discountPaise).toBe(29500); // 10% of Vasana line only; Anvaya never discounted
    const cart2 = await cartWith([["VA-09", 1]]);
    await db.cart.update({ where: { id: cart2.id }, data: { couponCode: "ONCE10" } });
    await expect(createOrderFromCart(cart2.id, address({ email: "coupon@example.test" }), { userId: null })).rejects.toThrow(/already used/);
  });
});

describe("catalogue administration & B2B", () => {
  it("reflects a product update on the storefront catalogue", async () => {
    const p = await db.product.findUniqueOrThrow({ where: { slug: "tea-estate-eau-de-parfum" } });
    await db.product.update({ where: { id: p.id }, data: { shortDescription: "Updated by admin integration test." } });
    const card = (await getAllCards()).find((c) => c.id === p.id)!;
    expect(card.shortDescription).toBe("Updated by admin integration test.");
    await db.product.update({ where: { id: p.id }, data: { status: "ARCHIVED", deletedAt: new Date() } });
    expect((await getAllCards()).some((c) => c.id === p.id)).toBe(false);
    await db.product.update({ where: { id: p.id }, data: { status: "ACTIVE", deletedAt: null } });
  });

  it("stores a B2B enquiry with account, contact, activity and sample records", async () => {
    const e = await submitEnquiry({ kind: "SAMPLE", service: "PRIVATE_LABEL", companyName: "Test Salon Co", gstin: "", industry: "Salon", website: "", city: "Pune", name: "Asha", email: "asha@salon.test", phone: "", designation: "", summary: "We'd like three stock scents for evaluation.", quantity: "3", budget: "", timeline: "", sampleAddress: "Pune 411001", consent: true });
    const full = await db.b2BEnquiry.findUniqueOrThrow({ where: { id: e.id }, include: { account: true, contact: true, activities: true, samples: true } });
    expect(full.stage).toBe("LEAD");
    expect(full.account.companyName).toBe("Test Salon Co");
    expect(full.contact.email).toBe("asha@salon.test");
    expect(full.activities.length).toBe(1);
    expect(full.samples.length).toBe(1);
    expect(await db.messageLog.count({ where: { templateKey: "B2B_ENQUIRY_RECEIVED", recipient: "asha@salon.test", status: "NOT_CONFIGURED" } })).toBe(1);
  });
});
