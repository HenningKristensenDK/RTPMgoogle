import { useMemo, useState } from "react";
import { Plus, Trash2, Clock, CalendarDays, List } from "lucide-react";
import {
  TIME_CATEGORIES,
  TIME_ENTRY_STATUSES,
  type TimeCategory,
  type TimeEntry,
  type TimeEntryStatus,
} from "../types";
import { useTimeStore } from "../store/timeStore";
import { useRiskStore } from "../store/riskStore";
import { useAuthStore, currentIdentity } from "../store/authStore";
import { createTimeEntry, deleteTimeEntry } from "../firebase/firestore";
import { formatDate } from "../lib/format";
import { toast } from "../lib/toast";
import TimeSummaryDashboard from "../components/time/TimeSummaryDashboard";
import TimesheetGrid from "../components/time/TimesheetGrid";
import NewTimeEntryModal, { type NewTimeEntryData } from "../components/time/NewTimeEntryModal";

const STATUS_META: Record<TimeEntryStatus, { label: string; text: string; bg: string }> = {
  draft: { label: "Draft", text: "#595b78", bg: "#f0f0f5" },
  submitted: { label: "Submitted", text: "#cc7000", bg: "#fff3e0" },
  approved: { label: "Approved", text: "#1b7a34", bg: "#e6f6ea" },
};

const selectCls =
  "rounded-input border border-bordergray bg-white px-2.5 py-1.5 text-xs text-gray-600 outline-none focus:border-indigo";

