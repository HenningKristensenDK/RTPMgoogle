import { useState } from "react";
import { Check } from "lucide-react";
import { RISK_STATUSES, type Risk, type RiskStatus } from "../../types";
import { STATUS_LABEL, formatDateYMD } from "../../lib/format";

const STEP_OWNER: Record<RiskStatus, string> = {
  identified: "Package PM",
  assessed: "Lead Scheduler",
  mitigated: "Quality Manager",
  resolved: "Commissioning Authority",
};

interface Props {
  risk: Risk;
  onChangeStatus: (to: RiskStatus) => void;
}

export default function RiskStatusBar({ risk, onChangeStatus }: Props) {
  const [pending, setPending] = useState<RiskStatus | null>(null);
  const currentIdx = RISK_STATUSES.indexOf(risk.status);
  const history = risk.statusHistory || [];

  function stepDate(status: RiskStatus): string | null {
    const entry = history.find((h) => h.to === status);
    if (!entry?.changedAt) return null;
    return formatDateYMD(entry.changedAt);
  }

  return (
    <div className="mb-3 rounded-card bg-white px-6 pb-12 pt-4 shadow-card">
      <div className="flex items-start">
        {RISK_STATUSES.map((status, idx) => {
          const isCompleted = idx < currentIdx;
          const isCurrent = idx === currentIdx;
          const isLast = idx === RISK_STATUSES.length - 1;
          const lineSolid = idx < currentIdx;
          const date = isCompleted ? stepDate(status) : null;

          return (
            <div key={status} className="flex flex-1 flex-col items-center">

              {/* 1 — Owner name */}
              <div
                className="mb-2 text-center text-[11px] font-medium leading-snug"
                style={{ color: "#8a8ca6" }}
              >
                {STEP_OWNER[status]}
              </div>

              {/* 2 — Circle row with connecting lines */}
              <div className="flex w-full items-center">
                {/* left connector */}
                <div className="flex-1">
                  {idx > 0 && (
                    <div
                      className="h-[2px] w-full"
                      style={{
                        background: lineSolid ? "#28a745" : "transparent",
                        borderTop: lineSolid ? "none" : "2px dashed #D1D5DB",
                      }}
                    />
                  )}
                </div>

                {/* circle */}
                <button
                  onClick={() => setPending(status)}
                  title={`Set status to ${STATUS_LABEL[status]}`}
                  className="flex h-[18px] w-[18px] shrink-0 cursor-pointer items-center justify-center rounded-full transition-transform hover:scale-110"
                  style={{
                    background: isCompleted ? "#28a745" : "transparent",
                    border: isCompleted
                      ? "none"
                      : isCurrent
                      ? "2px solid #0d08d2"
                      : "2px solid #D1D5DB",
                  }}
                >
                  {isCompleted && (
                    <Check size={10} strokeWidth={3} color="#fff" />
                  )}
                </button>

                {/* right connector */}
                <div className="flex-1">
                  {!isLast && (
                    <div
                      className="h-[2px] w-full"
                      style={{
                        background: lineSolid ? "#28a745" : "transparent",
                        borderTop: lineSolid ? "none" : "2px dashed #D1D5DB",
                      }}
                    />
                  )}
                </div>
              </div>

              {/* 3 — Status label */}
              <div
                className="mt-2 text-center text-[10px] font-semibold uppercase tracking-[0.05em]"
                style={{
                  color: isCompleted ? "#28a745" : isCurrent ? "#0d08d2" : "#8a8ca6",
                }}
              >
                {STATUS_LABEL[status]}
              </div>

              {/* 4 — Date (completed steps only, if history entry exists) */}
              {isCompleted && date && (
                <div
                  className="mt-0.5 text-center text-[10px]"
                  style={{ color: "#8a8ca6" }}
                >
                  {date}
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
              Set this risk to <span className="font-medium text-ink">{STATUS_LABEL[pending]}</span>?
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
