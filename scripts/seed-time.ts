/**
 * One-off backfill: adds demo Time Log entries to an already-seeded project.
 * The client-side seedIfEmpty() only ever runs once, so a live project seeded
 * before the Time Log module existed won't pick up SEED_TIME_ENTRIES on its own.
 *
 * Idempotent — skips any entryId that already exists, so it's safe to re-run.
 *
 * Usage:
 *   export GOOGLE_APPLICATION_CREDENTIALS=./serviceAccountKey.json
 *   npx ts-node --esm scripts/seed-time.ts
 */
import { initializeApp, cert, applicationDefault } from "firebase-admin/app";
import { getFirestore, Timestamp, FieldValue } from "firebase-admin/firestore";
import { readFileSync, existsSync } from "node:fs";
import { SEED_PROJECT, SEED_TIME_ENTRIES } from "../src/lib/seedData.ts";

const KEY_PATH = process.env.GOOGLE_APPLICATION_CREDENTIALS || "./serviceAccountKey.json";

if (existsSync(KEY_PATH)) {
  const key = JSON.parse(readFileSync(KEY_PATH, "utf8"));
  initializeApp({ credential: cert(key) });
} else {
  initializeApp({ credential: applicationDefault() });
}

const db = getFirestore();

async function main() {
  console.log(`Backfilling Time Log entries for "${SEED_PROJECT.name}"…`);

  const existing = await db
    .collection("time_entries")
    .where("projectId", "==", SEED_PROJECT.id)
    .get();
  const existingIds = new Set(existing.docs.map((d) => d.data().entryId));

  const now = Date.now();
  let written = 0;
  for (const entry of SEED_TIME_ENTRIES) {
    if (existingIds.has(entry.entryId)) {
      console.log(`  skip ${entry.entryId} — already exists`);
      continue;
    }
    await db.collection("time_entries").add({
      projectId: SEED_PROJECT.id,
      entryId: entry.entryId,
      date: Timestamp.fromMillis(now + entry.dateOffsetDays * 86400000),
      personName: entry.personName,
      personOrg: entry.personOrg,
      workstreamId: entry.workstreamId,
      activity: entry.activity,
      category: entry.category,
      hours: entry.hours,
      billable: entry.billable,
      status: entry.status,
      notes: entry.notes,
      createdBy: "seed-script",
      createdAt: FieldValue.serverTimestamp(),
      updatedAt: FieldValue.serverTimestamp(),
    });
    written++;
  }
  console.log(`  ${written} time entr(ies) written (${existingIds.size} already present)`);
  console.log("Done.");
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
