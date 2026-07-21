import { useEffect, useMemo, useState } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { LayoutGrid, Table2, Plus, Trash2 } from "lucide-react";
import { Timestamp } from "firebase/firestore";
import {
  RISK_STATUSES,
  type Organization,
  type Risk,
  type RiskKind,
  type RiskPriority,
  type RiskStatus,
} from "../types";
import { useRiskStore } from "../store/riskStore";
import { useAuthStore, currentIdentity } from "../store/authStore";
import { createRisk, deleteRisk, watchOrganizations } from "../firebase/firestore";
import {
  PRIORITY_META,
  STATUS_LABEL,
  formatDate,
  pickResponsible,
  riskKind,
} from "../lib/format";
import { tierColor } from "../lib/tiers";
import { toast } from "../lib/toast";
import RiskCard from "../components/risk/RiskCard";
import RiskSummaryDashboard from "../components/risk/RiskSummaryDashboard";
import NewRiskModal from "../components/risk/NewRiskModal";
import PersonAvatar from "../components/common/PersonAvatar";

type View = "board" | "table";

interface PresetFilters {
  presetWorkstream?: string;
  presetPriority?: RiskPriority;
  presetKind?: RiskKind;
}

function roleOrganizations(r: ReturnType<typeof useRiskStore.getState>["roles"][number]): string[] {
  return [
    r.accountable,
    ...r.consulted,
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
  const location = useLocation();
  const { risks, roles, projectId, loading } = useRiskStore();
  const user = useAuthStore((s) => s.user);
  const me = currentIdentity(user);

  // Dashboard drill-downs (e.g. clicking a risk matrix cell) navigate here with
  // preset filters in nav state — read once on mount as the initial filter values.
  const presetFilters = (location.state as PresetFilters | null) ?? {};

  const [view, setView] = useState<View>("table");
  const [fWorkstream, setFWorkstream] = useState(presetFilters.presetWorkstream ?? "");
  const [fOrg, setFOrg] = useState("");
  const [fPriority, setFPriority] = useState<RiskPriority | "">(presetFilters.presetPriority ?? "");
  const [fStatus, setFStatus] = useState("");
  const [fKind, setFKind] = useState<RiskKind | "">(presetFilters.presetKind ?? "");
  const [barWorkstream, setBarWorkstream] = useState<string | null>(null);
  const [barTodo, setBarTodo] = useState<string | null>(null);
  const [newRiskOpen, setNewRiskOpen] = useState(false);
  const [orgs, setOrgs] = useState<Organization[]>([]);

  useEffect(() => {
    if (!projectId) return;
    return watchOrganizations(projectId, setOrgs);
  }, [projectId]);

  const workstreams = [...new Set(roles.map((r) => r.workstream))];
  const orgNames = [...new Set(roles.flatMap(roleOrganizations))];

  const filtered = useMemo(() => {
    return risks.filter((risk) => {
      const riskRoles = roles.filter((r) => risk.workstreamIds.includes(r.id));
      if (fWorkstream && !riskRoles.some((r) => r.workstream === fWorkstream))
        return false;
      if (fOrg && !riskRoles.some((r) => roleOrganizations(r).includes(fOrg)))
        return false;
      if (fPriority && risk.priority !== fPriority) return false;
      if (fStatus && risk.status !== fStatus) return false;
      if (fKind && riskKind(risk) !== fKind) return false;
      return true;
    });
  }, [risks, roles, fWorkstream, fOrg, fPriority, fStatus, fKind]);

  const tableRisks = useMemo(() => {
    return filtered.filter((risk) => {
      const riskRoles = roles.filter((r) => risk.workstreamIds.includes(r.id));
      if (barWorkstream && !riskRoles.some((r) => r.workstream === barWorkstream))
        return false;
      if (
        barTodo &&
        !riskRoles.some(
          (r) => r.responsibleCustomer?.organization === barTodo || r.responsibleContractor?.organization === barTodo
        )
      )
        return false;
      return true;
    });
  }, [filtered, roles, barWorkstream, barTodo]);

  async function handleCreateRisk(data: {
    kind: RiskKind;
    title: string;
    priority: RiskPriority;
    dueDate: Timestamp | null;
    workstreamIds: string[];
  }) {
    if (!projectId) return;
    try {
      const id = await createRisk(projectId, me.uid, data);
      setNewRiskOpen(false);
      navigate(`/risks/${id}`, { state: { background: location } });
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
          <h1 className="text-lg font-bold text-ink">Risk Register</h1>
          <p className="text-xs text-gray-400">
            {filtered.length} of {risks.length} items
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
            onClick={() => setNewRiskOpen(true)}
            className="flex items-center gap-1.5 rounded-btn bg-indigo px-3 py-1.5 text-sm font-semibold text-white hover:bg-indigo/90"
          >
            <Plus size={16} /> New
          </button>
        </div>
      </div>

      {/* Filters */}
      <div className="flex flex-wrap items-center gap-2 border-b border-bordergray bg-white px-6 py-2.5">
        <select
          className={selectCls}
          value={fKind}
          onChange={(e) => setFKind(e.target.value as RiskKind | "")}
        >
          <option value="">Risks & opportunities</option>
          <option value="risk">Risks only</option>
          <option value="opportunity">Opportunities only</option>
        </select>
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
          {orgNames.map((o) => (
            <option key={o}>{o}</option>
          ))}
        </select>
        <select
          className={selectCls}
          value={fPriority}
          onChange={(e) => setFPriority(e.target.value as RiskPriority | "")}
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
                      <RiskCard key={risk.id} risk={risk} roles={roles} orgs={orgs} />
                    ))}
                    {col.length === 0 && (
                      <div className="rounded-card border border-dashed border-bordergray py-6 text-center text-[11px] text-gray-300">
                        Nothing here
                      </div>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        ) : (
          <>
            <RiskSummaryDashboard
              risks={filtered}
              roles={roles}
              orgs={orgs}
              selectedWorkstream={barWorkstream}
              onSelectWorkstream={setBarWorkstream}
              selectedTodo={barTodo}
              onSelectTodo={setBarTodo}
            />
            <TableView
              risks={tableRisks}
              roles={roles}
              orgs={orgs}
              onOpen={(id) => navigate(`/risks/${id}`, { state: { background: location } })}
            />
          </>
        )}
      </div>

      {newRiskOpen && (
        <NewRiskModal
          roles={roles}
          onCreate={handleCreateRisk}
          onCancel={() => setNewRiskOpen(false)}
        />
      )}
    </div>
  );
}

