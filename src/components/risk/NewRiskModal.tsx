import { useState } from "react";
import { Timestamp } from "firebase/firestore";
import type { RiskImpactDriver, RiskKind, RoleResponsibility } from "../../types";
import { SCORE_LEVELS, LIKELIHOOD_LABELS, IMPACT_LABELS, IMPACT_DRIVERS } from "../../lib/riskScoring";

interface Props {
  roles: RoleResponsibility[];
  onCreate: (data: {
    kind: RiskKind;
    title: string;
    likelihood: number;
    impactScore: number;
    impactDriver: RiskImpactDriver;
    dueDate: Timestamp | null;
    workstreamIds: string[];
  }) => void;
  onCancel: () => void;
}

const labelCls = "mb-1 block text-[12px] font-medium text-gray-500";
const fieldCls =
  "w-full rounded-input border border-bordergray bg-white px-2.5 py-2 text-sm text-ink outline-none focus:border-indigo focus:ring-1 focus:ring-indigo";

const KIND_COPY: Record<RiskKind, { heading: string; placeholder: string; create: string; discardNoun: string }> = {
  risk: {
    heading: "New risk",
    placeholder: "e.g. Late steel delivery",
    create: "Create risk",
    discardNoun: "risk",
  },
  opportunity: {
    heading: "New opportunity",
    placeholder: "e.g. Early completion bonus on civil works",
    create: "Create opportunity",
    discardNoun: "opportunity",
  },
};

export default function NewRiskModal({ roles, onCreate, onCancel }: Props) {
  const [kind, setKind] = useState<RiskKind>("risk");
  const [title, setTitle] = useState("");
  const [likelihood, setLikelihood] = useState(3);
  const [impactScore, setImpactScore] = useState(3);
  const [impactDriver, setImpactDriver] = useState<RiskImpactDriver>("Schedule");
  const [dueDate, setDueDate] = useState("");
  const [workstreamIds, setWorkstreamIds] = useState<string[]>([]);
  const [confirmDiscard, setConfirmDiscard] = useState(false);
  const copy = KIND_COPY[kind];

  const dirty =
    title.trim() !== "" ||
    likelihood !== 3 ||
    impactScore !== 3 ||
    impactDriver !== "Schedule" ||
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
      kind,
      title: title.trim() || (kind === "opportunity" ? "New opportunity" : "New risk"),
      likelihood,
      impactScore,
      impactDriver,
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
        <h2 className="text-[15px] font-semibold text-ink">{copy.heading}</h2>
        <p className="mt-1 text-[12px] text-gray-400">
          Fill in the basics — you can add full details after creating it.
        </p>

        <div className="mt-4 flex flex-col gap-4">
          <div>
            <label className={labelCls}>Type</label>
            <div className="flex overflow-hidden rounded-input border border-bordergray">
              {(["risk", "opportunity"] as RiskKind[]).map((k) => (
                <button
                  key={k}
                  type="button"
                  onClick={() => setKind(k)}
                  className={`flex-1 py-1.5 text-sm font-medium ${
                    kind === k ? "bg-indigo text-white" : "bg-white text-gray-500 hover:bg-gray-50"
                  }`}
                >
                  {KIND_COPY[k].heading.replace("New ", "")}
                </button>
              ))}
            </div>
          </div>

          <div>
            <label className={labelCls}>Title</label>
            <input
              autoFocus
              className={fieldCls}
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder={copy.placeholder}
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className={labelCls}>Likelihood</label>
              <select
                className={fieldCls}
                value={likelihood}
                onChange={(e) => setLikelihood(Number(e.target.value))}
              >
                {SCORE_LEVELS.map((n) => (
                  <option key={n} value={n}>
                    {n} — {LIKELIHOOD_LABELS[n]}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className={labelCls}>Impact</label>
              <select
                className={fieldCls}
                value={impactScore}
                onChange={(e) => setImpactScore(Number(e.target.value))}
              >
                {SCORE_LEVELS.map((n) => (
                  <option key={n} value={n}>
                    {n} — {IMPACT_LABELS[n]}
                  </option>
                ))}
              </select>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className={labelCls}>Impact driver</label>
              <select
                className={fieldCls}
                value={impactDriver}
                onChange={(e) => setImpactDriver(e.target.value as RiskImpactDriver)}
              >
                {IMPACT_DRIVERS.map((d) => (
                  <option key={d} value={d}>
                    {d}
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
            {copy.create}
          </button>
        </div>
      </div>

      {confirmDiscard && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/20"
          onClick={(e) => e.stopPropagation()}
        >
          <div className="w-[320px] rounded-card bg-white p-5 shadow-panel">
            <p className="text-sm font-semibold text-ink">Discard this {copy.discardNoun}?</p>
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
                {copy.create}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
