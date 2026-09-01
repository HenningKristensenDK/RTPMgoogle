/**
 * Risk breakdown with a "View by: Workstream / Contractor" pivot — Step 3 of the
 * 2026-08-17 demo spec (RTPM_Dashboard_Spec_v1.md Section 3 / Step 3). Answers
 * Claus's explicit ask to see risk status per contractor as well as per
 * workstream. Sits above the Likelihood×Impact Risk Matrix.
 *
 * Same real risk data, pivoted:
 *  - Workstream: risks grouped by their linked workstream.
 *  - Contractor: each risk attributed to the contractor(s) responsible for its
 *    workstream(s), via roles_and_responsibilities.responsibleContractor — the
 *    same tier-model organizations (HD / FO / EQ) used across the R&R module.
 *
 * BRAND v4 for structure/typography (semantic tokens). Priority-segment colours
 * intentionally reuse bandChip() (lib/rag.ts) so this reads consistently with
 * the Risk Matrix directly below it — the KNW-038 vs v4 status-palette question
 * is still open and deliberately not resolved here.
 */
import { useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { useRiskStore } from "../../store/riskStore";
import { bandChip } from "../../lib/rag";
import { PRIORITY_META } from "../../lib/format";
import type { RiskPriority } from "../../types";

type View = "workstream" | "contractor";

// Mirrors the tier-model contractor organizations in the `organizations`
// collection (HD tier 1, FO tier 2, EQ tier 3). Shown in this fixed order so
// every contractor has a row even at zero risks.
const CONTRACTORS = ["HD Contractor", "FO Sub-Contractor", "EQ Supplier"];

const PRIORITIES: RiskPriority[] = ["critical", "high", "medium", "low"];

interface Group {
  key: string;
  name: string;
  counts: Record<RiskPriority, number>;
  total: number;
  workstreamId?: string;
}

function emptyCounts(): Record<RiskPriority, number> {
  return { critical: 0, high: 0, medium: 0, low: 0 };
}

export default function RiskWorkstreamBreakdown() {
  const navigate = useNavigate();
  const { risks, roles } = useRiskStore();
  const [view, setView] = useState<View>("workstream");

  const groups = useMemo<Group[]>(() => {
    const open = risks.filter((r) => r.status !== "resolved");
    const roleById = new Map(roles.map((r) => [r.id, r]));

    if (view === "workstream") {
      const map = new Map<string, Group>();
      open.forEach((r) =>
        r.workstreamIds.forEach((wid) => {
          let g = map.get(wid);
          if (!g) {
            g = { key: wid, name: roleById.get(wid)?.workstream ?? wid, counts: emptyCounts(), total: 0, workstreamId: wid };
            map.set(wid, g);
          }
          g.counts[r.priority]++;
          g.total++;
        })
      );
      return [...map.values()].sort((a, b) => b.total - a.total);
    }

    // Contractor view — always show all three, in tier order.
    const map = new Map<string, Group>(
      CONTRACTORS.map((c) => [c, { key: c, name: c, counts: emptyCounts(), total: 0 }])
    );
    open.forEach((r) => {
      const orgs = new Set<string>();
      r.workstreamIds.forEach((wid) => {
        const org = roleById.get(wid)?.responsibleContractor?.organization;
        if (org) orgs.add(org);
      });
      orgs.forEach((org) => {
        const g = map.get(org);
        if (g) {
          g.counts[r.priority]++;
          g.total++;
        }
      });
    });
    return [...map.values()];
  }, [risks, roles, view]);

  const maxTotal = Math.max(1, ...groups.map((g) => g.total));

  return (
    <div
      style={{
        background: "var(--color-surface-card)",
        borderRadius: "var(--radius-card)",
        boxShadow: "var(--rtpm-shadow-hairline)",
        padding: "var(--rtpm-space-5, 20px)",
        fontFamily: "var(--font-ui)",
      }}
    >
      {/* Header + toggle */}
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: "var(--rtpm-space-3)" }}>
        <h2
          style={{
            margin: 0,
            fontSize: "var(--type-eyebrow-size)",
            fontWeight: "var(--type-eyebrow-weight)",
            letterSpacing: "var(--type-eyebrow-tracking)",
            textTransform: "uppercase",
            color: "var(--color-text-muted)",
          }}
        >
          Risk by {view === "workstream" ? "Workstream" : "Contractor"}
        </h2>

        <div
          role="tablist"
          aria-label="View risk by"
          style={{
            display: "inline-flex",
            padding: 2,
            gap: 2,
            borderRadius: "var(--radius-pill)",
            background: "var(--color-surface-inset)",
            border: "1px solid var(--color-border-default)",
          }}
        >
          {(["workstream", "contractor"] as View[]).map((v) => {
            const active = view === v;
            return (
              <button
                key={v}
                role="tab"
                aria-selected={active}
                onClick={() => setView(v)}
                style={{
                  padding: "3px 10px",
                  borderRadius: "var(--radius-pill)",
                  border: "none",
                  cursor: "pointer",
                  fontFamily: "var(--font-ui)",
                  fontSize: "var(--type-caption-size)",
                  fontWeight: "var(--rtpm-weight-semibold)",
                  background: active ? "var(--color-surface-card)" : "transparent",
                  color: active ? "var(--color-text-link)" : "var(--color-text-secondary)",
                  boxShadow: active ? "var(--rtpm-shadow-hairline)" : "none",
                }}
              >
                {v === "workstream" ? "Workstream" : "Contractor"}
              </button>
            );
          })}
        </div>
      </div>

      {/* Rows */}
      <div style={{ display: "flex", flexDirection: "column", gap: "var(--rtpm-space-3)", marginTop: "var(--rtpm-space-4)" }}>
        {groups.map((g) => {
          const clickable = g.workstreamId !== undefined;
          const Row = clickable ? "button" : "div";
          return (
            <Row
              key={g.key}
              onClick={
                clickable ? () => navigate("/risks", { state: { presetWorkstream: g.workstreamId } }) : undefined
              }
              style={{
                display: "grid",
                gridTemplateColumns: "1fr auto",
                alignItems: "center",
                gap: "var(--rtpm-space-3)",
                width: "100%",
                padding: 0,
                border: "none",
                background: "none",
                textAlign: "left",
                cursor: clickable ? "pointer" : "default",
                fontFamily: "var(--font-ui)",
              }}
            >
              <div style={{ minWidth: 0 }}>
                <div
                  style={{
                    fontSize: "var(--type-label-size)",
                    fontWeight: "var(--rtpm-weight-medium)",
                    color: "var(--color-text-primary)",
                    whiteSpace: "nowrap",
                    overflow: "hidden",
                    textOverflow: "ellipsis",
                    marginBottom: 4,
                  }}
                >
                  {g.name}
                </div>
                {/* Stacked priority bar */}
                <div
                  style={{
                    display: "flex",
                    height: 8,
                    borderRadius: "var(--radius-pill)",
                    overflow: "hidden",
                    background: "var(--color-surface-inset)",
                    width: `${(g.total / maxTotal) * 100}%`,
                    minWidth: g.total > 0 ? 24 : 0,
                  }}
                >
                  {PRIORITIES.map((p) =>
                    g.counts[p] > 0 ? (
                      <div
                        key={p}
                        title={`${g.counts[p]} ${PRIORITY_META[p].label}`}
                        style={{ flex: g.counts[p], background: bandChip(p).bg }}
                      />
                    ) : null
                  )}
                </div>
              </div>
              <span
                style={{
                  fontSize: "15px",
                  fontWeight: "var(--rtpm-weight-bold)",
                  color: g.total > 0 ? "var(--color-text-primary)" : "var(--color-text-muted)",
                }}
              >
                {g.total}
              </span>
            </Row>
          );
        })}
      </div>

      {/* Priority legend */}
      <div
        style={{
          display: "flex",
          flexWrap: "wrap",
          gap: "var(--rtpm-space-3)",
          marginTop: "var(--rtpm-space-4)",
          fontSize: "var(--type-caption-size)",
          color: "var(--color-text-muted)",
        }}
      >
        {PRIORITIES.map((p) => (
          <span key={p} style={{ display: "inline-flex", alignItems: "center", gap: "var(--rtpm-space-2)" }}>
            <span style={{ width: 8, height: 8, borderRadius: "var(--radius-pill)", background: bandChip(p).bg }} />
            {PRIORITY_META[p].label}
          </span>
        ))}
      </div>
    </div>
  );
}
