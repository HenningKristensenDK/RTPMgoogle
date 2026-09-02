/**
 * Executive Dashboard — Tier 2 seeded metric data + derivation helpers.
 * (RTPM_Dashboard_Spec_v1.md, Sections 2, 4, 8 Step 2.)
 *
 * These four datasets back the category cards whose modules don't exist yet
 * (HSE, Commercial, Quality, Schedule/EVM). Per the spec they live in real
 * Firestore collections (hse_entries, commercial_summary, quality_summary,
 * schedule_evm_weekly) so every card figure is *derived from a weekly dataset*,
 * never typed into the card — see useDashboardMetrics.ts, which reads Firestore
 * and falls back to these constants so the demo is never empty.
 *
 * Every value varies week-to-week and is deliberately non-round: a flat, round
 * number is the fastest way to make a demo read as fake to someone who has spent
 * years reading real project data (spec Section 4).
 *
 * Confidentiality: Viking Project + fictional contractor names only.
 */

// --- RAG (3-state) mapped onto Brand v4 semantic status tokens --------------
export type Rag = "green" | "amber" | "red";

/** Solid dot colour for a RAG state — semantic v4 tokens only. */
export function ragDot(rag: Rag): string {
  return rag === "red"
    ? "var(--color-status-critical)"
    : rag === "amber"
    ? "var(--color-status-medium)"
    : "var(--color-status-low)";
}

export const CONTRACTORS = ["HD Contractor", "FO Sub-Contractor", "EQ Supplier"] as const;
export type Contractor = (typeof CONTRACTORS)[number];

// ---------------------------------------------------------------------------
// HSE — hse_entries (6 weekly rows)
// ---------------------------------------------------------------------------
export interface HseWeek {
  week: string; // ISO Monday
  hoursHD: number;
  hoursFO: number;
  hoursEQ: number;
  openPermits: number;
  observationsLogged: number;
  observationsUnresolved: number;
  oldestUnresolvedDays: number;
}

export const SEED_HSE_ENTRIES: HseWeek[] = [
  { week: "2026-07-06", hoursHD: 11_980, hoursFO: 4_310, hoursEQ: 1_090, openPermits: 5, observationsLogged: 19, observationsUnresolved: 1, oldestUnresolvedDays: 4 },
  { week: "2026-07-13", hoursHD: 12_540, hoursFO: 4_620, hoursEQ: 1_180, openPermits: 7, observationsLogged: 21, observationsUnresolved: 2, oldestUnresolvedDays: 6 },
  { week: "2026-07-20", hoursHD: 12_110, hoursFO: 4_450, hoursEQ: 1_240, openPermits: 6, observationsLogged: 20, observationsUnresolved: 1, oldestUnresolvedDays: 3 },
  { week: "2026-07-27", hoursHD: 12_870, hoursFO: 4_780, hoursEQ: 1_310, openPermits: 8, observationsLogged: 24, observationsUnresolved: 3, oldestUnresolvedDays: 7 },
  { week: "2026-08-03", hoursHD: 12_460, hoursFO: 4_690, hoursEQ: 1_150, openPermits: 6, observationsLogged: 22, observationsUnresolved: 2, oldestUnresolvedDays: 8 },
  { week: "2026-08-10", hoursHD: 12_340, hoursFO: 4_820, hoursEQ: 1_260, openPermits: 6, observationsLogged: 23, observationsUnresolved: 2, oldestUnresolvedDays: 9 },
];

// ---------------------------------------------------------------------------
// Commercial — commercial_summary (8 weekly burn-down rows)
// ---------------------------------------------------------------------------
export interface CommercialWeek {
  week: string;
  contingencyRemainingDkk: number;
  totalContingencyDkk: number;
  openChangeOrders: number;
  pendingApprovalOver14d: number;
}

const TOTAL_CONTINGENCY = 124_600_000;

export const SEED_COMMERCIAL_SUMMARY: CommercialWeek[] = [
  { week: "2026-06-22", contingencyRemainingDkk: 58_900_000, totalContingencyDkk: TOTAL_CONTINGENCY, openChangeOrders: 8, pendingApprovalOver14d: 1 },
  { week: "2026-06-29", contingencyRemainingDkk: 56_400_000, totalContingencyDkk: TOTAL_CONTINGENCY, openChangeOrders: 9, pendingApprovalOver14d: 1 },
  { week: "2026-07-06", contingencyRemainingDkk: 53_100_000, totalContingencyDkk: TOTAL_CONTINGENCY, openChangeOrders: 10, pendingApprovalOver14d: 2 },
  { week: "2026-07-13", contingencyRemainingDkk: 51_800_000, totalContingencyDkk: TOTAL_CONTINGENCY, openChangeOrders: 10, pendingApprovalOver14d: 2 },
  { week: "2026-07-20", contingencyRemainingDkk: 49_200_000, totalContingencyDkk: TOTAL_CONTINGENCY, openChangeOrders: 11, pendingApprovalOver14d: 3 },
  { week: "2026-07-27", contingencyRemainingDkk: 46_700_000, totalContingencyDkk: TOTAL_CONTINGENCY, openChangeOrders: 11, pendingApprovalOver14d: 2 },
  { week: "2026-08-03", contingencyRemainingDkk: 44_300_000, totalContingencyDkk: TOTAL_CONTINGENCY, openChangeOrders: 12, pendingApprovalOver14d: 3 },
  { week: "2026-08-10", contingencyRemainingDkk: 42_300_000, totalContingencyDkk: TOTAL_CONTINGENCY, openChangeOrders: 12, pendingApprovalOver14d: 3 },
];