export default function TimeLog() {
  const { entries, loading, patchEntry } = useTimeStore();
  const roles = useRiskStore((s) => s.roles);
  const projectId = useRiskStore((s) => s.projectId);
  const user = useAuthStore((s) => s.user);
  const me = currentIdentity(user);

  const [fWorkstream, setFWorkstream] = useState("");
  const [fCategory, setFCategory] = useState<TimeCategory | "">("");
  const [fStatus, setFStatus] = useState<TimeEntryStatus | "">("");
  const [fPerson, setFPerson] = useState("");
  const [fBillable, setFBillable] = useState<"" | "yes" | "no">("");
  const [barWorkstream, setBarWorkstream] = useState<string | null>(null);
  const [barCategory, setBarCategory] = useState<string | null>(null);
  const [newOpen, setNewOpen] = useState(false);
  const [view, setView] = useState<"week" | "list">("week");

  const wsName = (id: string) => roles.find((r) => r.id === id)?.workstream ?? "Unassigned";
  const workstreams = [...new Set(roles.map((r) => r.workstream))];
  const people = [...new Set(entries.map((e) => e.personName))];

  const filtered = useMemo(() => {
    return entries.filter((e) => {
      if (fWorkstream && wsName(e.workstreamId) !== fWorkstream) return false;
      if (fCategory && e.category !== fCategory) return false;
      if (fStatus && e.status !== fStatus) return false;
      if (fPerson && e.personName !== fPerson) return false;
      if (fBillable === "yes" && !e.billable) return false;
      if (fBillable === "no" && e.billable) return false;
      return true;
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [entries, roles, fWorkstream, fCategory, fStatus, fPerson, fBillable]);

  const tableEntries = useMemo(() => {
    return filtered.filter((e) => {
      if (barWorkstream && wsName(e.workstreamId) !== barWorkstream) return false;
      if (barCategory && e.category !== barCategory) return false;
      return true;
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [filtered, roles, barWorkstream, barCategory]);

  async function handleCreate(data: NewTimeEntryData) {
    if (!projectId) return;
    try {
      await createTimeEntry(projectId, me.name, data);
      setNewOpen(false);
    } catch {
      toast.error("Could not register time");
    }
  }

  return (
    <div className="flex h-full flex-col">
      {/* Header */}
      <div className="flex items-center justify-between border-b border-bordergray bg-white px-6 py-4">
        <div className="flex items-center gap-3">
          <div className="flex h-9 w-9 flex-shrink-0 items-center justify-center rounded-lg" style={{ background: "#e7e6fa" }}>
            <Clock size={20} style={{ color: "#0d08d2" }} />
          </div>
          <div>
            <h1 className="text-lg font-bold text-ink">Time Registration</h1>
            <p className="text-xs text-gray-400">
              {view === "week" ? "Weekly timesheet" : `${tableEntries.length} of ${entries.length} entries`}
            </p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <div className="flex overflow-hidden rounded-btn border border-bordergray">
            <button
              onClick={() => setView("week")}
              className={`flex items-center gap-1.5 px-3 py-1.5 text-sm ${view === "week" ? "bg-indigo text-white" : "bg-white text-gray-500 hover:bg-gray-50"}`}
            >
              <CalendarDays size={15} /> Week
            </button>
            <button
              onClick={() => setView("list")}
              className={`flex items-center gap-1.5 px-3 py-1.5 text-sm ${view === "list" ? "bg-indigo text-white" : "bg-white text-gray-500 hover:bg-gray-50"}`}
            >
              <List size={15} /> List
            </button>
          </div>
          <button
            onClick={() => setNewOpen(true)}
            className="flex items-center gap-1.5 rounded-btn bg-indigo px-3 py-1.5 text-sm font-semibold text-white hover:bg-indigo/90"
          >
            <Plus size={16} /> Register time
          </button>
        </div>
      </div>

      {/* Filters (List view only) */}
      {view === "list" && (
      <div className="flex flex-wrap items-center gap-2 border-b border-bordergray bg-white px-6 py-2.5">
        <select className={selectCls} value={fWorkstream} onChange={(e) => setFWorkstream(e.target.value)}>
          <option value="">All workstreams</option>
          {workstreams.map((w) => (
            <option key={w}>{w}</option>
          ))}
        </select>
        <select className={selectCls} value={fCategory} onChange={(e) => setFCategory(e.target.value as TimeCategory | "")}>
          <option value="">All categories</option>
          {TIME_CATEGORIES.map((c) => (
            <option key={c} value={c}>
              {c}
            </option>
          ))}
        </select>
        <select className={selectCls} value={fStatus} onChange={(e) => setFStatus(e.target.value as TimeEntryStatus | "")}>
          <option value="">All statuses</option>
          {TIME_ENTRY_STATUSES.map((s) => (
            <option key={s} value={s}>
              {STATUS_META[s].label}
            </option>
          ))}
        </select>
        <select className={selectCls} value={fPerson} onChange={(e) => setFPerson(e.target.value)}>
          <option value="">All people</option>
          {people.map((p) => (
            <option key={p}>{p}</option>
          ))}
        </select>
        <select className={selectCls} value={fBillable} onChange={(e) => setFBillable(e.target.value as "" | "yes" | "no")}>
          <option value="">Billable & non</option>
          <option value="yes">Billable only</option>
          <option value="no">Non-billable only</option>
        </select>
      </div>
      )}

      {/* Content */}
      <div className="scroll-thin flex-1 overflow-auto p-6">
        {loading ? (
          <div className="text-sm text-gray-400">Loading time entries…</div>
        ) : view === "week" ? (
          <TimesheetGrid entries={entries} roles={roles} projectId={projectId} currentName={me.name} />
        ) : (
          <>
            <TimeSummaryDashboard
              entries={filtered}
              roles={roles}
              selectedWorkstream={barWorkstream}
              onSelectWorkstream={setBarWorkstream}
              selectedCategory={barCategory}
              onSelectCategory={setBarCategory}
            />
            <TableView
              entries={tableEntries}
              wsName={wsName}
              onStatus={(id, status) => patchEntry(id, { status })}
            />
          </>
        )}
      </div>

      {newOpen && (
        <NewTimeEntryModal
          roles={roles}
          currentName={me.name}
          onCreate={handleCreate}
          onCancel={() => setNewOpen(false)}
        />
      )}
    </div>
  );
}

function TableView({
  entries,
  wsName,
  onStatus,
}: {
  entries: TimeEntry[];
  wsName: (id: string) => string;
  onStatus: (id: string, status: TimeEntryStatus) => void;
}) {
  const [deleteTarget, setDeleteTarget] = useState<TimeEntry | null>(null);
  const [deleting, setDeleting] = useState(false);

  const totalHours = entries.reduce((s, e) => s + (e.hours || 0), 0);

  async function handleDelete() {
    if (!deleteTarget) return;
    setDeleting(true);
    try {
      await deleteTimeEntry(deleteTarget.id);
      setDeleteTarget(null);
    } catch {
      toast.error("Could not delete entry");
    } finally {
      setDeleting(false);
    }
  }

  return (
    <div className="overflow-hidden rounded-card border border-bordergray bg-white shadow-card">
      <table className="w-full text-left text-sm">
        <thead className="bg-gray-50 text-[11px] uppercase tracking-wide text-gray-400">
          <tr>
            <th className="px-4 py-2.5">Date</th>
            <th className="px-4 py-2.5">ID</th>
            <th className="px-4 py-2.5">Person</th>
            <th className="px-4 py-2.5">Workstream</th>
            <th className="px-4 py-2.5">Activity</th>
            <th className="px-4 py-2.5">Category</th>
            <th className="px-4 py-2.5 text-right">Hours</th>
            <th className="px-4 py-2.5">Billable</th>
            <th className="px-4 py-2.5">Status</th>
            <th className="px-4 py-2.5"></th>
          </tr>
        </thead>
        <tbody>
          {entries.map((e) => {
            const meta = STATUS_META[e.status];
            return (
              <tr key={e.id} className="border-t border-bordergray hover:bg-gray-50">
                <td className="px-4 py-2.5 text-gray-500">{formatDate(e.date)}</td>
                <td className="px-4 py-2.5 font-mono text-[12px] text-gray-500">{e.entryId}</td>
                <td className="px-4 py-2.5 text-gray-700">{e.personName}</td>
                <td className="px-4 py-2.5 text-gray-500">{e.workstreamId ? wsName(e.workstreamId) : "—"}</td>
                <td className="max-w-[280px] truncate px-4 py-2.5 font-medium text-ink">{e.activity}</td>
                <td className="px-4 py-2.5 text-gray-500">{e.category}</td>
                <td className="px-4 py-2.5 text-right font-semibold tabular-nums text-ink">{e.hours}</td>
                <td className="px-4 py-2.5">
                  {e.billable ? (
                    <span className="text-[12px] font-medium text-emerald">Billable</span>
                  ) : (
                    <span className="text-[12px] text-gray-400">Non-billable</span>
                  )}
                </td>
                <td className="px-4 py-2.5">
                  <select
                    value={e.status}
                    onChange={(ev) => onStatus(e.id, ev.target.value as TimeEntryStatus)}
                    className="rounded-full border-0 px-2 py-1 text-[11px] font-semibold outline-none"
                    style={{ color: meta.text, background: meta.bg }}
                  >
                    {TIME_ENTRY_STATUSES.map((s) => (
                      <option key={s} value={s} style={{ color: "#15162b", background: "#fff" }}>
                        {STATUS_META[s].label}
                      </option>
                    ))}
                  </select>
                </td>
                <td className="px-4 py-2.5 text-right">
                  <button
                    onClick={() => setDeleteTarget(e)}
                    title="Delete entry"
                    className="rounded-btn p-1.5 text-gray-400 hover:bg-red-50 hover:text-critical"
                  >
                    <Trash2 size={15} />
                  </button>
                </td>
              </tr>
            );
          })}
          {entries.length === 0 && (
            <tr>
              <td colSpan={10} className="px-4 py-8 text-center text-gray-300">
                No time entries yet. Click “Register time” to log hours.
              </td>
            </tr>
          )}
        </tbody>
        {entries.length > 0 && (
          <tfoot>
            <tr className="border-t border-bordergray bg-gray-50 text-[12px] font-semibold text-ink">
              <td className="px-4 py-2.5" colSpan={6}>
                Total
              </td>
              <td className="px-4 py-2.5 text-right tabular-nums">{Math.round(totalHours * 10) / 10}</td>
              <td colSpan={3}></td>
            </tr>
          </tfoot>
        )}
      </table>

      {deleteTarget && (
        <div className="fixed inset-0 z-40 flex items-center justify-center bg-black/30">
          <div className="w-[320px] rounded-card bg-white p-5 shadow-panel">
            <p className="text-sm font-semibold text-ink">Delete time entry?</p>
            <p className="mt-1 text-sm text-gray-500">
              <span className="font-medium text-ink">{deleteTarget.entryId}</span> ({deleteTarget.hours}h) will be
              permanently deleted.
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
