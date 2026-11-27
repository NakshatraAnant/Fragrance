import { test, expect } from "@playwright/test";
import { register } from "./helpers";

test("unauthenticated users are sent to sign in for admin and account areas", async ({ page }) => {
  await page.goto("/admin/orders");
  await expect(page).toHaveURL(/\/account\/login\?next=%2Fadmin%2Forders/);
  await page.goto("/account/wardrobe");
  await expect(page).toHaveURL(/\/account\/login/);
});

test("a customer cannot reach the admin control centre", async ({ page }) => {
  await register(page, `cust-${Date.now()}@example.test`);
  await page.goto("/admin");
  await expect(page).toHaveURL(/\/account$/);
  const res = await page.request.get("/admin/customers");
  expect(res.url()).not.toContain("/admin/customers");
});

test("APIs enforce authentication, validation and signatures", async ({ request }) => {
  expect((await request.get("/api/account/export")).status()).toBe(401);
  expect((await request.post("/api/reviews", { multipart: { productId: "x", rating: "5", title: "hi", body: "x" } })).status()).toBe(401);
  expect((await request.post("/api/payments/sandbox/webhook", { data: { eventId: "e", type: "payment.captured", orderId: "o", paymentId: "p", amountPaise: 1, method: "upi", issuedAt: 1 }, headers: { "x-sandbox-signature": "forged" } })).status()).toBe(401);
  expect((await request.post("/api/payments/razorpay/webhook", { data: { event: "payment.captured" }, headers: { "x-razorpay-signature": "forged" } })).status()).toBe(401);
  expect((await request.post("/api/cart", { data: { action: "add", variantId: "", quantity: 99 } })).status()).toBe(400);
});

test("orders can't be viewed without ownership or a valid access token", async ({ page }) => {
  const res = await page.goto("/order/FH-000000-XXXXX?t=forged");
  expect(res?.status()).toBe(404);
});

test("invalid forms show accessible errors", async ({ page }) => {
  await page.goto("/odaya/enquiry");
  await page.getByTestId("b2b-form").getByRole("button", { name: /Send enquiry/ }).click();
  await expect(page.getByText("Enter your company name.")).toBeVisible();
  await expect(page.getByTestId("b2b-form").locator("input[name=companyName]")).toHaveAttribute("aria-invalid", "true");
});

test("empty states and 404 render", async ({ page }) => {
  await page.goto("/cart");
  await expect(page.getByText("Your bag is empty")).toBeVisible();
  const r = await page.goto("/product/does-not-exist");
  expect(r?.status()).toBe(404);
  await expect(page.getByText("This page has evaporated.")).toBeVisible();
});
