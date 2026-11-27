import { defineConfig, devices } from "@playwright/test";

// E2E runs against a production build on port 3100 using an isolated e2e database.
export default defineConfig({
  testDir: "e2e",
  timeout: 60_000,
  expect: { timeout: 10_000 },
  fullyParallel: false,
  workers: 1,
  retries: 0,
  reporter: [["list"]],
  use: { baseURL: "http://localhost:3100", trace: "retain-on-failure" },
  projects: [
    { name: "desktop", use: { ...devices["Desktop Chrome"] } },
    { name: "mobile", use: { ...devices["Pixel 7"] }, testMatch: /mobile\.spec\.ts/ },
  ],
  webServer: {
    command: "node scripts/prepare-test-db.mjs e2e.db && npx next start -p 3100",
    url: "http://localhost:3100",
    timeout: 180_000,
    reuseExistingServer: false,
    env: { DATABASE_URL: "file:./e2e.db", PAYMENTS_SANDBOX_ENABLED: "true", SEED_TEST_DATA: "true", ADMIN_SEED_PASSWORD: "E2E-Admin-Pass-2026!", SESSION_SECRET: "e2e-session-secret", PAYMENTS_SANDBOX_SECRET: "e2e-sandbox-secret", APP_URL: "http://localhost:3100" },
  },
});
