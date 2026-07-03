import { useState } from "react";
import { Timestamp } from "firebase/firestore";
import type { RiskPriority, RoleResponsibility } from "../../types";
import { PRIORITY_META } from "../../lib/format";

interface Props {
  roles: RoleResponsibility[];
  onCreate: (data: {
    title: string;
    priority: RiskPriority;
    dueDate: Timestamp | null;
    workstreamIds: string[];
  }) => void;
  onCancel: () => void;
}

const PRIORITIES: RiskPriority[] = ["low", "medium", "high", "critical"];
const labelCls = "mb-1 block text-[12px] font-medium text-gray-500";
const fieldCls =
  "w-full rounded-input border border-bordergray bg-white px-2.5 py-2 text-sm text-ink outline-none focus:border-indigo focus:ring-1 focus:ring-indigo";

export default function NewRiskModal({ roles, onCreate, onCancel }: Props) {
  const [title, setTitle] = useState("");
  const [priority, setPriority] = useState<RiskPriority>("medium");
  const [dueDate, setDueDate] = useState("");
  const [workstreamIds, setWorkstreamIds] = useState<string[]>([]);
  const [confirmDiscard, setConfirmDiscard] = useState(false);

  const dirty =
    title.trim() !== "" ||
    priority !== "medium" ||
    dueDate !== "" ||
    workstreamIds.length > 0;

  function requestClose() {
    if (dirty) setConfirmDiscard(true);
    else onCancel();
  }

  function toggleWorkstream(id: string) {
    setWorkstreamIds((prev) =>
      prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]
    );
  }

  function handleCreate() {
    onCreate({
      title: title.trim() || "New risk",
      priority,
      dueDate: dueDate ? Timestamp.fromDate(new Date(dueDate)) : null,
      workstreamIds,
    });
  }

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-6"
      style={{ background: "rgba(7, 4, 116, 0.45)" }}
      onClick={(e) => e.target === e.currentTarget && requestClose()}
    >
      <div className="w-full max-w-md rounded-2xl bg-white p-6 shadow-2xl">
        <h2 className="text-[15px] font-semibold text-ink">New risk</h2>
        <p className="mt-1 text-[12px] text-gray-400">
          Fill in the basics — you can add full details after creating it.
        </p>

        <div className="mt-4 flex flex-col gap-4">
          <div>
            <label className={labelCls}>Title</label>
            <input
              autoFocus
              className={fieldCls}
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="e.g. Late steel delivery"
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className={labelCls}>Priority</label>
              <select
                className={fieldCls}
                value={priority}
                onChange={(e) => setPriority(e.target.value as RiskPriority)}
              >
                {PRIORITIES.map((p) => (
                  <option key={p} value={p}>
                    {PRIORITY_META[p].label}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className={labelCls}>Due date</label>
              <input
                type="date"
                className={fieldCls}
                value={dueDate}
                onChange={(e) => setDueDate(e.target.value)}
              />
            </div>
          </div>

          <div>
            <label className={labelCls}>Workstream</label>
            <div className="flex max-h-32 flex-wrap gap-1.5 overflow-auto rounded-input border border-bordergray p-2">
              {roles.length === 0 && (
                <span className="text-sm text-gray-400">No workstreams available</span>
              )}
              {roles.map((r) => (
                <button
                  key={r.id}
                  type="button"
                  onClick={() => toggleWorkstream(r.id)}
                  className={`rounded-full px-2.5 py-1 text-[11px] font-medium ${
                    workstreamIds.includes(r.id)
                      ? "bg-indigo text-white"
                      : "border border-bordergray text-gray-600 hover:bg-gray-50"
                  }`}
                >
                  {r.workstream}
                </button>
              ))}
            </div>
          </div>
        </div>

        <div className="mt-6 flex justify-end gap-2">
          <button
            onClick={requestClose}
            className="rounded-btn border border-bordergray px-4 py-1.5 text-sm text-gray-600 hover:bg-gray-50"
          >
            Cancel
          </button>
          <button
            onClick={handleCreate}
            className="rounded-btn bg-indigo px-4 py-1.5 text-sm font-semibold text-white hover:bg-indigo/90"
          >
            Create risk
          </button>
        </div>
      </div>

      {confirmDiscard && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/20"
          onClick={(e) => e.stopPropagation()}
        >
          <div className="w-[320px] rounded-card bg-white p-5 shadow-panel">
            <p className="text-sm font-semibold text-ink">Discard this risk?</p>
            <p className="mt-1 text-sm text-gray-500">
              You've entered some details that haven't been saved yet.
            </p>
            <div className="mt-4 flex flex-wrap justify-end gap-2">
              <button
                onClick={() => setConfirmDiscard(false)}
                className="rounded-btn border border-bordergray px-3 py-1.5 text-sm text-gray-600 hover:bg-gray-50"
              >
                Keep editing
              </button>
              <button
                onClick={onCancel}
                className="rounded-btn border border-critical px-3 py-1.5 text-sm font-semibold text-critical hover:bg-red-50"
              >
                Discard
              </button>
              <button
                onClick={handleCreate}
                className="rounded-btn bg-indigo px-3 py-1.5 text-sm font-semibold text-white hover:bg-indigo/90"
              >
                Save risk
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
