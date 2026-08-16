/**
 * One-off production migration (Group G: Risk Matrix Credibility Pass):
 * backfills explicit Likelihood x Impact scoring onto every risks doc that
 * predates it, using its existing manually-set `priority` as the basis so
 * nothing visually jumps priority band on backfill (e.g. Critical -> a
 * likelihood/impact pair that scores back into the Critical band). Also
 * backfills `kind` and `mitigationPlan` on the same docs — those were added
 * in earlier passes but never backfilled onto this project's live data.
 *
 * Surgical field-level patch, not a full-document overwrite — every other
 * field on each risk doc (title, status, notes, checklist, statusHistory,
 * attachments, etc.) is left untouched. Safe to re-run: skips any doc that
 * already has a numeric `likelihood` field.
 *
 * Usage:
 *   export GOOGLE_APPLICATION_CREDENTIALS=./serviceAccountKey.json
 *   npx ts-node --esm scripts/migrate-risk-scoring.ts
 */
import { initializeApp, cert, applicationDefault } from "firebase-admin/app";
import { getFirestore } from "firebase-admin/firestore";
import { readFileSync, existsSync } from "node:fs";
import { SEED_PROJECT } from "../src/lib/seedData.ts";
import { backfillScoring } from "../src/lib/riskScoring.ts";

const KEY_PATH = process.env.GOOGLE_APPLICATION_CREDENTIALS || "./serviceAccountKey.json";

if (existsSync(KEY_PATH)) {
  const key = JSON.parse(readFileSync(KEY_PATH, "utf8"));
  initializeApp({ credential: cert(key) });
} else {
  initializeApp({ credential: applicationDefault() });
}

const db = getFirestore();

async function main() {
  console.log(`Backfilling risk scoring for "${SEED_PROJECT.name}"…`);

  const snap = await db.collection("risks").where("projectId", "==", SEED_PROJECT.id).get();

  let patched = 0;
  let skipped = 0;
  for (const doc of snap.docs) {
    const data = doc.data();
    if (typeof data.likelihood === "number") {
      skipped++;
      continue;
    }
    const priority = data.priority || "medium";
    const scoring = backfillScoring(priority, `${data.title || ""} ${data.notes || ""}`);
    await doc.ref.update({
      likelihood: scoring.likelihood,
      impactScore: scoring.impactScore,
      riskScore: scoring.riskScore,
      priority: scoring.priority,
      impactDriver: scoring.impactDriver,
      trend: scoring.trend,
      kind: data.kind || "risk",
      mitigationPlan: data.mitigationPlan || "",
    });
    patched++;
    console.log(
      `  ${data.riskId || doc.id}: priority ${priority} -> likelihood ${scoring.likelihood}, impact ${scoring.impactScore}, score ${scoring.riskScore} (${scoring.priority}), driver ${scoring.impactDriver}`
    );
  }

  console.log(`Patched ${patched} risk docs, skipped ${skipped} already-scored.`);
  console.log("Done.");
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
