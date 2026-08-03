/**
 * One-off backfill: adds demo Correspondence items to an already-seeded
 * project. The client-side seedIfEmpty() only ever runs once (it checks the
 * `projects` collection is empty), so a live project seeded before the
 * Correspondence module existed won't pick up SEED_CORRESPONDENCE on its own.
 *
 * Idempotent — skips any itemId that already exists, so it's safe to re-run.
 *
 * Usage:
 *   export GOOGLE_APPLICATION_CREDENTIALS=./serviceAccountKey.json
 *   npx ts-node --esm scripts/seed-correspondence.ts
 */
import { initializeApp, cert, applicationDefault } from "firebase-admin/app";
import { getFirestore, Timestamp, FieldValue } from "firebase-admin/firestore";
import { readFileSync, existsSync } from "node:fs";
import { SEED_PROJECT, SEED_CORRESPONDENCE } from "../src/lib/seedData.ts";

const KEY_PATH = process.env.GOOGLE_APPLICATION_CREDENTIALS || "./serviceAccountKey.json";

if (existsSync(KEY_PATH)) {
  const key = JSON.parse(readFileSync(KEY_PATH, "utf8"));
  initializeApp({ credential: cert(key) });
} else {
  initializeApp({ credential: applicationDefault() });
}

const db = getFirestore();

async function main() {
  console.log(`Backfilling Correspondence items for "${SEED_PROJECT.name}"…`);

  const existing = await db
    .collection("correspondence")
    .where("projectId", "==", SEED_PROJECT.id)
    .get();
  const existingIds = new Set(existing.docs.map((d) => d.data().itemId));

  const now = Date.now();
  let written = 0;
  for (const item of SEED_CORRESPONDENCE) {
    if (existingIds.has(item.itemId)) {
      console.log(`  skip ${item.itemId} — already exists`);
      continue;
    }
    await db.collection("correspondence").add({
      projectId: SEED_PROJECT.id,
      itemId: item.itemId,
      type: item.type,
      title: item.title,
      status: item.status,
      priority: item.priority,
      startDate: Timestamp.fromMillis(now),
      dueDate: Timestamp.fromMillis(now + item.dueOffsetDays * 86400000),
      workstreamIds: item.workstreamIds,
      checklist: item.checklist,
      notes: item.notes,
      attachments: [],
      statusHistory: [],
      createdBy: "seed-script",
      createdAt: FieldValue.serverTimestamp(),
      updatedAt: FieldValue.serverTimestamp(),
    });
    written++;
  }
  console.log(`  ${written} correspondence item(s) written (${existingIds.size} already present)`);
  console.log("Done.");
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
