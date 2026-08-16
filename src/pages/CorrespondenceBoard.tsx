import { useEffect, useMemo, useState } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import { LayoutGrid, Table2, Plus, Trash2 } from "lucide-react";
import type { Timestamp } from "firebase/firestore";
import {
  CORRESPONDENCE_TRACK_STATUSES,
  CORRESPONDENCE_TYPES,
  type CorrespondenceItem,
  type CorrespondenceStatus,
  type CorrespondenceType,
  type Organization,
  type RiskPriority,
} from "../types";
import { useCorrespondenceStore } from "../store/correspondenceStore";
import { useRiskStore } from "../store/riskStore";
import { useAuthStore, currentIdentity } from "../store/authStore";
import { createCorrespondence, deleteCorrespondence, watchOrganizations } from "../firebase/firestore";
import {
  CORRESPONDENCE_STATUS_LABEL,
  PRIORITY_META,
  formatDate,
  pickResponsible,
} from "../lib/format";
import { tierColor } from "../lib/tiers";
import { toast } from "../lib/toast";
import CorrespondenceCard from "../components/correspondence/CorrespondenceCard";
import CorrespondenceSummaryDashboard from "../components/correspondence/CorrespondenceSummaryDashboard";
import NewCorrespondenceModal from "../components/correspondence/NewCorrespondenceModal";
import PersonAvatar from "../components/common/PersonAvatar";

type View = "board" | "table";

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

