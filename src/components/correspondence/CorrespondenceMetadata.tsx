import { useState } from "react";
import { Search } from "lucide-react";
import { Timestamp } from "firebase/firestore";
import {
  CORRESPONDENCE_TYPES,
  type CorrespondenceItem,
  type CorrespondenceType,
  type RiskPriority,
  type RoleResponsibility,
} from "../../types";
import { PRIORITY_META, formatDateInput } from "../../lib/format";
import WorkstreamLookup from "../risk/WorkstreamLookup";

interface Props {
  item: CorrespondenceItem;
  roles: RoleResponsibility[];
  onPatch: (patch: Partial<CorrespondenceItem>) => void;
}

const labelCls = "mb-1 block text-[12px] font-medium text-gray-500";
const fieldCls =
  "w-full rounded-input border border-bordergray bg-white px-2.5 py-2 text-sm text-ink outline-none focus:border-indigo focus:ring-1 focus:ring-indigo";

const PRIORITIES: RiskPriority[] = ["low", "medium", "high", "critical"];

export default function CorrespondenceMetadata({ item, roles, onPatch }: Props) {
  const [lookupOpen, setLookupOpen] = useState(false);

  function dateToTs(value: string): Timestamp | null {
    return value ? Timestamp.fromDate(new Date(value)) : null;
  }

  function toggleWorkstream(roleId: string) {
    const next = item.workstreamIds.includes(roleId)
      ? item.workstreamIds.filter((id) => id !== roleId)
      : [...item.workstreamIds, roleId];
    onPatch({ workstreamIds: next });
  }

  const selectedRoles = roles.filter((r) => item.workstreamIds.includes(r.id));
  const selectedWorkstreams = [
    ...new Set(selectedRoles.map((r) => r.workstream)),
  ];

  return (
    <div className="rounded-card bg-white p-6 shadow-card">
      <div className="grid grid-cols-2 gap-x-6 gap-y-4">
        {/* Type */}
        <div>
          <label className={labelCls}>Type</label>
          <select
            className={fieldCls}
            value={item.type}
            onChange={(e) => onPatch({ type: e.target.value as CorrespondenceType })}
          >
            {CORRESPONDENCE_TYPES.map((t) => (
              <option key={t} value={t}>
                {t}
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
              style={{ background: PRIORITY_META[item.priority].dot }}
            />
            <select
              className={`${fieldCls} pl-7`}
              value={item.priority}
              onChange={(e) => onPatch({ priority: e.target.value as RiskPriority })}
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
            value={formatDateInput(item.startDate)}
            onChange={(e) => onPatch({ startDate: dateToTs(e.target.value) })}
          />
        </div>

        {/* Due date */}
        <div>
          <label className={labelCls}>Due date</label>
          <input
            type="date"
            className={fieldCls}
            value={formatDateInput(item.dueDate)}
            onChange={(e) => onPatch({ dueDate: dateToTs(e.target.value) })}
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
        selected={item.workstreamIds}
        onToggle={toggleWorkstream}
        onClose={() => setLookupOpen(false)}
      />
    </div>
  );
}
