// Creates a fresh throwaway SQLite database for automated tests (test.db / e2e.db only).
// Usage: node scripts/prepare-test-db.mjs <test.db|e2e.db>
import { rmSync } from "node:fs";
import { execSync } from "node:child_process";
const name = process.argv[2];
if (!/^(test|e2e)\.db$/.test(name ?? "")) { console.error("Refusing: only test.db or e2e.db may be recreated."); process.exit(1); }
for (const suffix of ["", "-journal", "-wal", "-shm"]) rmSync(`prisma/${name}${suffix}`, { force: true });
const env = { ...process.env, DATABASE_URL: `file:./${name}` };
execSync("npx prisma db push --skip-generate", { stdio: "pipe", env });
execSync("npx tsx prisma/seed.ts", { stdio: "pipe", env });
console.log(`Prepared prisma/${name}`);
