/**
 * One-off production migration, surgical (field-level patches only — does NOT
 * re-seed/overwrite whole documents, so any live edits made via the app's
 * RoleDrawer since the initial seed are preserved):
 *
 *  - organizations/wsp-denmark: rename "NT Advisor" -> "Project Partner A/S"
 *    and roleType "Advisor" -> "Customer Representative"
 *  - roles_and_responsibilities: patch every Party.organization field
 *    (accountable, consulted[], responsibleCustomer, responsibleContractor,
 *    informedCustomer[], informedContractor[]) equal to "NT Advisor" to
 *    "Project Partner A/S" — only the organization string, every other field
 *    untouched
 *
 * Safe to re-run: every write is conditional on the old value still being
 * present, so a second run against already-migrated data is a no-op.
 *
 * Usage:
 *   export GOOGLE_APPLICATION_CREDENTIALS=./serviceAccountKey.json
 *   npx ts-node --esm scripts/migrate-project-partner.ts
 */
import { initializeApp, cert, applicationDefault } from "firebase-admin/app";
import { getFirestore } from "firebase-admin/firestore";
import { readFileSync, existsSync } from "node:fs";
import { SEED_PROJECT } from "../src/lib/seedData.ts";

const KEY_PATH = process.env.GOOGLE_APPLICATION_CREDENTIALS || "./serviceAccountKey.json";

if (existsSync(KEY_PATH)) {
  const key = JSON.parse(readFileSync(KEY_PATH, "utf8"));
  initializeApp({ credential: cert(key) });
} else {
  initializeApp({ credential: applicationDefault() });
}

const db = getFirestore();

const OLD_NAME = "NT Advisor";
const NEW_NAME = "Project Partner A/S";
const NEW_ROLE_TYPE = "Customer Representative";

interface Party {
  name: string;
  organization: string;
  role: string;
}

function renameParty(p: Party | null): Party | null {
  if (!p || p.organization !== OLD_NAME) return p;
  return { ...p, organization: NEW_NAME };
}

async function main() {
  console.log(`Migrating "${SEED_PROJECT.name}": ${OLD_NAME} -> ${NEW_NAME}…`);

  // 1. organizations/wsp-denmark name + roleType.
  const orgRef = db.collection("organizations").doc("wsp-denmark");
  const orgSnap = await orgRef.get();
  if (orgSnap.exists && orgSnap.data()?.name === OLD_NAME) {
    await orgRef.update({ name: NEW_NAME, roleType: NEW_ROLE_TYPE });
    console.log(`  organizations/wsp-denmark: name -> ${NEW_NAME}, roleType -> ${NEW_ROLE_TYPE}`);
  } else {
    console.log("  organizations/wsp-denmark: already up to date, skipped");
  }

  // 2. roles_and_responsibilities Party.organization fields.
  const rolesSnap = await db
    .collection("roles_and_responsibilities")
    .where("projectId", "==", SEED_PROJECT.id)
    .get();

  let patched = 0;
  for (const doc of rolesSnap.docs) {
    const data = doc.data();
    const next = {
      accountable: renameParty(data.accountable),
      consulted: (data.consulted || []).map(renameParty),
      responsibleCustomer: renameParty(data.responsibleCustomer),
      responsibleContractor: renameParty(data.responsibleContractor),
      informedCustomer: (data.informedCustomer || []).map(renameParty),
      informedContractor: (data.informedContractor || []).map(renameParty),
    };
    const changed =
      JSON.stringify(next) !==
      JSON.stringify({
        accountable: data.accountable,
        consulted: data.consulted || [],
        responsibleCustomer: data.responsibleCustomer,
        responsibleContractor: data.responsibleContractor,
        informedCustomer: data.informedCustomer || [],
        informedContractor: data.informedContractor || [],
      });
    if (changed) {
      await doc.ref.update(next);
      patched++;
    }
  }
  console.log(`  patched ${OLD_NAME} -> ${NEW_NAME} on ${patched}/${rolesSnap.size} roles_and_responsibilities docs`);

  console.log("Done.");
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
