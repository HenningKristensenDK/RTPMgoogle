/**
 * One-off production migration:
 *  - organizations: rename orgs, renumber tiers (0/1/2), drop contractType
 *  - roles_and_responsibilities: patch in place with the interactionSummary
 *    field, informedCustomer/informedContractor as arrays, and the
 *    genericized people/org names
 *
 * Uses .set() (full overwrite) on the existing doc IDs so removed fields
 * (contractType) are actually dropped, while doc IDs — and therefore all
 * existing references (risk.workstreamIds, org.parentOrgId) — stay stable.
 *
 * Usage:
 *   export GOOGLE_APPLICATION_CREDENTIALS=./serviceAccountKey.json
 *   npx ts-node --esm scripts/migrate-raci-orgs.ts
 */
import { initializeApp, cert, applicationDefault } from "firebase-admin/app";
import { getFirestore } from "firebase-admin/firestore";
import { readFileSync, existsSync } from "node:fs";
import { SEED_PROJECT, SEED_ROLES, SEED_ORGANIZATIONS } from "../src/lib/seedData.ts";

const KEY_PATH = process.env.GOOGLE_APPLICATION_CREDENTIALS || "./serviceAccountKey.json";

if (existsSync(KEY_PATH)) {
  const key = JSON.parse(readFileSync(KEY_PATH, "utf8"));
  initializeApp({ credential: cert(key) });
} else {
  initializeApp({ credential: applicationDefault() });
}

const db = getFirestore();

async function main() {
  console.log(`Migrating "${SEED_PROJECT.name}" organizations + R&R RACI schema…`);

  for (const org of SEED_ORGANIZATIONS) {
    await db.collection("organizations").doc(org.orgId).set({
      projectId: SEED_PROJECT.id,
      orgId: org.orgId,
      name: org.name,
      tier: org.tier,
      parentOrgId: org.parentOrgId,
      roleType: org.roleType,
    });
  }
  console.log(`  wrote ${SEED_ORGANIZATIONS.length} organizations (renamed, tiers 0/1/2, contractType dropped)`);

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
      interactionSummary: role.interactionSummary,
    });
  }
  console.log(`  wrote ${SEED_ROLES.length} R&R workstream docs`);

  console.log("Done.");
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
