import { expect, type Page } from "@playwright/test";

export const ADMIN = { email: "admin@fragrancehouse.test", password: "E2E-Admin-Pass-2026!" };

export async function register(page: Page, email: string, name = "E2E Customer") {
  await page.goto("/account/register");
  const f = page.getByTestId("register-form");
  await f.locator("input[name=name]").fill(name);
  await f.locator("input[name=email]").fill(email);
  await f.locator("input[name=password]").fill("E2E-Customer-Pass-1");
  await f.getByRole("button", { name: "Create account" }).click();
  await expect(page).toHaveURL(/\/account$/);
}

export async function login(page: Page, email: string, password: string, next = "/account") {
  await page.goto(`/account/login?next=${encodeURIComponent(next)}`);
  const f = page.getByTestId("login-form");
  await f.locator("input[name=email]").fill(email);
  await f.locator("input[name=password]").fill(password);
  await f.getByRole("button", { name: "Sign in" }).click();
}

export async function addFromPdp(page: Page, slug: string, sku?: string) {
  await page.goto(`/product/${slug}${sku ? `?sku=${sku}` : ""}`);
  const add = page.getByTestId("add-to-cart");
  await expect(add).toBeEnabled();
  await add.click();
  await expect(page.getByTestId("cart-drawer")).toBeVisible();
  await page.keyboard.press("Escape");
}

/** Fills checkout for a Mumbai address and places the order; lands on the sandbox payment page. */
export async function checkout(page: Page, email?: string) {
  await page.goto("/checkout");
  const form = page.locator("form").filter({ has: page.locator("input[name=idempotencyKey]") });
  if (email) await form.locator("input[name=email]").fill(email);
  await form.locator("input[name=phone]").fill("9876543210");
  await form.locator("input[name=name]").fill("E2E Buyer");
  await form.locator("input[name=line1]").fill("21 Test Street");
  await form.locator("input[name=pincode]").fill("400001");
  await expect(page.locator("#pin-status")).toContainText("Estimated delivery");
  await form.locator("input[name=city]").fill("Mumbai");
  await form.locator("select[name=state]").selectOption("Maharashtra");
  await form.getByRole("button", { name: /Place order/ }).click();
  await expect(page).toHaveURL(/\/checkout\/pay\//);
  await expect(page.getByTestId("sandbox")).toBeVisible();
}

export async function paySandbox(page: Page) {
  await page.getByTestId("sandbox-success").click();
  await expect(page).toHaveURL(/\/order\/FH-/);
  await expect(page.getByTestId("order-confirmed")).toBeVisible();
  return (await page.locator("h2").filter({ hasText: "Order FH-" }).first().innerText()).replace("Order ", "").trim();
}
