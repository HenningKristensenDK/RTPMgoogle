/**
 * One-off production migration for the new tier model / RACI structure:
 *  - organizations: move NT Advisor (wsp-denmark) from tier 1 to tier 0,
 *    add new Tier 3 vendor (eq-supplier)
 *  - roles_and_responsibilities: consulted becomes an array of people
 *    instead of a single party; add the new Tier 3 vendor as an
 *    informedContractor entry on the workstreams that reference it
 *
 * Uses .set() (full overwrite) on the existing doc IDs so field shape
 * changes (single object -> array) actually take effect, while doc IDs —
 * and therefore all existing references (risk.workstreamIds,
 * org.parentOrgId) — stay stable.
 *
 * Usage:
 *   export GOOGLE_APPLICATION_CREDENTIALS=./serviceAccountKey.json
 *   npx ts-node --esm scripts/migrate-tier-model.ts
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
  console.log(`Migrating "${SEED_PROJECT.name}" to the new tier model / RACI structure…`);

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
  console.log(`  wrote ${SEED_ORGANIZATIONS.length} organizations (NT Advisor -> tier 0, new eq-supplier tier 3)`);

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
  console.log(`  wrote ${SEED_ROLES.length} R&R workstream docs (consulted is now an array)`);

  console.log("Done.");
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
