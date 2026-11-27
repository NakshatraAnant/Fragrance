import { execSync } from "node:child_process";

/** Creates a fresh, seeded throwaway SQLite database (prisma/test.db) before the suite runs. */
export default function setup() {
  execSync("node scripts/prepare-test-db.mjs test.db", { stdio: "pipe", env: { ...process.env, SEED_TEST_DATA: "true", ADMIN_SEED_PASSWORD: "Test-Admin-Pass-2026!" } });
}
