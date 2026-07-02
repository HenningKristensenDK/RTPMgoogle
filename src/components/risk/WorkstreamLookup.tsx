import { X, Check } from "lucide-react";
import type { RoleResponsibility } from "../../types";

interface Props {
  open: boolean;
  roles: RoleResponsibility[];
  selected: string[];
  onToggle: (roleId: string) => void;
  onClose: () => void;
}

export default function WorkstreamLookup({
  open,
  roles,
  selected,
  onToggle,
  onClose,
}: Props) {
  if (!open) return null;

  return (
    <div className="fixed inset-0 z-40 flex justify-end bg-black/30">
      <div className="flex h-full w-[380px] flex-col bg-white shadow-panel">
        <div className="flex items-center justify-between border-b border-bordergray px-5 py-4">
          <h2 className="text-sm font-semibold text-ink">
            Look up in Roles &amp; Responsibility
          </h2>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-700">
            <X size={18} />
          </button>
        </div>

        <div className="scroll-thin flex-1 overflow-auto p-4">
          <div className="flex flex-col gap-1.5">
            {roles.map((r) => {
              const isSel = selected.includes(r.id);
              return (
                <button
                  key={r.id}
                  onClick={() => onToggle(r.id)}
                  className={`flex flex-col gap-1 rounded-btn border px-3 py-2.5 text-left transition-colors ${
                    isSel
                      ? "border-indigo bg-indigo/5"
                      : "border-bordergray hover:bg-gray-50"
                  }`}
                >
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-semibold text-ink">
                      {r.workstream}
                    </span>
                    {isSel && <Check size={16} className="shrink-0 text-indigo" />}
                  </div>
                  <span className="block truncate text-[11px] text-gray-400">
                    Accountable: {r.accountable.name} ({r.accountable.organization})
                  </span>
                </button>
              );
            })}
          </div>
          {roles.length === 0 && (
            <p className="text-sm text-gray-400">
              No workstreams defined yet. Add entries in Roles &amp;
              Responsibility.
            </p>
          )}
        </div>

        <div className="border-t border-bordergray px-5 py-3 text-right">
          <button
            onClick={onClose}
            className="rounded-btn bg-indigo px-4 py-2 text-sm font-semibold text-white hover:bg-indigo/90"
          >
            Done ({selected.length})
          </button>
        </div>
      </div>
    </div>
  );
}
