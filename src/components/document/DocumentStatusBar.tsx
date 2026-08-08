import { useState } from "react";
import { Check, Ban, RotateCcw } from "lucide-react";
import {
  DOCUMENT_TRACK_STATUSES,
  type DocumentItem,
  type DocumentStatus,
  type RoleResponsibility,
} from "../../types";
import { DOCUMENT_STATUS_LABEL as STEP_LABEL, formatDateYMD, pickResponsible } from "../../lib/format";

interface Props {
  item: DocumentItem;
  roles: RoleResponsibility[];
  onChangeStatus: (to: DocumentStatus) => void;
}

export default function DocumentStatusBar({ item, roles, onChangeStatus }: Props) {
  const [pending, setPending] = useState<DocumentStatus | null>(null);
  const isObsolete = item.status === "obsolete";
  const currentIdx = isObsolete ? -1 : DOCUMENT_TRACK_STATUSES.indexOf(item.status);
  const history = item.statusHistory || [];

  const itemRoles = roles.filter((r) => item.workstreamIds.includes(r.id));
  const accountableName = itemRoles[0]?.accountable.name ?? null;
  const responsibleName = itemRoles.map(pickResponsible).find((p) => p !== null)?.name ?? null;

  // Last time the item transitioned TO this status — handles the ping-pong case
  // where a status may have been visited more than once.
  function lastEntry(status: DocumentStatus) {
    return [...history].reverse().find((h) => h.to === status);
  }

  function ownerLabel(status: DocumentStatus): string {
    const changedBy = lastEntry(status)?.changedBy;
    if (changedBy) return changedBy;
    if (status === "sent_accountable" && accountableName) return accountableName;
    if (status === "sent_responsible" && responsibleName) return responsibleName;
    if (status === "registered") return "Document Control";
    return "—";
  }

  const obsoleteEntry = lastEntry("obsolete");
  const isReactivating = isObsolete && pending !== null && pending !== "obsolete";

  if (isObsolete) {
    return (
      <div className="flex items-center justify-between gap-3 rounded-btn bg-red-50 px-3 py-2">
        <span className="flex items-center gap-2 text-[12px] font-medium text-critical">
          <Ban size={14} />
          Marked obsolete
          {obsoleteEntry?.changedBy ? ` by ${obsoleteEntry.changedBy}` : ""}
          {obsoleteEntry?.changedAt ? ` on ${formatDateYMD(obsoleteEntry.changedAt)}` : ""}
        </span>
        <button
          onClick={() => setPending("registered")}
          className="flex shrink-0 items-center gap-1 rounded-btn border border-critical px-2 py-1 text-[11px] font-semibold text-critical hover:bg-red-100"
        >
          <RotateCcw size={12} /> Reactivate
        </button>
        {pending && (
          <ConfirmDialog
            label={STEP_LABEL[pending]}
            title={isReactivating ? "Reactivate this document?" : "Change status?"}
            danger={false}
            onCancel={() => setPending(null)}
            onConfirm={() => {
              onChangeStatus(pending);
              setPending(null);
            }}
          />
        )}
      </div>
    );
  }

  return (
    <div className="flex items-center gap-3">
      <div className="flex flex-1 items-start">
        {DOCUMENT_TRACK_STATUSES.map((status, idx) => {
          const isGreen = idx <= currentIdx;
          const isNext = idx === currentIdx + 1;
          const isLast = idx === DOCUMENT_TRACK_STATUSES.length - 1;
          const leftLineSolid = isGreen;
          const rightLineSolid = idx < currentIdx;

          return (
            <div key={status} className="flex flex-1 flex-col items-center">
              <div
                className="text-center text-[10px] font-semibold uppercase tracking-[0.04em]"
                style={{ color: isGreen ? "#28a745" : isNext ? "#0d08d2" : "#8a8ca6" }}
              >
                {STEP_LABEL[status]}
              </div>

              <div className="mt-1 flex w-full items-center">
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
                  title={`Set status to ${STEP_LABEL[status]}`}
                  className="flex h-[16px] w-[16px] shrink-0 cursor-pointer items-center justify-center rounded-full transition-transform hover:scale-110"
                  style={{
                    background: isGreen ? "#28a745" : "transparent",
                    border: isGreen ? "none" : isNext ? "2px solid #0d08d2" : "2px solid #D1D5DB",
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

              <div
                className="mt-0.5 max-w-full truncate px-1 text-center text-[10.5px] font-medium leading-tight"
                style={{ color: "#8a8ca6" }}
                title={ownerLabel(status)}
              >
                {ownerLabel(status)}
              </div>
            </div>
          );
        })}
      </div>

      <button
        onClick={() => setPending("obsolete")}
        title="Mark obsolete"
        className="flex shrink-0 items-center gap-1 rounded-btn border border-bordergray px-2 py-1 text-[10.5px] font-medium text-gray-500 hover:border-critical hover:text-critical"
      >
        <Ban size={12} /> Obsolete
      </button>

      {pending && (
        <ConfirmDialog
          label={STEP_LABEL[pending]}
          title={pending === "obsolete" ? "Mark this document obsolete?" : "Change status?"}
          danger={pending === "obsolete"}
          onCancel={() => setPending(null)}
          onConfirm={() => {
            onChangeStatus(pending);
            setPending(null);
          }}
        />
      )}
    </div>
  );
}

function ConfirmDialog({
  label,
  title,
  danger,
  onCancel,
  onConfirm,
}: {
  label: string;
  title: string;
  danger: boolean;
  onCancel: () => void;
  onConfirm: () => void;
}) {
  return (
    <div className="fixed inset-0 z-40 flex items-center justify-center bg-black/30">
      <div className="w-[320px] rounded-card bg-white p-5 shadow-panel">
        <p className="text-sm font-semibold text-ink">{title}</p>
        <p className="mt-1 text-sm text-gray-500">
          Set this document to <span className="font-medium text-ink">{label}</span>?
        </p>
        <div className="mt-4 flex justify-end gap-2">
          <button
            onClick={onCancel}
            className="rounded-btn border border-bordergray px-3 py-1.5 text-sm text-gray-600 hover:bg-gray-50"
          >
            Cancel
          </button>
          <button
            onClick={onConfirm}
            className="rounded-btn px-3 py-1.5 text-sm font-semibold text-white hover:opacity-90"
            style={{ background: danger ? "#e63946" : "#0d08d2" }}
          >
            Confirm
          </button>
        </div>
      </div>
    </div>
  );
}
