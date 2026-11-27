import { defineConfig, devices } from "@playwright/test";

/**
 * E2E runs against a production build (`npm run build` first) on port 3217, with an isolated,
 * freshly-seeded e2e database and the signed local payment sandbox.
 *
 * Browser: the locally installed Microsoft Edge by default (no download needed on Windows).
 * Set PW_CHANNEL="" to use Playwright's bundled Chromium instead (run `npx playwright install chromium`).
 */
const channel = process.env.PW_CHANNEL ?? "msedge";

export default defineConfig({
  testDir: "e2e",
  timeout: 90_000,
  expect: { timeout: 15_000 },
  fullyParallel: false,
  workers: 1,
  retries: 0,
  reporter: [["list"]],
  use: { baseURL: "http://localhost:3217", trace: "retain-on-failure", ...(channel ? { channel } : {}) },
  projects: [
    { name: "desktop", use: { ...devices["Desktop Chrome"], ...(channel ? { channel } : {}) }, testIgnore: /mobile\.spec\.ts/ },
    { name: "mobile", use: { ...devices["Pixel 7"], ...(channel ? { channel } : {}) }, testMatch: /mobile\.spec\.ts/ },
  ],
  webServer: {
    command: "node scripts/prepare-test-db.mjs e2e.db && npx next start -p 3217",
    url: "http://localhost:3217",
    timeout: 180_000,
    reuseExistingServer: false,
    env: { DATABASE_URL: "file:./e2e.db", PAYMENTS_SANDBOX_ENABLED: "true", SEED_TEST_DATA: "true", ADMIN_SEED_PASSWORD: "E2E-Admin-Pass-2026!", SESSION_SECRET: "e2e-session-secret", PAYMENTS_SANDBOX_SECRET: "e2e-sandbox-secret", APP_URL: "http://localhost:3217" },
  },
});
