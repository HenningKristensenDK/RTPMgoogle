import type { RiskImpactDriver, RiskPriority, RiskTrend } from "../types";

// RTPM Group G: Risk Matrix Credibility Pass — explicit Likelihood x Impact
// scoring, replacing manually-picked Priority. Deliberately simple: single
// likelihood axis, single impact axis, single dominant impact driver. No
// inherent/residual split, no risk appetite thresholds — out of scope.

export const LIKELIHOOD_LABELS: Record<number, string> = {
  1: "Rare",
  2: "Unlikely",
  3: "Possible",
  4: "Likely",
  5: "Almost certain",
};

export const IMPACT_LABELS: Record<number, string> = {
  1: "Negligible",
  2: "Minor",
  3: "Moderate",
  4: "Major",
  5: "Severe",
};

export const IMPACT_DRIVERS: RiskImpactDriver[] = ["Cost", "Schedule", "Safety", "Quality"];

export const SCORE_LEVELS = [1, 2, 3, 4, 5];

/** Non-linear priority bands — NOT even 5-point steps, per the Group G spec. */
export function priorityFromScore(score: number): RiskPriority {
  if (score >= 17) return "critical";
  if (score >= 10) return "high";
  if (score >= 5) return "medium";
  return "low";
}

export function computeRiskScore(likelihood: number, impactScore: number): number {
  return likelihood * impactScore;
}

/** Reasonable likelihood/impact defaults for a risk that predates explicit
 * scoring — chosen so the resulting band always matches the risk's existing
 * manually-set priority, so nothing visually jumps category on backfill. */
const PRIORITY_DEFAULTS: Record<RiskPriority, { likelihood: number; impactScore: number }> = {
  critical: { likelihood: 4, impactScore: 5 }, // 20
  high: { likelihood: 4, impactScore: 3 }, // 12
  medium: { likelihood: 3, impactScore: 2 }, // 6
  low: { likelihood: 2, impactScore: 2 }, // 4
};

/** Simple keyword heuristic for the dominant impact driver — good enough for
 * a demo backfill, not a scoring algorithm. */
export function inferImpactDriver(text: string): RiskImpactDriver {
  const t = text.toLowerCase();
  if (/safety|hse|injury|incident/.test(t)) return "Safety";
  if (/quality|ncr|defect|non-conformance|nonconformance|qa\/qc/.test(t)) return "Quality";
  if (/cost|budget|compensation|claim|price/.test(t)) return "Cost";
  return "Schedule";
}

export interface BackfilledScoring {
  likelihood: number;
  impactScore: number;
  riskScore: number;
  priority: RiskPriority;
  impactDriver: RiskImpactDriver;
  trend: RiskTrend;
}

/** Derives a full scoring set for a risk that only has a legacy `priority`
 * value — used by both the live-data migration and fresh seeding. */
export function backfillScoring(priority: RiskPriority, text: string): BackfilledScoring {
  const { likelihood, impactScore } = PRIORITY_DEFAULTS[priority];
  return {
    likelihood,
    impactScore,
    riskScore: computeRiskScore(likelihood, impactScore),
    priority: priorityFromScore(computeRiskScore(likelihood, impactScore)),
    impactDriver: inferImpactDriver(text),
    trend: "flat",
  };
}
