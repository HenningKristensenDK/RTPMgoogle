/**
 * One-off production migration, surgical (field-level patches only — does NOT
 * re-seed/overwrite whole documents, so any live edits made via the app's
 * RoleDrawer since the initial seed are preserved):
 *
 *  - organizations/customer: rename "Customer PMO" -> "Customer"
 *  - organizations/eq-supplier: re-parent under "nordic-fitout" (FO
 *    Sub-Contractor) instead of "mt-hojgaard" (HD Contractor), so the OBS
 *    diagram draws a Contract connector between FO Sub-Contractor and EQ
 *    Supplier instead of skipping straight from HD Contractor to EQ Supplier
 *  - roles_and_responsibilities: patch every Party.organization field
 *    (accountable, consulted[], responsibleCustomer, responsibleContractor,
 *    informedCustomer[], informedContractor[]) equal to "Customer PMO" to
 *    "Customer" — only the organization string, every other field untouched
 *
 * Safe to re-run: every write is conditional on the old value still being
 * present, so a second run against already-migrated data is a no-op.
 *
 * Usage:
 *   export GOOGLE_APPLICATION_CREDENTIALS=./serviceAccountKey.json
 *   npx ts-node --esm scripts/migrate-customer-name-and-eq-parent.ts
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

const OLD_CUSTOMER_NAME = "Customer PMO";
const NEW_CUSTOMER_NAME = "Customer";

interface Party {
  name: string;
  organization: string;
  role: string;
}

function renameParty(p: Party | null): Party | null {
  if (!p || p.organization !== OLD_CUSTOMER_NAME) return p;
  return { ...p, organization: NEW_CUSTOMER_NAME };
}

async function main() {
  console.log(`Migrating "${SEED_PROJECT.name}": Customer PMO -> Customer, EQ Supplier re-parent…`);

  // 1. organizations/customer name.
  const customerRef = db.collection("organizations").doc("customer");
  const customerSnap = await customerRef.get();
  if (customerSnap.exists && customerSnap.data()?.name === OLD_CUSTOMER_NAME) {
    await customerRef.update({ name: NEW_CUSTOMER_NAME });
    console.log("  organizations/customer: name -> Customer");
  } else {
    console.log("  organizations/customer: already up to date, skipped");
  }

  // 2. organizations/eq-supplier parentOrgId.
  const eqRef = db.collection("organizations").doc("eq-supplier");
  const eqSnap = await eqRef.get();
  if (eqSnap.exists && eqSnap.data()?.parentOrgId !== "nordic-fitout") {
    await eqRef.update({ parentOrgId: "nordic-fitout" });
    console.log("  organizations/eq-supplier: parentOrgId -> nordic-fitout");
  } else {
    console.log("  organizations/eq-supplier: already up to date, skipped");
  }

  // 3. roles_and_responsibilities Party.organization fields.
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
    const changed = JSON.stringify(next) !== JSON.stringify({
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
  console.log(`  patched Customer PMO -> Customer on ${patched}/${rolesSnap.size} roles_and_responsibilities docs`);

  console.log("Done.");
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
