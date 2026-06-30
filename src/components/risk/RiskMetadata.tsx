import { useState } from "react";
import { Search } from "lucide-react";
import { Timestamp } from "firebase/firestore";
import type {
  Risk,
  RiskPriority,
  RiskStatus,
  RoleResponsibility,
} from "../../types";
import { RISK_STATUSES } from "../../types";
import { PRIORITY_META, STATUS_LABEL, formatDateInput } from "../../lib/format";
import WorkstreamLookup from "./WorkstreamLookup";

interface Props {
  risk: Risk;
  roles: RoleResponsibility[];
  onPatch: (patch: Partial<Risk>) => void;
}

const labelCls = "mb-1 block text-[12px] font-medium text-gray-500";
const fieldCls =
  "w-full rounded-input border border-bordergray bg-white px-2.5 py-2 text-sm text-ink outline-none focus:border-indigo focus:ring-1 focus:ring-indigo";

const PRIORITIES: RiskPriority[] = ["low", "medium", "high", "critical"];

export default function RiskMetadata({ risk, roles, onPatch }: Props) {
  const [lookupOpen, setLookupOpen] = useState(false);

  function dateToTs(value: string): Timestamp | null {
    return value ? Timestamp.fromDate(new Date(value)) : null;
  }

  function toggleWorkstream(roleId: string) {
    const next = risk.workstreamIds.includes(roleId)
      ? risk.workstreamIds.filter((id) => id !== roleId)
      : [...risk.workstreamIds, roleId];
    onPatch({ workstreamIds: next });
  }

  const selectedRoles = roles.filter((r) => risk.workstreamIds.includes(r.id));
  const selectedWorkstreams = [
    ...new Set(selectedRoles.map((r) => r.workstream)),
  ];

  return (
    <div className="rounded-card bg-white p-6 shadow-card">
      <div className="grid grid-cols-2 gap-x-6 gap-y-4">
        {/* Status */}
        <div>
          <label className={labelCls}>Status</label>
          <select
            className={fieldCls}
            value={risk.status}
            onChange={(e) => onPatch({ status: e.target.value as RiskStatus })}
          >
            {RISK_STATUSES.map((s) => (
              <option key={s} value={s}>
                {STATUS_LABEL[s]}
              </option>
            ))}
          </select>
        </div>

        {/* Priority */}
        <div>
          <label className={labelCls}>Priority</label>
          <div className="relative">
            <span
              className="pointer-events-none absolute left-2.5 top-1/2 h-2.5 w-2.5 -translate-y-1/2 rounded-full"
              style={{ background: PRIORITY_META[risk.priority].dot }}
            />
            <select
              className={`${fieldCls} pl-7`}
              value={risk.priority}
              onChange={(e) =>
                onPatch({ priority: e.target.value as RiskPriority })
              }
            >
              {PRIORITIES.map((p) => (
                <option key={p} value={p}>
                  {PRIORITY_META[p].label}
                </option>
              ))}
            </select>
          </div>
        </div>

        {/* Start date */}
        <div>
          <label className={labelCls}>Start date</label>
          <input
            type="date"
            className={fieldCls}
            value={formatDateInput(risk.startDate)}
            onChange={(e) => onPatch({ startDate: dateToTs(e.target.value) })}
          />
        </div>

        {/* Due date */}
        <div>
          <label className={labelCls}>Due date</label>
          <input
            type="date"
            className={fieldCls}
            value={formatDateInput(risk.dueDate)}
            onChange={(e) => onPatch({ dueDate: dateToTs(e.target.value) })}
          />
        </div>

        {/* Risk collection */}
        <div>
          <label className={labelCls}>Risk collection</label>
          <input
            className={fieldCls}
            value={risk.collection || ""}
            placeholder="e.g. Data Center Phase 1"
            onChange={(e) => onPatch({ collection: e.target.value })}
          />
        </div>
      </div>

      {/* Workstream multi-select with lookup */}
      <div className="mt-4">
        <label className={labelCls}>Workstream</label>
        <div className="flex items-center gap-2">
          <div className="flex min-h-[38px] flex-1 flex-wrap items-center gap-1.5 rounded-input border border-bordergray px-2 py-1.5">
            {selectedWorkstreams.length === 0 && (
              <span className="text-sm text-gray-400">No workstream selected</span>
            )}
            {selectedWorkstreams.map((ws) => (
              <span
                key={ws}
                className="rounded-full bg-indigo/10 px-2 py-0.5 text-[11px] font-medium text-indigo"
              >
                {ws}
              </span>
            ))}
          </div>
          <button
            onClick={() => setLookupOpen(true)}
            className="flex shrink-0 items-center gap-1.5 rounded-btn border border-bordergray px-3 py-2 text-sm text-gray-600 hover:bg-gray-50"
          >
            <Search size={15} /> Look up in R&amp;R
          </button>
        </div>
      </div>

      <WorkstreamLookup
        open={lookupOpen}
        roles={roles}
        selected={risk.workstreamIds}
        onToggle={toggleWorkstream}
        onClose={() => setLookupOpen(false)}
      />
    </div>
  );
}