function TableView({
  risks,
  roles,
  orgs,
  onOpen,
}: {
  risks: ReturnType<typeof useRiskStore.getState>["risks"];
  roles: ReturnType<typeof useRiskStore.getState>["roles"];
  orgs: Organization[];
  onOpen: (id: string) => void;
}) {
  const [deleteTarget, setDeleteTarget] = useState<Risk | null>(null);
  const [deleting, setDeleting] = useState(false);

  async function handleDelete() {
    if (!deleteTarget) return;
    setDeleting(true);
    try {
      await deleteRisk(deleteTarget.id);
      setDeleteTarget(null);
    } catch {
      toast.error("Could not delete risk");
    } finally {
      setDeleting(false);
    }
  }

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
            <th className="px-4 py-2.5"></th>
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
                      <PersonAvatar
                        name={responsible.name}
                        ringColor={tierColor(orgs, responsible.organization)}
                        size={24}
                      />
                      <span className="text-xs text-gray-600">
                        {responsible.name}
                      </span>
                    </span>
                  ) : (
                    "—"
                  )}
                </td>
                <td className="px-4 py-2.5 text-right">
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      setDeleteTarget(risk);
                    }}
                    title="Delete risk"
                    className="rounded-btn p-1.5 text-gray-400 hover:bg-red-50 hover:text-critical"
                  >
                    <Trash2 size={15} />
                  </button>
                </td>
              </tr>
            );
          })}
          {risks.length === 0 && (
            <tr>
              <td colSpan={8} className="px-4 py-8 text-center text-gray-300">
                No risks or opportunities match the current filters.
              </td>
            </tr>
          )}
        </tbody>
      </table>

      {deleteTarget && (
        <div className="fixed inset-0 z-40 flex items-center justify-center bg-black/30">
          <div className="w-[320px] rounded-card bg-white p-5 shadow-panel">
            <p className="text-sm font-semibold text-ink">Delete risk?</p>
            <p className="mt-1 text-sm text-gray-500">
              <span className="font-medium text-ink">
                {deleteTarget.riskId} — {deleteTarget.title}
              </span>{" "}
              will be permanently deleted. This can't be undone.
            </p>
            <div className="mt-4 flex justify-end gap-2">
              <button
                onClick={() => setDeleteTarget(null)}
                disabled={deleting}
                className="rounded-btn border border-bordergray px-3 py-1.5 text-sm text-gray-600 hover:bg-gray-50 disabled:opacity-50"
              >
                Cancel
              </button>
              <button
                onClick={handleDelete}
                disabled={deleting}
                className="rounded-btn bg-critical px-3 py-1.5 text-sm font-semibold text-white hover:opacity-90 disabled:opacity-50"
              >
                {deleting ? "Deleting…" : "Delete"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
