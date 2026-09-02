/**
 * Tier-2 control-queue grid — the nine categories Claus listed, in his order
 * (spec Section 2 / Section 8 Step 2), as a 3×3 responsive grid of CategoryCard.
 *
 * Data sources:
 *  - RFI, Risk          → REAL Firestore (correspondence type=RFI; risks)
 *  - Change, Design Notes, Technical Submittals → REAL Firestore
 *                         (correspondence Variation Request / TQ; documents)
 *  - HSE, Commercial, Quality, Schedule → seeded weekly datasets via
 *                         useDashboardMetrics (Firestore, falling back to consts)
 *
 * BRAND v4 throughout — CategoryCard/Sparkline consume semantic tokens only.
 */
import { useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { useRiskStore } from "../../store/riskStore";
import type { DashboardMetrics } from "../../lib/useDashboardMetrics";
import { toast } from "../../lib/toast";
import CategoryCard from "./CategoryCard";
import { LineSparkline, StackedBarSparkline } from "./Sparkline";
import {
  CONTRACTORS,
  type Contractor,
  type Rag,
  hseTotalHours,
  hseRag,
  contingencyPct,
  contingencyRag,
  qualityRag,
  scheduleRag,
  rfiRag,
  dkkCompact,
  SEED_QUEUE_SUMMARY,
} from "../../lib/dashboardMetrics";

const CONTRACTOR_CHART: Record<Contractor, string> = {
  "HD Contractor": "var(--color-chart-1)",
  "FO Sub-Contractor": "var(--color-chart-2)",
  "EQ Supplier": "var(--color-chart-3)",
};

export default function Tier2CategoryCards({ metrics }: { metrics: DashboardMetrics }) {
  const navigate = useNavigate();
  const { risks } = useRiskStore();
  const [hseFilter, setHseFilter] = useState<Contractor | null>(null);

  const now = Date.now();
  const notBuilt = (m: string) => toast.error(`${m} isn't built in the platform yet.`);

  // --- Real: Risk (the platform's proof point) -----------------------------
  const risk = useMemo(() => {
    const open = risks.filter((r) => r.status !== "resolved");
    const critical = open.filter((r) => r.priority === "critical").length;
    const high = open.filter((r) => r.priority === "high").length;
    const overdue = open.filter((r) => r.dueDate && r.dueDate.toMillis() < now).length;
    const rag: Rag = critical > 0 ? "red" : high > 0 || overdue > 0 ? "amber" : "green";
    return { openCount: open.length, critical, overdue, rag };
  }, [risks, now]);

  // --- Fictive-but-realistic queues (RFI / Change / Design Notes / Submittals)
  const { rfi, change, designNotes, submittals } = SEED_QUEUE_SUMMARY;

  // --- Seeded: latest week of each weekly dataset -------------------------
  const hse = metrics.hse[metrics.hse.length - 1];
  const commercial = metrics.commercial[metrics.commercial.length - 1];
  const quality = metrics.quality[metrics.quality.length - 1];
  const schedule = metrics.schedule[metrics.schedule.length - 1];
  const pct = contingencyPct(commercial);

  return (
    <div>
      <h2
        style={{
          fontFamily: "var(--font-ui)",
          fontSize: "var(--type-eyebrow-size)",
          fontWeight: "var(--type-eyebrow-weight)",
          letterSpacing: "var(--type-eyebrow-tracking)",
          textTransform: "uppercase",
          color: "var(--color-text-muted)",
          margin: "0 0 var(--rtpm-space-3)",
        }}
      >
        Control Queues
      </h2>

      <div
        style={{
          display: "grid",
          gridTemplateColumns: "repeat(3, minmax(0, 1fr))",
          gap: "var(--rtpm-space-4)",
        }}
      >
        {/* 1 — HSE */}
        <CategoryCard
          name="HSE"
          rag={hseRag(hse)}
          big={hseTotalHours(hse).toLocaleString("en-GB")}
          unit="hrs this week"
          stats={[
            { value: hse.openPermits, label: "Work permits" },
            { value: hse.observationsLogged, label: "Observations" },
            { value: hse.observationsUnresolved, label: "Unresolved" },
          ]}
          sparkline={
            <StackedBarSparkline
              columns={metrics.hse.map((w) => ({
                segments: (
                  hseFilter ? [hseFilter] : (CONTRACTORS as readonly Contractor[])
                ).map((c) => ({
                  value: c === "HD Contractor" ? w.hoursHD : c === "FO Sub-Contractor" ? w.hoursFO : w.hoursEQ,
                  color: CONTRACTOR_CHART[c],
                })),
              }))}
            />
          }
          pills={CONTRACTORS.map((c) => ({
            label: c.replace(" Contractor", "").replace(" Sub-Contractor", " Sub").replace(" Supplier", ""),
            active: hseFilter === c,
            swatch: CONTRACTOR_CHART[c],
            onClick: () => setHseFilter((cur) => (cur === c ? null : c)),
          }))}
          onView={() => notBuilt("HSE")}
        />

        {/* 2 — Commercial */}
        <CategoryCard
          name="Commercial"
          rag={contingencyRag(pct)}
          big={`DKK ${dkkCompact(commercial.contingencyRemainingDkk)}`}
          unit={`· ${pct.toFixed(0)}% remaining`}
          stats={[
            { value: commercial.openChangeOrders, label: "Open CO's" },
            { value: commercial.pendingApprovalOver14d, label: "Pending >14d" },
          ]}
          sparkline={
            <LineSparkline
              series={[
                {
                  points: metrics.commercial.map((w) => w.contingencyRemainingDkk),
                  color: "var(--color-status-medium)",
                },
              ]}
            />
          }
          onView={() => navigate("/correspondence")}
        />

        {/* 3 — Technical Submittals (two-list forecast, not a chart — spec 2.3) */}
        <CategoryCard
          name="Technical Submittals"
          rag={submittals.overdue > 0 ? "amber" : "green"}
          big={submittals.open}
          unit="awaiting review"
          stats={[
            { value: submittals.dueSoon, label: "Due ≤ 2 wks" },
            { value: submittals.overdue, label: "Overdue" },
          ]}
          onView={() => navigate("/documents")}
        />

        {/* 4 — Design Notes */}
        <CategoryCard
          name="Design Notes"
          rag="green"
          big={designNotes.open}
          unit="open"
          stats={[{ value: designNotes.closed, label: "Closed" }]}
          caption="Technical coordination log"
          sparkline={
            <LineSparkline series={[{ points: designNotes.trend, color: "var(--color-chart-1)" }]} />
          }
          onView={() => navigate("/correspondence")}
        />

        {/* 5 — RFI */}
        <CategoryCard
          name="RFI"
          rag={rfiRag(rfi.overdue)}
          big={rfi.open}
          unit="open RFIs"
          stats={[
            { value: `${rfi.avgResponseDays}d`, label: "Avg response" },
            { value: rfi.overdue, label: "Overdue" },
            { value: `${rfi.slaDays}d`, label: "SLA" },
          ]}
          sparkline={
            <LineSparkline series={[{ points: rfi.trend, color: "var(--color-chart-1)" }]} />
          }
          onView={() => navigate("/correspondence")}
        />

        {/* 6 — Schedule (EVM) */}
        <CategoryCard
          name="Schedule"
          rag={scheduleRag(schedule)}
          stats={[
            { value: schedule.spi.toFixed(2), label: "SPI" },
            { value: schedule.cpi.toFixed(2), label: "CPI" },
            { value: "6d", label: "Float" },
          ]}
          caption="Critical path: MEP Procurement → Commissioning · Fed from Primavera P6"
          sparkline={
            <LineSparkline
              series={[
                { points: metrics.schedule.map((w) => w.spi), color: "var(--color-chart-1)" },
                { points: metrics.schedule.map((w) => w.cpi), color: "var(--color-chart-2)" },
              ]}
            />
          }
          onView={() => notBuilt("Schedule / P6")}
        />

        {/* 7 — Quality */}
        <CategoryCard
          name="Quality"
          rag={qualityRag(quality)}
          big={quality.openNcrs}
          unit="open NCRs"
          stats={[
            { value: quality.testPlansIssued, label: "Test plans" },
            { value: quality.testsCompleted, label: "Completed" },
            { value: `${quality.fatPassRatePct}%`, label: "FAT pass" },
          ]}
          sparkline={
            <LineSparkline
              series={[{ points: metrics.quality.map((w) => w.openNcrs), color: "var(--color-status-medium)" }]}
            />
          }
          onView={() => notBuilt("Quality / NCR")}
        />

        {/* 8 — Risk (real) */}
        <CategoryCard
          name="Risk"
          rag={risk.rag}
          big={risk.openCount}
          unit="open risks"
          stats={[
            { value: risk.critical, label: "Critical" },
            { value: risk.overdue, label: "Overdue" },
          ]}
          onView={() => navigate("/risks")}
        />

        {/* 9 — Change */}
        <CategoryCard
          name="Change"
          rag="amber"
          big={change.open}
          unit="open change items"
          stats={[{ value: "€4.8M", label: "Exposure under review" }]}
          sparkline={
            <LineSparkline series={[{ points: change.trend, color: "var(--color-chart-1)" }]} />
          }
          onView={() => navigate("/correspondence")}
        />
      </div>
    </div>
  );
}
