import { useState } from "react";
import { Search } from "lucide-react";
import {
  DOCUMENT_TYPES,
  type DocumentItem,
  type DocumentType,
  type RoleResponsibility,
} from "../../types";
import WorkstreamLookup from "../risk/WorkstreamLookup";

interface Props {
  item: DocumentItem;
  roles: RoleResponsibility[];
  onPatch: (patch: Partial<DocumentItem>) => void;
}

const labelCls = "mb-1 block text-[12px] font-medium text-gray-500";
const fieldCls =
  "w-full rounded-input border border-bordergray bg-white px-2.5 py-2 text-sm text-ink outline-none focus:border-indigo focus:ring-1 focus:ring-indigo";

export default function DocumentMetadata({ item, roles, onPatch }: Props) {
  const [lookupOpen, setLookupOpen] = useState(false);

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
      <div>
        <label className={labelCls}>Document Type</label>
        <select
          className={fieldCls}
          value={item.type}
          onChange={(e) => onPatch({ type: e.target.value as DocumentType })}
        >
          {DOCUMENT_TYPES.map((t) => (
            <option key={t} value={t}>
              {t}
            </option>
          ))}
        </select>
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
