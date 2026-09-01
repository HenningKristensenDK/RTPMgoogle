/**
 * Subscribes to the four seeded Tier-2 metric collections in Firestore. If a
 * collection is empty (e.g. the live seed script hasn't been run yet on a given
 * project), it falls back to the SEED_* constants — so the executive dashboard
 * is never blank during a demo, while still reading genuine Firestore data once
 * seeded. Values are always derived from a weekly dataset, never typed per-card.
 */
import { useEffect, useState } from "react";
import {
  watchHseEntries,
  watchCommercialSummary,
  watchQualitySummary,
  watchScheduleEvm,
} from "../firebase/firestore";
import {
  SEED_HSE_ENTRIES,
  SEED_COMMERCIAL_SUMMARY,
  SEED_QUALITY_SUMMARY,
  SEED_SCHEDULE_EVM,
  type HseWeek,
  type CommercialWeek,
  type QualityWeek,
  type ScheduleWeek,
} from "./dashboardMetrics";

export interface DashboardMetrics {
  hse: HseWeek[];
  commercial: CommercialWeek[];
  quality: QualityWeek[];
  schedule: ScheduleWeek[];
}

export function useDashboardMetrics(projectId: string | undefined): DashboardMetrics {
  const [hse, setHse] = useState<HseWeek[]>(SEED_HSE_ENTRIES);
  const [commercial, setCommercial] = useState<CommercialWeek[]>(SEED_COMMERCIAL_SUMMARY);
  const [quality, setQuality] = useState<QualityWeek[]>(SEED_QUALITY_SUMMARY);
  const [schedule, setSchedule] = useState<ScheduleWeek[]>(SEED_SCHEDULE_EVM);

  useEffect(() => {
    if (!projectId) return;
    const unsubs = [
      watchHseEntries(projectId, (rows) => rows.length && setHse(rows)),
      watchCommercialSummary(projectId, (rows) => rows.length && setCommercial(rows)),
      watchQualitySummary(projectId, (rows) => rows.length && setQuality(rows)),
      watchScheduleEvm(projectId, (rows) => rows.length && setSchedule(rows)),
    ];
    return () => unsubs.forEach((u) => u());
  }, [projectId]);

  return { hse, commercial, quality, schedule };
}
