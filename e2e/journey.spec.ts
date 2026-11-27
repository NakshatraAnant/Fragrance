import { test, expect } from "@playwright/test";
import { ADMIN, addFromPdp, checkout, login, paySandbox, register } from "./helpers";

/**
 * The complete customer journey from the brief, run sequentially against a production build with
 * an isolated, freshly-seeded database and the signed local payment sandbox.
 */
test.describe.configure({ mode: "serial" });

const email = `e2e-${Date.now()}@example.test`;

test("1–2 · homepage and a brand storefront render", async ({ page }) => {
  await page.goto("/");
  await expect(page.getByRole("heading", { level: 1 })).toContainText("India's own perfume house");
  await page.getByRole("link", { name: /Enter the house/ }).first().click();
  await expect(page).toHaveURL(/\/(dhun|vasana|anvaya)$/);
  await page.goto("/vasana");
  await expect(page.getByRole("heading", { level: 1 })).toContainText("Vasana");
});

test("3 · search finds catalogue products, including Indian vocabulary", async ({ page }) => {
  await page.goto("/search?q=mogra");
  await expect(page.getByTestId("search-count")).toBeVisible();
  await expect(page.locator('[data-slug="mogra-hour-eau-de-parfum"]')).toBeVisible();
  await page.goto("/search?q=" + encodeURIComponent("Perfume gift under ₹3,000"));
  await expect(page.getByText(/Searching for:.*under ₹3,000/)).toBeVisible();
  await expect(page.getByTestId("search-count")).toBeVisible();
});

test("4 · filters narrow the listing", async ({ page }) => {
  await page.goto("/shop");
  const count = page.getByTestId("result-count");
  await expect(count).toHaveText(/55 products/);
  await page.getByRole("complementary", { name: "Filters" }).getByRole("button", { name: /Earthy & Petrichor/ }).click();
  await expect(page).toHaveURL(/family=earthy/);
  await expect(count).not.toHaveText(/55 products/);
  await expect(page.locator('[data-slug="first-rain-eau-de-parfum"]')).toBeVisible();
});

test("5–12 · PDP, size, wishlist, cart, discovery credit, sandbox purchase, confirmation, history", async ({ page }) => {
  await register(page, email);

  // Buy a discovery set first so a credit is genuinely issued by a verified payment.
  await addFromPdp(page, "vasana-discovery-set");
  await checkout(page);
  await paySandbox(page);
  await expect(page.getByTestId("credit-issued")).toContainText("₹1,250");

  // 5–6 · open PDP and select the 100 ml size
  await page.goto("/shop?family=earthy");
  await page.locator('[data-slug="first-rain-eau-de-parfum"] h3').click();
  await expect(page.getByTestId("product-name")).toHaveText("First Rain");
  await page.getByTestId("variant-VA-04").click();
  await expect(page.getByTestId("price")).toHaveText("₹4,250");
  await expect(page).toHaveURL(/sku=VA-04/);

  // 7 · wishlist
  await page.getByRole("button", { name: "Add First Rain to wishlist" }).first().click();
  await expect(page.getByRole("button", { name: "Remove First Rain from wishlist" }).first()).toBeVisible();

  // 8 · add to cart
  await page.getByTestId("add-to-cart").click();
  await expect(page.getByTestId("cart-drawer")).toContainText("First Rain");
  await page.keyboard.press("Escape");

  // 9 · apply the eligible discovery credit
  await page.goto("/cart");
  await page.getByTestId("credit-option").first().click(); // controlled radio: state updates after the server confirms
  await expect(page.getByTestId("credit-applied")).toHaveText("−₹1,250");
  await expect(page.getByTestId("order-total")).toHaveText("₹3,000");

  // 10–11 · sandbox purchase and confirmation
  await checkout(page);
  await expect(page.getByTestId("pay-total")).toHaveText("₹3,000");
  const number = await paySandbox(page);

  // 12 · order history
  await page.goto("/account/orders");
  await expect(page.getByTestId("order-history")).toContainText(number);
  await page.goto("/wishlist");
  await expect(page.getByTestId("wishlist")).toContainText("First Rain");
});

test("payment failure is shown and retry succeeds", async ({ page }) => {
  await addFromPdp(page, "neon-nimbu-eau-de-parfum");
  await checkout(page, `fail-${Date.now()}@example.test`);
  await page.getByTestId("sandbox-failure").click();
  await expect(page.getByTestId("payment-failed")).toBeVisible();
  await paySandbox(page);
});

test("13–14 · admin updates a product and the storefront reflects it", async ({ page }) => {
  await login(page, ADMIN.email, ADMIN.password, "/admin/products?q=tea-estate-eau");
  await expect(page).toHaveURL(/\/admin\/products/);
  await page.getByRole("link", { name: "Tea Estate", exact: true }).click();
  const text = `Darjeeling first flush, updated ${Date.now()}.`;
  await page.getByTestId("product-form").locator("textarea[name=shortDescription]").fill(text);
  await page.getByTestId("save-product").click();
  await expect(page.getByTestId("admin-flash")).toContainText("Product saved");
  await page.goto("/product/tea-estate-eau-de-parfum");
  await expect(page.getByText(text)).toBeVisible();
});

test("15–16 · Scent Finder produces explained recommendations", async ({ page }) => {
  await page.goto("/scent-finder");
  await page.getByTestId("finder-start").click();
  await page.getByRole("button", { name: "Earthy & Petrichor", exact: false }).click();
  for (let i = 0; i < 9; i++) await page.getByTestId("finder-next").click();
  await page.getByTestId("finder-next").click(); // "See my matches"
  await expect(page).toHaveURL(/\/scent-finder\/results\//);
  await expect(page.getByTestId("personality")).toBeVisible();
  const matches = page.getByTestId("matches").locator("li");
  await expect(matches.first()).toBeVisible();
  expect(await matches.count()).toBeGreaterThan(0);
  await expect(page.getByTestId("matches")).toContainText("% match");
});

test("17 · B2B enquiry is submitted and stored", async ({ page }) => {
  await page.goto("/odaya/quote");
  const f = page.getByTestId("b2b-form");
  await f.locator("input[name=companyName]").fill("E2E Hotels Pvt Ltd");
  await f.locator("input[name=name]").fill("Priya");
  await f.locator("input[name=email]").fill("priya@hotels.test");
  await f.locator("textarea[name=summary]").fill("Signature scent and diffusion for 12 hotel lobbies.");
  await f.locator("input[name=consent]").check();
  await f.getByRole("button", { name: /Submit request for quote/ }).click();
  await expect(page.getByTestId("b2b-success")).toContainText(/OD-\d{4}-/);
  // Visible to the business team in the pipeline
  await login(page, ADMIN.email, ADMIN.password, "/admin/b2b");
  await expect(page.getByTestId("b2b-board")).toContainText("E2E Hotels Pvt Ltd");
});
