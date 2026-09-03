/**
 * One-off production migration: Owner/Employer -> Customer rename +
 * roles_and_responsibilities schema replacement (flat RACI rows ->
 * one doc per workstream) + new organizations collection for the Org Chart.
 *
 * Safe to re-run: doc writes use fixed IDs (idempotent), and the risk
 * workstreamIds patch only rewrites IDs found in OLD_TO_NEW below, so a
 * second run against already-migrated data is a no-op.
 *
 * Usage:
 *   export GOOGLE_APPLICATION_CREDENTIALS=./serviceAccountKey.json
 *   npx ts-node --esm scripts/migrate-customer-rr.ts
 */
import { initializeApp, cert, applicationDefault } from "firebase-admin/app";
import { getFirestore } from "firebase-admin/firestore";
import { readFileSync, existsSync } from "node:fs";
import {
  SEED_PROJECT,
  SEED_ROLES,
  SEED_ORGANIZATIONS,
} from "../src/lib/seedData.ts";

const KEY_PATH = process.env.GOOGLE_APPLICATION_CREDENTIALS || "./serviceAccountKey.json";

if (existsSync(KEY_PATH)) {
  const key = JSON.parse(readFileSync(KEY_PATH, "utf8"));
  initializeApp({ credential: cert(key) });
} else {
  initializeApp({ credential: applicationDefault() });
}

const db = getFirestore();

const OLD_RR_IDS = ["rr-001", "rr-002", "rr-003", "rr-004", "rr-005"];

// Old flat RACI-row id -> new per-workstream doc id.
const OLD_TO_NEW: Record<string, string> = {
  "rr-001": "civil-works",
  "rr-003": "civil-works",
  "rr-002": "mep-infrastructure",
  "rr-005": "mep-infrastructure",
  "rr-004": "it-data-infrastructure",
};

async function main() {
  console.log(`Migrating project "${SEED_PROJECT.name}" to Customer-naming R&R schema…`);

  // 1. Delete old flat RACI-row docs — the known fixed IDs, plus any other
  //    doc in the collection still using the legacy shape (e.g. rows created
  //    via the old "Add entry" button, which got a random Firestore doc ID).
  const rrSnap = await db.collection("roles_and_responsibilities").get();
  let deleted = 0;
  for (const doc of rrSnap.docs) {
    const isLegacyId = OLD_RR_IDS.includes(doc.id);
    const isLegacyShape = doc.data().accountable === undefined;
    if (isLegacyId || isLegacyShape) {
      await doc.ref.delete();
      deleted++;
    }
  }
  console.log(`  deleted ${deleted} legacy R&R rows`);

  // 2. Write the 6 new per-workstream docs.
  for (const role of SEED_ROLES) {
    await db.collection("roles_and_responsibilities").doc(role.id).set({
      projectId: SEED_PROJECT.id,
      workstream: role.workstream,
      accountable: role.accountable,
      consulted: role.consulted,
      responsibleCustomer: role.responsibleCustomer,
      responsibleContractor: role.responsibleContractor,
      informedCustomer: role.informedCustomer,
      informedContractor: role.informedContractor,
      description: role.description,
    });
  }
  console.log(`  wrote ${SEED_ROLES.length} new R&R workstream docs`);

  // 3. Write the organizations collection.
  for (const org of SEED_ORGANIZATIONS) {
    await db.collection("organizations").doc(org.orgId).set({
      projectId: SEED_PROJECT.id,
      orgId: org.orgId,
      name: org.name,
      tier: org.tier,
      parentOrgId: org.parentOrgId,
      contractType: org.contractType,
      roleType: org.roleType,
    });
  }
  console.log(`  wrote ${SEED_ORGANIZATIONS.length} organizations`);

  // 4. Patch workstreamIds on existing risks — only remap IDs we recognize,
  //    leave everything else on each risk doc untouched.
  const risksSnap = await db
    .collection("risks")
    .where("projectId", "==", SEED_PROJECT.id)
    .get();

  let patched = 0;
  for (const doc of risksSnap.docs) {
    const current: string[] = doc.data().workstreamIds || [];
    const next = [...new Set(current.map((id) => OLD_TO_NEW[id] ?? id))];
    const changed =
      next.length !== current.length || next.some((id, i) => id !== current[i]);
    if (changed) {
      await doc.ref.update({ workstreamIds: next });
      patched++;
    }
  }
  console.log(`  patched workstreamIds on ${patched}/${risksSnap.size} risks`);

  console.log("Done.");
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
