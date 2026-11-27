import { test, expect } from "@playwright/test";

test("mobile: navigation, filters, sticky purchase and bottom nav", async ({ page }) => {
  await page.goto("/");
  await expect(page.getByRole("navigation", { name: "Mobile" })).toBeVisible();
  await page.getByRole("button", { name: "Open menu" }).click();
  await expect(page.getByRole("dialog", { name: "Menu" })).toBeVisible();
  await page.getByRole("dialog", { name: "Menu" }).getByRole("link", { name: "Shop all" }).click();
  await expect(page).toHaveURL(/\/shop/);

  await page.getByTestId("open-filters").click();
  const sheet = page.getByRole("dialog", { name: "Filters" });
  await expect(sheet).toBeVisible();
  await sheet.getByRole("button", { name: /Dhun/ }).first().click();
  await expect(page).toHaveURL(/brand=dhun/);

  await page.goto("/product/oud-rush-eau-de-parfum");
  await expect(page.getByRole("link", { name: "Choose & add" })).toBeVisible();
  await page.getByTestId("add-to-cart").click();
  await expect(page.getByTestId("cart-drawer")).toBeVisible();

  // No horizontal overflow at phone width
  const overflow = await page.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth);
  expect(overflow).toBeLessThanOrEqual(1);
});
