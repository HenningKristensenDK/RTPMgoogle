// Client-side first-run seeding. Runs once when Firestore has no projects,
// so the demo UI is populated without needing the admin script.
import {
  collection,
  doc,
  writeBatch,
  serverTimestamp,
  Timestamp,
} from "firebase/firestore";
import { db } from "../firebase/config";
import { isFirestoreEmpty } from "../firebase/firestore";
import {
  SEED_PROJECT,
  SEED_ROLES,
  SEED_ORGANIZATIONS,
  SEED_RISKS,
  SEED_CORRESPONDENCE,
} from "./seedData";

let seedingPromise: Promise<void> | null = null;

export function seedIfEmpty(createdBy: string): Promise<void> {
  if (!seedingPromise) {
    seedingPromise = run(createdBy).catch((err) => {
      console.error("Seeding failed", err);
      seedingPromise = null;
    });
  }
  return seedingPromise;
}

async function run(createdBy: string): Promise<void> {
  const empty = await isFirestoreEmpty();
  if (!empty) return;

  const batch = writeBatch(db);

  // Project
  batch.set(doc(db, "projects", SEED_PROJECT.id), {
    name: SEED_PROJECT.name,
    description: SEED_PROJECT.description,
    createdAt: serverTimestamp(),
  });

  // Roles & responsibilities
  for (const role of SEED_ROLES) {
    batch.set(doc(db, "roles_and_responsibilities", role.id), {
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

  // Organizations (Org Chart)
  for (const org of SEED_ORGANIZATIONS) {
    batch.set(doc(db, "organizations", org.orgId), {
      projectId: SEED_PROJECT.id,
      orgId: org.orgId,
      name: org.name,
      tier: org.tier,
      parentOrgId: org.parentOrgId,
      roleType: org.roleType,
    });
  }

  // Risks
  const now = Date.now();
  for (const risk of SEED_RISKS) {
    const ref = doc(collection(db, "risks"));
    batch.set(ref, {
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
      createdBy,
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp(),
    });
  }

  // Correspondence
  for (const item of SEED_CORRESPONDENCE) {
    const ref = doc(collection(db, "correspondence"));
    batch.set(ref, {
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
      createdBy,
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp(),
    });
  }

  await batch.commit();
}
