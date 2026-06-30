import { useState } from "react";
import { Check } from "lucide-react";
import { RISK_STATUSES, type Risk, type RiskStatus } from "../../types";
import { STATUS_LABEL } from "../../lib/format";

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

  return (
    <div className="mb-3 rounded-card bg-white px-6 pb-12 pt-4 shadow-card">
      <div className="flex items-end">
        {RISK_STATUSES.map((status, idx) => {
          const isCompleted = idx < currentIdx;
          const isCurrent = idx === currentIdx;
          const isLast = idx === RISK_STATUSES.length - 1;
          const lineSolid = idx < currentIdx;

          return (
            <div key={status} className="flex flex-1 flex-col items-center">
              {/* Owner name */}
              <div
                className="mb-0.5 text-center text-[11px] font-medium leading-snug"
                style={{ color: "#8a8ca6" }}
              >
                {STEP_OWNER[status]}
              </div>

              {/* Status label */}
              <div
                className="mb-2 text-center text-[10px] font-semibold uppercase tracking-[0.05em]"
                style={{
                  color: isCompleted
                    ? "#28a745"
                    : isCurrent
                    ? "#0d08d2"
                    : "#9CA3AF",
                }}
              >
                {STATUS_LABEL[status]}
              </div>

              {/* Circle row with connecting lines */}
              <div className="flex w-full items-center">
                {/* left line */}
                <div className="flex-1">
                  {idx > 0 && (
                    <div
                      className="h-[2px] w-full"
                      style={{
                        background: idx <= currentIdx ? "#28a745" : "transparent",
                        borderTop: idx <= currentIdx ? "none" : "2px dashed #D1D5DB",
                      }}
                    />
                  )}
                </div>

                {/* Node */}
                <button
                  disabled={isCompleted || isCurrent}
                  onClick={() => !(isCompleted || isCurrent) && setPending(status)}
                  title={
                    isCompleted || isCurrent
                      ? STATUS_LABEL[status]
                      : `Set status to ${STATUS_LABEL[status]}`
                  }
                  className={`flex h-[18px] w-[18px] shrink-0 items-center justify-center rounded-full transition-transform ${
                    !(isCompleted || isCurrent)
                      ? "cursor-pointer hover:scale-110"
                      : "cursor-default"
                  }`}
                  style={{
                    background: isCompleted
                      ? "#28a745"
                      : isCurrent
                      ? "#0d08d2"
                      : "#FFFFFF",
                    border: isCompleted || isCurrent ? "none" : "2px solid #D1D5DB",
                  }}
                >
                  {isCompleted ? (
                    <Check size={10} strokeWidth={3} color="#fff" />
                  ) : isCurrent ? (
                    <span className="h-2 w-2 rounded-full bg-white" />
                  ) : null}
                </button>

                {/* right line */}
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
            </div>
          );
        })}
      </div>

      {/* Confirmation popup */}
      {pending && (
        <div className="fixed inset-0 z-40 flex items-center justify-center bg-black/30">
          <div className="w-[320px] rounded-card bg-white p-5 shadow-panel">
            <p className="text-sm font-semibold text-ink">
              Set status to {STATUS_LABEL[pending].toUpperCase()}?
            </p>
            <p className="mt-1 text-xs text-gray-500">
              This will be recorded in the risk's status history and cannot be undone.
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
                className="rounded-btn bg-emerald px-3 py-1.5 text-sm font-semibold text-white hover:opacity-90"
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
