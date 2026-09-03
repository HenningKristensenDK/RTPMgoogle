import { useState } from "react";
import { Check, TrendingUp, TrendingDown, Minus } from "lucide-react";
import { RISK_STATUSES, type Risk, type RiskStatus, type RiskTrend } from "../../types";
import { STATUS_LABEL, formatDateYMD } from "../../lib/format";

const STEP_OWNER: Record<RiskStatus, string> = {
  identified: "Package PM",
  assessed:   "Lead Scheduler",
  mitigated:  "Quality Manager",
  resolved:   "Commissioning Authority",
};

const TREND_ORDER: RiskTrend[] = ["down", "flat", "up"];
// "up" = getting worse (red), "down" = improving (green) — matches risk-severity convention.
const TREND_META: Record<RiskTrend, { Icon: typeof TrendingUp; color: string; label: string }> = {
  up: { Icon: TrendingUp, color: "#C0392B", label: "Trending up — getting worse" },
  flat: { Icon: Minus, color: "#8a8ca6", label: "Flat — unchanged since last review" },
  down: { Icon: TrendingDown, color: "#27AE60", label: "Trending down — improving" },
};

interface Props {
  risk: Risk;
  onChangeStatus: (to: RiskStatus) => void;
  onCycleTrend: (next: RiskTrend) => void;
}

export default function RiskStatusBar({ risk, onChangeStatus, onCycleTrend }: Props) {
  const [pending, setPending] = useState<RiskStatus | null>(null);
  const currentIdx = RISK_STATUSES.indexOf(risk.status);
  const history = risk.statusHistory || [];
  const trend = risk.trend || "flat";
  const trendMeta = TREND_META[trend];

  function cycleTrend() {
    const next = TREND_ORDER[(TREND_ORDER.indexOf(trend) + 1) % TREND_ORDER.length];
    onCycleTrend(next);
  }

  function stepDate(status: RiskStatus): string | null {
    const entry = history.find((h) => h.to === status);
    if (!entry?.changedAt) return null;
    return formatDateYMD(entry.changedAt);
  }

  function stepChangedBy(status: RiskStatus): string | null {
    const entry = history.find((h) => h.to === status);
    return entry?.changedBy || null;
  }

  return (
    <div className="relative mb-3 rounded-card bg-white px-6 py-4 shadow-card">
      <button
        onClick={cycleTrend}
        title={trendMeta.label}
        className="absolute right-4 top-3 flex items-center gap-1 rounded-full px-2 py-0.5 text-[10px] font-medium transition-colors hover:bg-fog"
        style={{ color: trendMeta.color }}
      >
        <trendMeta.Icon size={13} />
        {trend}
      </button>
      <div className="flex items-start">
        {RISK_STATUSES.map((status, idx) => {
          // Green ✓ if risk is AT or PAST this step
          const isGreen = idx <= currentIdx;
          // Indigo outline if this is the immediate next step
          const isNext = idx === currentIdx + 1;
          const isLast = idx === RISK_STATUSES.length - 1;
          // Left connector solid when this step itself is green;
          // right connector solid only when the following step is also green
          const leftLineSolid = isGreen;
          const rightLineSolid = idx < currentIdx;

          // Date logic — resolved special-cased to always show something
          let displayDate: string | null = null;
          let displayDateColor = "#8a8ca6";
          if (status === "resolved") {
            const completion = stepDate("resolved");
            if (completion) {
              displayDate = completion;
            } else {
              const due = risk.dueDate ? formatDateYMD(risk.dueDate) : null;
              if (due && due !== "—") {
                displayDate = due;
                displayDateColor = "#ff8b00";
              }
            }
          } else if (isGreen) {
            displayDate = stepDate(status);
          }

          // Show changedBy display name for green steps; fall back to role title
          const ownerLabel = (isGreen ? stepChangedBy(status) : null) ?? STEP_OWNER[status];

          return (
            <div key={status} className="flex flex-1 flex-col items-center">

              {/* 1 — Status label */}
              <div
                className="text-center text-[10px] font-semibold uppercase tracking-[0.05em]"
                style={{
                  color: isGreen ? "#28a745" : isNext ? "#0d08d2" : "#8a8ca6",
                }}
              >
                {STATUS_LABEL[status]}
              </div>

              {/* 2 — Circle row with connecting lines */}
              <div className="mt-1.5 flex w-full items-center">
                <div className="flex-1">
                  {idx > 0 && (
                    <div
                      className="h-[2px] w-full"
                      style={{
                        background: leftLineSolid ? "#28a745" : "transparent",
                        borderTop: leftLineSolid ? "none" : "2px dashed #D1D5DB",
                      }}
                    />
                  )}
                </div>

                <button
                  onClick={() => setPending(status)}
                  title={`Set status to ${STATUS_LABEL[status]}`}
                  className="flex h-[18px] w-[18px] shrink-0 cursor-pointer items-center justify-center rounded-full transition-transform hover:scale-110"
                  style={{
                    background: isGreen ? "#28a745" : "transparent",
                    border: isGreen
                      ? "none"
                      : isNext
                      ? "2px solid #0d08d2"
                      : "2px solid #D1D5DB",
                  }}
                >
                  {isGreen && <Check size={10} strokeWidth={3} color="#fff" />}
                </button>

                <div className="flex-1">
                  {!isLast && (
                    <div
                      className="h-[2px] w-full"
                      style={{
                        background: rightLineSolid ? "#28a745" : "transparent",
                        borderTop: rightLineSolid ? "none" : "2px dashed #D1D5DB",
                      }}
                    />
                  )}
                </div>
              </div>

              {/* 3 — Role name or changedBy display name */}
              <div
                className="mt-0.5 text-center text-[11px] font-medium leading-snug"
                style={{ color: "#8a8ca6" }}
              >
                {ownerLabel}
              </div>

              {/* 4 — Date (green steps only; resolved always shows something) */}
              {displayDate && (
                <div
                  className="mt-0.5 text-center text-[10px]"
                  style={{ color: displayDateColor }}
                >
                  {displayDate}
                </div>
              )}

            </div>
          );
        })}
      </div>

      {/* Confirmation modal */}
      {pending && (
        <div className="fixed inset-0 z-40 flex items-center justify-center bg-black/30">
          <div className="w-[300px] rounded-card bg-white p-5 shadow-panel">
            <p className="text-sm font-semibold text-ink">Change status?</p>
            <p className="mt-1 text-sm text-gray-500">
              Set this risk to{" "}
              <span className="font-medium text-ink">{STATUS_LABEL[pending]}</span>?
            </p>
            <div className="mt-4 flex justify-end gap-2">
              <button
                onClick={() => setPending(null)}
                className="rounded-btn border border-bordergray px-3 py-1.5 text-sm text-gray-600 hover:bg-gray-50"
              >
                Cancel
              </button>
              <button
                onClick={() => {
                  onChangeStatus(pending);
                  setPending(null);
                }}
                className="rounded-btn px-3 py-1.5 text-sm font-semibold text-white hover:opacity-90"
                style={{ background: "#0d08d2" }}
              >
                Confirm
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