// ---------------------------------------------------------------------------
// Quality — quality_summary (6 weekly rows)
// ---------------------------------------------------------------------------
export interface QualityWeek {
  week: string;
  openNcrs: number;
  testPlansIssued: number;
  testsCompleted: number;
  fatPassRatePct: number;
}

export const SEED_QUALITY_SUMMARY: QualityWeek[] = [
  { week: "2026-07-06", openNcrs: 9, testPlansIssued: 11, testsCompleted: 6, fatPassRatePct: 88 },
  { week: "2026-07-13", openNcrs: 8, testPlansIssued: 12, testsCompleted: 7, fatPassRatePct: 89 },
  { week: "2026-07-20", openNcrs: 10, testPlansIssued: 12, testsCompleted: 7, fatPassRatePct: 90 },
  { week: "2026-07-27", openNcrs: 11, testPlansIssued: 13, testsCompleted: 8, fatPassRatePct: 90 },
  { week: "2026-08-03", openNcrs: 9, testPlansIssued: 14, testsCompleted: 9, fatPassRatePct: 92 },
  { week: "2026-08-10", openNcrs: 8, testPlansIssued: 14, testsCompleted: 9, fatPassRatePct: 91 },
];

// ---------------------------------------------------------------------------
// Schedule / EVM — schedule_evm_weekly (8 weekly rows)
// ---------------------------------------------------------------------------
export interface ScheduleWeek {
  week: string;
  spi: number;
  cpi: number;
}

export const SEED_SCHEDULE_EVM: ScheduleWeek[] = [
  { week: "2026-06-22", spi: 0.97, cpi: 1.01 },
  { week: "2026-06-29", spi: 0.96, cpi: 1.0 },
  { week: "2026-07-06", spi: 0.95, cpi: 0.99 },
  { week: "2026-07-13", spi: 0.93, cpi: 0.98 },
  { week: "2026-07-20", spi: 0.94, cpi: 0.97 },
  { week: "2026-07-27", spi: 0.92, cpi: 0.98 },
  { week: "2026-08-03", spi: 0.95, cpi: 0.97 },
  { week: "2026-08-10", spi: 0.94, cpi: 0.97 },
];

// ---------------------------------------------------------------------------
// Correspondence / Documents-backed queues — fictive but realistic figures.
//
// The live correspondence collection only holds a handful of demo items, so
// these cards would otherwise read as ~1 each. Per Henning's direction for the
// 2026-08-17 demo, they show believable hyperscale-project numbers instead;
// their "View" links still open the real, working modules. (Risk stays fully
// real — it is the platform's proof point.) All values are deliberately
// non-round and reflect a project mid-construction as of Aug 2026.
// ---------------------------------------------------------------------------
export const SEED_QUEUE_SUMMARY = {
  rfi: { open: 23, avgResponseDays: 6.2, overdue: 3, slaDays: 5, trend: [18, 20, 19, 22, 24, 23] },
  change: { open: 12, exposureLabel: "€4.8M under review", trend: [8, 9, 10, 11, 12, 12] },
  designNotes: { open: 14, closed: 63, trend: [11, 12, 13, 14, 15, 14] },
  submittals: { open: 27, dueSoon: 5, overdue: 2 },
};

/** RFI RAG from overdue count against SLA: ≥5 Red, ≥1 Amber, else Green. */
export function rfiRag(overdue: number): Rag {
  if (overdue >= 5) return "red";
  if (overdue >= 1) return "amber";
  return "green";
}

// --- Derivation helpers -----------------------------------------------------

export function hseTotalHours(w: HseWeek): number {
  return w.hoursHD + w.hoursFO + w.hoursEQ;
}

/** RAG from unresolved-observation age (spec 2.1): >14d Red, >7d Amber. */
export function hseRag(w: HseWeek): Rag {
  if (w.oldestUnresolvedDays > 14) return "red";
  if (w.oldestUnresolvedDays > 7) return "amber";
  return "green";
}

export function contingencyPct(w: CommercialWeek): number {
  return (w.contingencyRemainingDkk / w.totalContingencyDkk) * 100;
}

/** RAG from contingency remaining % (spec Tier-1 #6): <15 Red, 15–30 Amber, >30 Green. */
export function contingencyRag(pct: number): Rag {
  if (pct < 15) return "red";
  if (pct <= 30) return "amber";
  return "green";
}

/** RAG from FAT pass rate (spec 2.7): <85 Red, 85–95 Amber, >95 Green. */
export function qualityRag(w: QualityWeek): Rag {
  if (w.fatPassRatePct < 85) return "red";
  if (w.fatPassRatePct <= 95) return "amber";
  return "green";
}

/** RAG from worse of SPI/CPI (spec 2.6): <0.90 Red, 0.90–0.97 Amber, >0.97 Green. */
export function scheduleRag(w: ScheduleWeek): Rag {
  const worst = Math.min(w.spi, w.cpi);
  if (worst < 0.9) return "red";
  if (worst <= 0.97) return "amber";
  return "green";
}

/** Compact DKK, e.g. 42_300_000 -> "42.3M". */
export function dkkCompact(v: number): string {
  if (v >= 1_000_000) return `${(v / 1_000_000).toFixed(1)}M`;
  if (v >= 1_000) return `${Math.round(v / 1_000)}k`;
  return `${v}`;
}
