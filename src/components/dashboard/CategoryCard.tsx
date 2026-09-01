/**
 * Tier-2 category card — one strict template so all nine categories read as one
 * system, not nine ideas (spec Section 2):
 *
 *   [Category name]                         [RAG dot]
 *   [Big number]  [unit/label]
 *   [one-line sub-metric, muted]
 *   [optional sparkline slot]
 *   [optional contractor filter pills]
 *   → View
 *
 * BRAND v4: every colour/font/radius/spacing is a semantic token. No hex.
 */
import type { ReactNode } from "react";
import { ArrowRight } from "lucide-react";
import { ragDot, type Rag } from "../../lib/dashboardMetrics";

export interface Stat {
  value: ReactNode;
  label: string;
}

export interface CategoryCardProps {
  name: string;
  rag: Rag;
  big?: ReactNode;
  unit?: string;
  /** Secondary metrics as a stat-row: each value with its label stacked under, side by side. */
  stats: Stat[];
  /** Small caption under the stat-row (e.g. "Fed from Primavera P6"). */
  caption?: string;
  sparkline?: ReactNode;
  pills?: {
    label: string;
    active: boolean;
    onClick: () => void;
    swatch?: string;
  }[];
  onView: () => void;
  viewLabel?: string;
}

export default function CategoryCard({
  name,
  rag,
  big,
  unit,
  stats,
  caption,
  sparkline,
  pills,
  onView,
  viewLabel = "View",
}: CategoryCardProps) {
  return (
    <div
      style={{
        display: "flex",
        flexDirection: "column",
        background: "var(--color-surface-card)",
        border: "1px solid var(--color-border-default)",
        borderRadius: "var(--radius-card)",
        boxShadow: "var(--rtpm-shadow-hairline)",
        padding: "var(--rtpm-space-4)",
        fontFamily: "var(--font-ui)",
        minWidth: 0,
      }}
    >
      {/* Top row: name + RAG dot */}
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: "var(--rtpm-space-2)" }}>
        <span
          style={{
            fontSize: "var(--type-label-size)",
            fontWeight: "var(--rtpm-weight-semibold)",
            color: "var(--color-text-primary)",
            whiteSpace: "nowrap",
            overflow: "hidden",
            textOverflow: "ellipsis",
          }}
        >
          {name}
        </span>
        <span
          title={rag}
          style={{
            flexShrink: 0,
            width: 10,
            height: 10,
            borderRadius: "var(--radius-pill)",
            background: ragDot(rag),
          }}
        />
      </div>

      {/* Big number */}
      {big !== undefined && (
        <div style={{ display: "flex", alignItems: "baseline", gap: "var(--rtpm-space-2)", marginTop: "var(--rtpm-space-3)" }}>
          <span
            style={{
              fontSize: "26px",
              lineHeight: 1,
              fontWeight: "var(--rtpm-weight-bold)",
              color: "var(--color-text-primary)",
            }}
          >
            {big}
          </span>
          {unit && (
            <span style={{ fontSize: "var(--type-caption-size)", color: "var(--color-text-muted)" }}>{unit}</span>
          )}
        </div>
      )}

      {/* Stat-row — each value with its label stacked under, side by side (mirrors the KPI strip) */}
      <div
        style={{
          display: "flex",
          gap: "var(--rtpm-space-4)",
          flexWrap: "wrap",
          marginTop: "var(--rtpm-space-3)",
          minHeight: 34,
        }}
      >
        {stats.map((s, i) => (
          <div key={i} style={{ display: "flex", flexDirection: "column", gap: 1 }}>
            <span
              style={{
                fontSize: big === undefined ? "18px" : "15px",
                lineHeight: 1.05,
                fontWeight: "var(--rtpm-weight-semibold)",
                color: "var(--color-text-primary)",
              }}
            >
              {s.value}
            </span>
            <span style={{ fontSize: "10px", lineHeight: 1.2, color: "var(--color-text-muted)" }}>
              {s.label}
            </span>
          </div>
        ))}
      </div>

      {caption && (
        <div style={{ marginTop: "var(--rtpm-space-1)", fontSize: "var(--type-caption-size)", color: "var(--color-text-muted)" }}>
          {caption}
        </div>
      )}

      {/* Sparkline slot */}
      {sparkline && <div style={{ marginTop: "var(--rtpm-space-3)" }}>{sparkline}</div>}

      {/* Contractor filter pills */}
      {pills && pills.length > 0 && (
        <div style={{ display: "flex", flexWrap: "wrap", gap: "var(--rtpm-space-1)", marginTop: "var(--rtpm-space-3)" }}>
          {pills.map((p) => (
            <button
              key={p.label}
              onClick={p.onClick}
              style={{
                display: "inline-flex",
                alignItems: "center",
                gap: "var(--rtpm-space-1)",
                padding: "2px 8px",
                borderRadius: "var(--radius-pill)",
                fontSize: "var(--type-caption-size)",
                fontWeight: "var(--rtpm-weight-medium)",
                cursor: "pointer",
                border: p.active ? "1px solid var(--color-border-selected)" : "1px solid var(--color-border-default)",
                background: p.active ? "var(--color-surface-selected)" : "var(--color-surface-card)",
                color: p.active ? "var(--color-text-link)" : "var(--color-text-secondary)",
              }}
            >
              {p.swatch && (
                <span style={{ width: 8, height: 8, borderRadius: "var(--radius-pill)", background: p.swatch }} />
              )}
              {p.label}
            </button>
          ))}
        </div>
      )}

      {/* View link */}
      <button
        onClick={onView}
        style={{
          display: "inline-flex",
          alignItems: "center",
          gap: "var(--rtpm-space-1)",
          alignSelf: "flex-start",
          marginTop: "var(--rtpm-space-3)",
          padding: 0,
          background: "none",
          border: "none",
          cursor: "pointer",
          fontFamily: "var(--font-ui)",
          fontSize: "var(--type-caption-size)",
          fontWeight: "var(--rtpm-weight-semibold)",
          color: "var(--color-text-link)",
        }}
      >
        {viewLabel} <ArrowRight size={13} />
      </button>
    </div>
  );
}
