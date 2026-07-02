import { useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { LayoutGrid, Table2, Plus } from "lucide-react";
import { RISK_STATUSES, type RiskPriority, type RiskStatus } from "../types";
import { useRiskStore } from "../store/riskStore";
import { useAuthStore, currentIdentity } from "../store/authStore";
import { createRisk } from "../firebase/firestore";
import {
  PRIORITY_META,
  STATUS_LABEL,
  formatDate,
  initials,
  pickResponsible,
} from "../lib/format";
import { toast } from "../lib/toast";
import RiskCard from "../components/risk/RiskCard";

type View = "board" | "table";

function roleOrganizations(r: ReturnType<typeof useRiskStore.getState>["roles"][number]): string[] {
  return [
    r.accountable,
    r.consulted,
    r.responsibleCustomer,
    r.responsibleContractor,
    ...r.informedCustomer,
    ...r.informedContractor,
  ]
    .filter((p): p is NonNullable<typeof p> => p !== null)
    .map((p) => p.organization);
}

export default function RiskBoard() {
  const navigate = useNavigate();
  const { risks, roles, projectId, loading } = useRiskStore();
  const user = useAuthStore((s) => s.user);
  const me = currentIdentity(user);

  const [view, setView] = useState<View>("board");
  const [fWorkstream, setFWorkstream] = useState("");
  const [fOrg, setFOrg] = useState("");
  const [fPriority, setFPriority] = useState("");
  const [fStatus, setFStatus] = useState("");

  const workstreams = [...new Set(roles.map((r) => r.workstream))];
  const orgs = [...new Set(roles.flatMap(roleOrganizations))];

  const filtered = useMemo(() => {
    return risks.filter((risk) => {
      const riskRoles = roles.filter((r) => risk.workstreamIds.includes(r.id));
      if (fWorkstream && !riskRoles.some((r) => r.workstream === fWorkstream))
        return false;
      if (fOrg && !riskRoles.some((r) => roleOrganizations(r).includes(fOrg)))
        return false;
      if (fPriority && risk.priority !== fPriority) return false;
      if (fStatus && risk.status !== fStatus) return false;
      return true;
    });
  }, [risks, roles, fWorkstream, fOrg, fPriority, fStatus]);

  async function handleNewRisk() {
    if (!projectId) return;
    try {
      const id = await createRisk(projectId, me.uid, { title: "New risk" });
      navigate(`/risks/${id}`);
    } catch {
      toast.error("Could not create risk");
    }
  }

  const selectCls =
    "rounded-input border border-bordergray bg-white px-2.5 py-1.5 text-xs text-gray-600 outline-none focus:border-indigo";

  return (
    <div className="flex h-full flex-col">
      {/* Header */}
      <div className="flex items-center justify-between border-b border-bordergray bg-white px-6 py-4">
        <div>
          <h1 className="text-lg font-bold text-ink">Risk Board</h1>
          <p className="text-xs text-gray-400">
            {filtered.length} of {risks.length} risks
          </p>
        </div>
        <div className="flex items-center gap-2">
          <div className="flex overflow-hidden rounded-btn border border-bordergray">
            <button
              onClick={() => setView("board")}
              className={`flex items-center gap-1.5 px-3 py-1.5 text-sm ${
                view === "board"
                  ? "bg-indigo text-white"
                  : "bg-white text-gray-500 hover:bg-gray-50"
              }`}
            >
              <LayoutGrid size={15} /> Board
            </button>
            <button
              onClick={() => setView("table")}
              className={`flex items-center gap-1.5 px-3 py-1.5 text-sm ${
                view === "table"
                  ? "bg-indigo text-white"
                  : "bg-white text-gray-500 hover:bg-gray-50"
              }`}
            >
              <Table2 size={15} /> Table
            </button>
          </div>
          <button
            onClick={handleNewRisk}
            className="flex items-center gap-1.5 rounded-btn bg-indigo px-3 py-1.5 text-sm font-semibold text-white hover:bg-indigo/90"
          >
            <Plus size={16} /> New Risk
          </button>
        </div>
      </div>

      {/* Filters */}
      <div className="flex flex-wrap items-center gap-2 border-b border-bordergray bg-white px-6 py-2.5">
        <select
          className={selectCls}
          value={fWorkstream}
          onChange={(e) => setFWorkstream(e.target.value)}
        >
          <option value="">All workstreams</option>
          {workstreams.map((w) => (
            <option key={w}>{w}</option>
          ))}
        </select>
        <select
          className={selectCls}
          value={fOrg}
          onChange={(e) => setFOrg(e.target.value)}
        >
          <option value="">All organizations</option>
          {orgs.map((o) => (
            <option key={o}>{o}</option>
          ))}
        </select>
        <select
          className={selectCls}
          value={fPriority}
          onChange={(e) => setFPriority(e.target.value)}
        >
          <option value="">All priorities</option>
          {(["low", "medium", "high", "critical"] as RiskPriority[]).map((p) => (
            <option key={p} value={p}>
              {PRIORITY_META[p].label}
            </option>
          ))}
        </select>
        <select
          className={selectCls}
          value={fStatus}
          onChange={(e) => setFStatus(e.target.value)}
        >
          <option value="">All statuses</option>
          {RISK_STATUSES.map((s) => (
            <option key={s} value={s}>
              {STATUS_LABEL[s]}
            </option>
          ))}
        </select>
      </div>

      {/* Content */}
      <div className="scroll-thin flex-1 overflow-auto p-6">
        {loading ? (
          <div className="text-sm text-gray-400">Loading risks…</div>
        ) : view === "board" ? (
          <div className="grid grid-cols-4 gap-4">
            {RISK_STATUSES.map((status) => {
              const col = filtered.filter((r) => r.status === status);
              return (
                <div key={status} className="flex flex-col gap-3">
                  <div className="flex items-center justify-between">
                    <span className="text-[12px] font-semibold uppercase tracking-wide text-gray-500">
                      {STATUS_LABEL[status]}
                    </span>
                    <span className="rounded-full bg-gray-200 px-2 text-[11px] text-gray-600">
                      {col.length}
                    </span>
                  </div>
                  <div className="flex flex-col gap-2">
                    {col.map((risk) => (
                      <RiskCard key={risk.id} risk={risk} roles={roles} />
                    ))}
                    {col.length === 0 && (
                      <div className="rounded-card border border-dashed border-bordergray py-6 text-center text-[11px] text-gray-300">
                        No risks
                      </div>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        ) : (
          <TableView risks={filtered} roles={roles} onOpen={(id) => navigate(`/risks/${id}`)} />
        )}
      </div>
    </div>
  );
}

function TableView({
  risks,
  roles,
  onOpen,
}: {
  risks: ReturnType<typeof useRiskStore.getState>["risks"];
  roles: ReturnType<typeof useRiskStore.getState>["roles"];
  onOpen: (id: string) => void;
}) {
  return (
    <div className="overflow-hidden rounded-card border border-bordergray bg-white shadow-card">
      <table className="w-full text-left text-sm">
        <thead className="bg-gray-50 text-[11px] uppercase tracking-wide text-gray-400">
          <tr>
            <th className="px-4 py-2.5">ID</th>
            <th className="px-4 py-2.5">Title</th>
            <th className="px-4 py-2.5">Status</th>
            <th className="px-4 py-2.5">Priority</th>
            <th className="px-4 py-2.5">Workstream</th>
            <th className="px-4 py-2.5">Due</th>
            <th className="px-4 py-2.5">Responsible</th>
          </tr>
        </thead>
        <tbody>
          {risks.map((risk) => {
            const prio = PRIORITY_META[risk.priority];
            const responsible = roles
              .filter((r) => risk.workstreamIds.includes(r.id))
              .map(pickResponsible)
              .find((p) => p !== null);
            const workstreams = [
              ...new Set(
                roles
                  .filter((r) => risk.workstreamIds.includes(r.id))
                  .map((r) => r.workstream)
              ),
            ];
            return (
              <tr
                key={risk.id}
                onClick={() => onOpen(risk.id)}
                className="cursor-pointer border-t border-bordergray hover:bg-gray-50"
              >
                <td className="px-4 py-2.5 font-mono text-[12px] text-gray-500">
                  {risk.riskId}
                </td>
                <td className="px-4 py-2.5 font-medium text-ink">
                  {risk.title}
                </td>
                <td className="px-4 py-2.5 text-gray-600">
                  {STATUS_LABEL[risk.status as RiskStatus]}
                </td>
                <td className="px-4 py-2.5">
                  <span
                    className="inline-flex items-center gap-1.5"
                    style={{ color: prio.text }}
                  >
                    <span
                      className="h-2 w-2 rounded-full"
                      style={{ background: prio.dot }}
                    />
                    {prio.label}
                  </span>
                </td>
                <td className="px-4 py-2.5 text-gray-500">
                  {workstreams.join(", ") || "—"}
                </td>
                <td className="px-4 py-2.5 text-gray-500">
                  {formatDate(risk.dueDate)}
                </td>
                <td className="px-4 py-2.5">
                  {responsible ? (
                    <span className="flex items-center gap-2">
                      <span className="flex h-6 w-6 items-center justify-center rounded-full bg-indigo/15 text-[9px] font-semibold text-indigo">
                        {initials(responsible.name)}
                      </span>
                      <span className="text-xs text-gray-600">
                        {responsible.name}
                      </span>
                    </span>
                  ) : (
                    "—"
                  )}
                </td>
              </tr>
            );
          })}
          {risks.length === 0 && (
            <tr>
              <td colSpan={7} className="px-4 py-8 text-center text-gray-300">
                No risks match the current filters.
              </td>
            </tr>
          )}
        </tbody>
      </table>
    </div>
  );
}
