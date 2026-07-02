/**
 * Standalone Firestore seed script (admin SDK).
 *
 * Usage:
 *   export GOOGLE_APPLICATION_CREDENTIALS=./serviceAccountKey.json
 *   npm run seed
 *
 * Requires a service account key with Firestore access. This seeds the same
 * demo data the client-side first-run seeder uses, but is safe to run against
 * a real (non-emulator) project for initial provisioning.
 */
import { initializeApp, cert, applicationDefault } from "firebase-admin/app";
import { getFirestore, Timestamp, FieldValue } from "firebase-admin/firestore";
import { readFileSync, existsSync } from "node:fs";
import {
  SEED_PROJECT,
  SEED_ROLES,
  SEED_ORGANIZATIONS,
  SEED_RISKS,
} from "../src/lib/seedData.ts";

const KEY_PATH = process.env.GOOGLE_APPLICATION_CREDENTIALS || "./serviceAccountKey.json";

if (existsSync(KEY_PATH)) {
  const key = JSON.parse(readFileSync(KEY_PATH, "utf8"));
  initializeApp({ credential: cert(key) });
} else {
  // Falls back to application default credentials (e.g. gcloud auth).
  initializeApp({ credential: applicationDefault() });
}

const db = getFirestore();

async function main() {
  console.log(`Seeding project "${SEED_PROJECT.name}"…`);

  // Project
  await db.collection("projects").doc(SEED_PROJECT.id).set({
    name: SEED_PROJECT.name,
    description: SEED_PROJECT.description,
    createdAt: FieldValue.serverTimestamp(),
  });

  // Roles & responsibilities
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
  console.log(`  ${SEED_ROLES.length} R&R entries written`);

  // Organizations (Org Chart)
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
  console.log(`  ${SEED_ORGANIZATIONS.length} organizations written`);

  // Risks
  const now = Date.now();
  for (const risk of SEED_RISKS) {
    await db.collection("risks").add({
      projectId: SEED_PROJECT.id,
      riskId: risk.riskId,
      title: risk.title,
      status: risk.status,
      priority: risk.priority,
      startDate: Timestamp.fromMillis(now),
      dueDate: Timestamp.fromMillis(now + risk.dueOffsetDays * 86400000),
      recurrence: risk.recurrence,
      collection: SEED_PROJECT.name,
      workstreamIds: risk.workstreamIds,
      checklist: risk.checklist,
      notes: risk.notes,
      attachments: [],
      statusHistory: [],
      createdBy: "seed-script",
      createdAt: FieldValue.serverTimestamp(),
      updatedAt: FieldValue.serverTimestamp(),
    });
  }
  console.log(`  ${SEED_RISKS.length} risks written`);
  console.log("Done.");
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
