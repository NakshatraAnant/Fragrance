import { defineConfig } from "vitest/config";
import path from "node:path";

export default defineConfig({
  resolve: { alias: { "@": path.resolve(import.meta.dirname, "src"), "@data": path.resolve(import.meta.dirname, "data") } },
  test: {
    environment: "node",
    include: ["tests/**/*.test.ts"],
    globalSetup: ["tests/global-setup.ts"],
    env: { DATABASE_URL: "file:./test.db", NODE_ENV: "test", SESSION_SECRET: "test-session-secret-not-for-production", PAYMENTS_SANDBOX_SECRET: "test-sandbox-secret" },
    fileParallelism: false,
    testTimeout: 30000,
    hookTimeout: 120000,
  },
});
