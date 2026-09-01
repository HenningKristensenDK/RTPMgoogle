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
import {
  SEED_HSE_ENTRIES,
  SEED_COMMERCIAL_SUMMARY,
  SEED_QUALITY_SUMMARY,
  SEED_SCHEDULE_EVM,
} from "./dashboardMetrics";
import { backfillScoring } from "./riskScoring";

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
    const scoring = backfillScoring(risk.priority, `${risk.title} ${risk.notes}`);
    batch.set(ref, {
      projectId: SEED_PROJECT.id,
      riskId: risk.riskId,
      kind: "risk",
      title: risk.title,
      status: risk.status,
      likelihood: scoring.likelihood,
      impactScore: scoring.impactScore,
      riskScore: scoring.riskScore,
      priority: scoring.priority,
      impactDriver: scoring.impactDriver,
      trend: scoring.trend,
      startDate: Timestamp.fromMillis(now),
      dueDate: Timestamp.fromMillis(now + risk.dueOffsetDays * 86400000),
      recurrence: risk.recurrence,
      collection: SEED_PROJECT.name,
      workstreamIds: risk.workstreamIds,
      checklist: risk.checklist,
      mitigationPlan: "",
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
      ...(item.relatedRiskId ? { relatedRiskId: item.relatedRiskId } : {}),
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

  // Dashboard Tier-2 seeded metrics (spec Section 4)
  for (const w of SEED_HSE_ENTRIES) {
    batch.set(doc(collection(db, "hse_entries")), { projectId: SEED_PROJECT.id, ...w });
  }
  for (const w of SEED_COMMERCIAL_SUMMARY) {
    batch.set(doc(collection(db, "commercial_summary")), { projectId: SEED_PROJECT.id, ...w });
  }
  for (const w of SEED_QUALITY_SUMMARY) {
    batch.set(doc(collection(db, "quality_summary")), { projectId: SEED_PROJECT.id, ...w });
  }
  for (const w of SEED_SCHEDULE_EVM) {
    batch.set(doc(collection(db, "schedule_evm_weekly")), { projectId: SEED_PROJECT.id, ...w });
  }

  await batch.commit();
}