export default function CorrespondenceBoard() {
  const navigate = useNavigate();
  const location = useLocation();
  const { items, loading } = useCorrespondenceStore();
  const roles = useRiskStore((s) => s.roles);
  const projectId = useRiskStore((s) => s.projectId);
  const user = useAuthStore((s) => s.user);
  const me = currentIdentity(user);

  const [view, setView] = useState<View>("table");
  const [fType, setFType] = useState<CorrespondenceType | "">("");
  const [fWorkstream, setFWorkstream] = useState("");
  const [fOrg, setFOrg] = useState("");
  const [fPriority, setFPriority] = useState<RiskPriority | "">("");
  const [fStatus, setFStatus] = useState<CorrespondenceStatus | "">("");
  const [barWorkstream, setBarWorkstream] = useState<string | null>(null);
  const [barTodo, setBarTodo] = useState<string | null>(null);
  const [newItemOpen, setNewItemOpen] = useState(false);
  const [orgs, setOrgs] = useState<Organization[]>([]);

  useEffect(() => {
    if (!projectId) return;
    return watchOrganizations(projectId, setOrgs);
  }, [projectId]);

  const workstreams = [...new Set(roles.map((r) => r.workstream))];
  const orgNames = [...new Set(roles.flatMap(roleOrganizations))];

  const filtered = useMemo(() => {
    return items.filter((item) => {
      const itemRoles = roles.filter((r) => item.workstreamIds.includes(r.id));
      if (fType && item.type !== fType) return false;
      if (fWorkstream && !itemRoles.some((r) => r.workstream === fWorkstream)) return false;
      if (fOrg && !itemRoles.some((r) => roleOrganizations(r).includes(fOrg))) return false;
      if (fPriority && item.priority !== fPriority) return false;
      if (fStatus && item.status !== fStatus) return false;
      return true;
    });
  }, [items, roles, fType, fWorkstream, fOrg, fPriority, fStatus]);

  const tableItems = useMemo(() => {
    return filtered.filter((item) => {
      const itemRoles = roles.filter((r) => item.workstreamIds.includes(r.id));
      if (barWorkstream && !itemRoles.some((r) => r.workstream === barWorkstream)) return false;
      if (
        barTodo &&
        !itemRoles.some(
          (r) => r.accountable.organization === barTodo || pickResponsible(r)?.organization === barTodo
        )
      )
        return false;
      return true;
    });
  }, [filtered, roles, barWorkstream, barTodo]);

  async function handleCreateItem(data: {
    type: CorrespondenceType;
    title: string;
    priority: RiskPriority;
    dueDate: Timestamp | null;
    workstreamIds: string[];
  }) {
    if (!projectId) return;
    try {
      const id = await createCorrespondence(projectId, me.uid, data);
      setNewItemOpen(false);
      navigate(`/correspondence/${id}`, { state: { background: location } });
    } catch {
      toast.error("Could not create item");
    }
  }

  const selectCls =
    "rounded-input border border-bordergray bg-white px-2.5 py-1.5 text-xs text-gray-600 outline-none focus:border-indigo";

  return (
    <div className="flex h-full flex-col">
      {/* Header */}
      <div className="flex items-center justify-between border-b border-bordergray bg-white px-6 py-4">
        <div>
          <h1 className="text-lg font-bold text-ink">Correspondence</h1>
          <p className="text-xs text-gray-400">
            {filtered.length} of {items.length} items
          </p>
        </div>
        <div className="flex items-center gap-2">
          <div className="flex overflow-hidden rounded-btn border border-bordergray">
            <button
              onClick={() => setView("board")}
              className={`flex items-center gap-1.5 px-3 py-1.5 text-sm ${
                view === "board" ? "bg-indigo text-white" : "bg-white text-gray-500 hover:bg-gray-50"
              }`}
            >
              <LayoutGrid size={15} /> Board
            </button>
            <button
              onClick={() => setView("table")}
              className={`flex items-center gap-1.5 px-3 py-1.5 text-sm ${
                view === "table" ? "bg-indigo text-white" : "bg-white text-gray-500 hover:bg-gray-50"
              }`}
            >
              <Table2 size={15} /> Table
            </button>
          </div>
          <button
            onClick={() => setNewItemOpen(true)}
            className="flex items-center gap-1.5 rounded-btn bg-indigo px-3 py-1.5 text-sm font-semibold text-white hover:bg-indigo/90"
          >
            <Plus size={16} /> New
          </button>
        </div>
      </div>

      {/* Filters */}
      <div className="flex flex-wrap items-center gap-2 border-b border-bordergray bg-white px-6 py-2.5">
        <select className={selectCls} value={fType} onChange={(e) => setFType(e.target.value as CorrespondenceType | "")}>
          <option value="">All types</option>
          {CORRESPONDENCE_TYPES.map((t) => (
            <option key={t} value={t}>
              {t}
            </option>
          ))}
        </select>
        <select className={selectCls} value={fWorkstream} onChange={(e) => setFWorkstream(e.target.value)}>
          <option value="">All workstreams</option>
          {workstreams.map((w) => (
            <option key={w}>{w}</option>
          ))}
        </select>
        <select className={selectCls} value={fOrg} onChange={(e) => setFOrg(e.target.value)}>
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
          onChange={(e) => setFStatus(e.target.value as CorrespondenceStatus | "")}
        >
          <option value="">All statuses</option>
          {[...CORRESPONDENCE_TRACK_STATUSES, "obsolete" as const].map((s) => (
            <option key={s} value={s}>
              {CORRESPONDENCE_STATUS_LABEL[s]}
            </option>
          ))}
        </select>
      </div>

      {/* Content */}
      <div className="scroll-thin flex-1 overflow-auto p-6">
        {loading ? (
          <div className="text-sm text-gray-400">Loading correspondence…</div>
        ) : view === "board" ? (
          <div className="grid grid-cols-4 gap-4">
            {CORRESPONDENCE_TRACK_STATUSES.map((status) => {
              const col = filtered.filter((i) => i.status === status);
              return (
                <div key={status} className="flex flex-col gap-3">
                  <div className="flex items-center justify-between">
                    <span className="text-[12px] font-semibold uppercase tracking-wide text-gray-500">
                      {CORRESPONDENCE_STATUS_LABEL[status]}
                    </span>
                    <span className="rounded-full bg-gray-200 px-2 text-[11px] text-gray-600">
                      {col.length}
                    </span>
                  </div>
                  <div className="flex flex-col gap-2">
                    {col.map((item) => (
                      <CorrespondenceCard key={item.id} item={item} roles={roles} orgs={orgs} />
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
            <CorrespondenceSummaryDashboard
              items={filtered}
              roles={roles}
              orgs={orgs}
              selectedWorkstream={barWorkstream}
              onSelectWorkstream={setBarWorkstream}
              selectedTodo={barTodo}
              onSelectTodo={setBarTodo}
            />
            <TableView
              items={tableItems}
              roles={roles}
              orgs={orgs}
              onOpen={(id) => navigate(`/correspondence/${id}`, { state: { background: location } })}
            />
          </>
        )}
      </div>

      {newItemOpen && (
        <NewCorrespondenceModal
          roles={roles}
          onCreate={handleCreateItem}
          onCancel={() => setNewItemOpen(false)}
        />
      )}
    </div>
  );
}

function TableView({
  items,
  roles,
  orgs,
  onOpen,
}: {
  items: CorrespondenceItem[];
  roles: ReturnType<typeof useRiskStore.getState>["roles"];
  orgs: Organization[];
  onOpen: (id: string) => void;
}) {
  const [deleteTarget, setDeleteTarget] = useState<CorrespondenceItem | null>(null);
  const [deleting, setDeleting] = useState(false);

  async function handleDelete() {
    if (!deleteTarget) return;
    setDeleting(true);
    try {
      await deleteCorrespondence(deleteTarget.id);
      setDeleteTarget(null);
    } catch {
      toast.error("Could not delete item");
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
            <th className="px-4 py-2.5">Type</th>
            <th className="px-4 py-2.5">Status</th>
            <th className="px-4 py-2.5">Priority</th>
            <th className="px-4 py-2.5">Workstream</th>
            <th className="px-4 py-2.5">Due</th>
            <th className="px-4 py-2.5">Current owner</th>
            <th className="px-4 py-2.5"></th>
          </tr>
        </thead>
        <tbody>
          {items.map((item) => {
            const prio = PRIORITY_META[item.priority];
            const itemRoles = roles.filter((r) => item.workstreamIds.includes(r.id));
            const owner =
              item.status === "sent_accountable"
                ? itemRoles[0]?.accountable
                : item.status === "sent_responsible"
                ? itemRoles.map(pickResponsible).find((p) => p !== null)
                : null;
            const workstreams = [...new Set(itemRoles.map((r) => r.workstream))];
            const isObsolete = item.status === "obsolete";
            return (
              <tr
                key={item.id}
                onClick={() => onOpen(item.id)}
                className={`cursor-pointer border-t border-bordergray hover:bg-gray-50 ${
                  isObsolete ? "opacity-50" : ""
                }`}
              >
                <td className="px-4 py-2.5 font-mono text-[12px] text-gray-500">{item.itemId}</td>
                <td className="px-4 py-2.5 font-medium text-ink">{item.title}</td>
                <td className="px-4 py-2.5 text-gray-500">{item.type}</td>
                <td className="px-4 py-2.5 text-gray-600">{CORRESPONDENCE_STATUS_LABEL[item.status]}</td>
                <td className="px-4 py-2.5">
                  <span className="inline-flex items-center gap-1.5" style={{ color: prio.text }}>
                    <span className="h-2 w-2 rounded-full" style={{ background: prio.dot }} />
                    {prio.label}
                  </span>
                </td>
                <td className="px-4 py-2.5 text-gray-500">{workstreams.join(", ") || "—"}</td>
                <td className="px-4 py-2.5 text-gray-500">{formatDate(item.dueDate)}</td>
                <td className="px-4 py-2.5">
                  {owner ? (
                    <span className="flex items-center gap-2">
                      <PersonAvatar
                        name={owner.name}
                        ringColor={tierColor(orgs, owner.organization)}
                        size={24}
                      />
                      <span className="text-xs text-gray-600">{owner.name}</span>
                    </span>
                  ) : (
                    "—"
                  )}
                </td>
                <td className="px-4 py-2.5 text-right">
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      setDeleteTarget(item);
                    }}
                    title="Delete item"
                    className="rounded-btn p-1.5 text-gray-400 hover:bg-red-50 hover:text-critical"
                  >
                    <Trash2 size={15} />
                  </button>
                </td>
              </tr>
            );
          })}
          {items.length === 0 && (
            <tr>
              <td colSpan={9} className="px-4 py-8 text-center text-gray-300">
                No correspondence items match the current filters.
              </td>
            </tr>
          )}
        </tbody>
      </table>

      {deleteTarget && (
        <div className="fixed inset-0 z-40 flex items-center justify-center bg-black/30">
          <div className="w-[320px] rounded-card bg-white p-5 shadow-panel">
            <p className="text-sm font-semibold text-ink">Delete item?</p>
            <p className="mt-1 text-sm text-gray-500">
              <span className="font-medium text-ink">
                {deleteTarget.itemId} — {deleteTarget.title}
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
