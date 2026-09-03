/**
 * One-off backfill: adds the four Tier-2 dashboard metric collections
 * (hse_entries, commercial_summary, quality_summary, schedule_evm_weekly) to an
 * already-seeded project. The client seedIfEmpty() only runs on a truly empty
 * project, so the live rtpm--v2 project (seeded long before these existed) won't
 * pick them up on its own.
 *
 * Idempotent — skips a collection entirely if it already has rows for this
 * project, so it's safe to re-run.
 *
 * Usage:
 *   export GOOGLE_APPLICATION_CREDENTIALS=./serviceAccountKey.json
 *   npx ts-node --esm scripts/seed-dashboard-metrics.ts
 */
import { initializeApp, cert, applicationDefault } from "firebase-admin/app";
import { getFirestore } from "firebase-admin/firestore";
import { readFileSync, existsSync } from "node:fs";
import { SEED_PROJECT } from "../src/lib/seedData.ts";
import {
  SEED_HSE_ENTRIES,
  SEED_COMMERCIAL_SUMMARY,
  SEED_QUALITY_SUMMARY,
  SEED_SCHEDULE_EVM,
} from "../src/lib/dashboardMetrics.ts";

const KEY_PATH = process.env.GOOGLE_APPLICATION_CREDENTIALS || "./serviceAccountKey.json";

if (existsSync(KEY_PATH)) {
  const key = JSON.parse(readFileSync(KEY_PATH, "utf8"));
  initializeApp({ credential: cert(key) });
} else {
  initializeApp({ credential: applicationDefault() });
}

const db = getFirestore();

async function seedCollection(name: string, rows: Record<string, unknown>[]) {
  const existing = await db.collection(name).where("projectId", "==", SEED_PROJECT.id).limit(1).get();
  if (!existing.empty) {
    console.log(`  skip ${name} — already has rows for this project`);
    return;
  }
  const batch = db.batch();
  for (const row of rows) {
    batch.set(db.collection(name).doc(), { projectId: SEED_PROJECT.id, ...row });
  }
  await batch.commit();
  console.log(`  ${name}: ${rows.length} rows written`);
}

async function main() {
  console.log(`Backfilling dashboard metrics for "${SEED_PROJECT.name}"…`);
  await seedCollection("hse_entries", SEED_HSE_ENTRIES);
  await seedCollection("commercial_summary", SEED_COMMERCIAL_SUMMARY);
  await seedCollection("quality_summary", SEED_QUALITY_SUMMARY);
  await seedCollection("schedule_evm_weekly", SEED_SCHEDULE_EVM);
  console.log("Done.");
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
