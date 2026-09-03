import { useMemo, useState } from "react";
import { Plus, Clock, CalendarRange, List, Trash2, MoreVertical } from "lucide-react";
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
import TimesheetGrid from "../components/time/TimesheetGrid";
import NewTimeEntryModal, { type NewTimeEntryData } from "../components/time/NewTimeEntryModal";

/* RTPM brand tokens */
const INK = "#15162b";
const SLATE = "#595b78";
const MUTE = "#8a8ca6";
const INDIGO = "#0d08d2";
const INDIGO_TINT = "#e7e6fa";
const INDIGO_TINT_LINE = "#d6d4f5";
const LINE = "#e6e6f0";
const MIST = "#fafafd";
const GREEN_TINT = "#e8f6eb";
const GREEN_INK = "#1b7a31";
const AMBER_TINT = "#fdf4dd";
const AMBER_INK = "#8a6600";
const LINE_SOFT = "#f0f0f5";

const WS_COLOR: Record<string, string> = {
  "Civil Works": "#0d08d2",
  "MEP Infrastructure": "#00acff",
  "IT/Data Infrastructure": "#5652e0",
  Quality: "#00c794",
  HSE: "#ff8b00",
  "Permit and Authorities": "#aa00d3",
};
const SERIES = ["#0d08d2", "#00c794", "#ff8b00", "#00acff", "#aa00d3", "#5652e0"];

function statusMeta(s: TimeEntryStatus) {
  return s === "approved"
    ? { label: "Approved", bg: GREEN_TINT, text: GREEN_INK }
    : s === "submitted"
    ? { label: "Submitted", bg: AMBER_TINT, text: AMBER_INK }
    : { label: "Draft", bg: LINE_SOFT, text: SLATE };
}

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
  const [newOpen, setNewOpen] = useState(false);
  const [view, setView] = useState<"week" | "list">("week");

  const wsName = (id: string) => roles.find((r) => r.id === id)?.workstream ?? "Unassigned";
  const wsColor = (id: string) => {
    const name = wsName(id);
    return WS_COLOR[name] ?? SERIES[Math.max(0, roles.findIndex((r) => r.id === id)) % SERIES.length];
  };
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

  async function handleCreate(data: NewTimeEntryData) {
    if (!projectId) return;
    try {
      await createTimeEntry(projectId, me.name, data);
      setNewOpen(false);
    } catch {
      toast.error("Could not register time");
    }
  }

  const segCls = (active: boolean) =>
    `flex items-center gap-1.5 rounded-[7px] px-3.5 py-1.5 text-sm font-semibold transition-colors ${
      active ? "bg-white shadow-[0_1px_2px_rgba(21,22,43,.1)]" : ""
    }`;

  return (
    <div className="flex h-full flex-col">
      {/* Header */}
      <div className="flex items-center justify-between border-b bg-white px-6 py-4" style={{ borderColor: LINE }}>
        <div className="flex items-center gap-3">
          <div className="flex h-[38px] w-[38px] flex-shrink-0 items-center justify-center rounded-[10px]" style={{ background: INDIGO_TINT }}>
            <Clock size={21} style={{ color: INDIGO }} />
          </div>
          <div>
            <h1 className="font-headline text-[22px] font-bold leading-tight" style={{ color: INK }}>
              Time Registration
            </h1>
            <p className="text-[12.5px]" style={{ color: MUTE }}>
              {view === "week" ? "Weekly timesheet · log hours by workstream & activity" : `${filtered.length} of ${entries.length} entries · Viking Project`}
            </p>
          </div>
        </div>
        <div className="flex items-center gap-3.5">
          <div className="flex rounded-[10px] border p-[3px]" style={{ borderColor: LINE, background: "#f7f7fb" }}>
            <button onClick={() => setView("week")} className={segCls(view === "week")} style={{ color: view === "week" ? INDIGO : SLATE }}>
              <CalendarRange size={15} /> Week
            </button>
            <button onClick={() => setView("list")} className={segCls(view === "list")} style={{ color: view === "list" ? INDIGO : SLATE }}>
              <List size={15} /> List
            </button>
          </div>
          <button
            onClick={() => setNewOpen(true)}
            className="inline-flex items-center gap-1.5 rounded-[9px] px-3.5 py-2 text-sm font-semibold text-white transition-colors hover:brightness-110"
            style={{ background: INDIGO }}
          >
            <Plus size={16} /> Log time
          </button>
        </div>
      </div>

      {/* Content */}
      <div className="scroll-thin flex-1 overflow-auto p-6" style={{ background: "#f7f7fb" }}>
        {loading ? (
          <div className="text-sm" style={{ color: MUTE }}>
            Loading time entries…
          </div>
        ) : view === "week" ? (
          <TimesheetGrid entries={entries} roles={roles} projectId={projectId} currentName={me.name} />
        ) : (
          <>
            {/* filter pills */}
            <div className="mb-[18px] flex flex-wrap items-center gap-2.5">
              <FilterPill value={fWorkstream} onChange={setFWorkstream} allLabel="All workstreams" options={workstreams} />
              <FilterPill value={fCategory} onChange={(v) => setFCategory(v as TimeCategory | "")} allLabel="All categories" options={[...TIME_CATEGORIES]} />
              <FilterPill value={fPerson} onChange={setFPerson} allLabel="All people" options={people} />
              <FilterPill
                value={fStatus}
                onChange={(v) => setFStatus(v as TimeEntryStatus | "")}
                allLabel="Status: All"
                options={TIME_ENTRY_STATUSES.map((s) => statusMeta(s).label)}
                optionValues={[...TIME_ENTRY_STATUSES]}
                highlight
              />
              <FilterPill
                value={fBillable}
                onChange={(v) => setFBillable(v as "" | "yes" | "no")}
                allLabel="Billable & non"
                options={["Billable only", "Non-billable only"]}
                optionValues={["yes", "no"]}
              />
            </div>

            <TableView entries={filtered} wsName={wsName} wsColor={wsColor} onStatus={(id, status) => patchEntry(id, { status })} />
          </>
        )}
      </div>

      {newOpen && (
        <NewTimeEntryModal roles={roles} currentName={me.name} onCreate={handleCreate} onCancel={() => setNewOpen(false)} />
      )}
    </div>
  );
}

function FilterPill({
  value,
  onChange,
  allLabel,
  options,
  optionValues,
  highlight,
}: {
  value: string;
  onChange: (v: string) => void;
  allLabel: string;
  options: string[];
  optionValues?: string[];
  highlight?: boolean;
}) {
  const active = value !== "";
  const on = highlight || active;
  return (
    <div
      className="relative inline-flex items-center rounded-full border text-[12.5px] font-medium"
      style={{
        borderColor: on ? INDIGO_TINT_LINE : LINE,
        background: on ? INDIGO_TINT : "#fff",
        color: on ? INDIGO : INK,
      }}
    >
      <select
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="cursor-pointer appearance-none bg-transparent py-[7px] pl-3.5 pr-8 outline-none"
        style={{ color: on ? INDIGO : INK }}
      >
        <option value="">{allLabel}</option>
        {options.map((o, i) => (
          <option key={o} value={optionValues ? optionValues[i] : o} style={{ color: INK }}>
            {o}
          </option>
        ))}
      </select>
      <span className="pointer-events-none absolute right-3 text-[10px]">▾</span>
    </div>
  );
}

function TableView({
  entries,
  wsName,
  wsColor,
  onStatus,
}: {
  entries: TimeEntry[];
  wsName: (id: string) => string;
  wsColor: (id: string) => string;
  onStatus: (id: string, status: TimeEntryStatus) => void;
}) {
  const [deleteTarget, setDeleteTarget] = useState<TimeEntry | null>(null);
  const [deleting, setDeleting] = useState(false);
  const [menuFor, setMenuFor] = useState<string | null>(null);

  const totalHours = entries.reduce((s, e) => s + (e.hours || 0), 0);
  const cols = "78px 92px 150px 172px minmax(0,1fr) 120px 70px 100px 108px 34px";

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
    <div className="overflow-hidden rounded-[14px] border bg-white shadow-[0_2px_8px_rgba(21,22,43,.08)]" style={{ borderColor: LINE }}>
      <div className="overflow-x-auto">
        <div className="min-w-[980px]">
          {/* header */}
          <div
            className="grid items-center border-b px-5 py-3 text-[10.5px] font-semibold uppercase tracking-[.08em]"
            style={{ gridTemplateColumns: cols, background: MIST, borderColor: LINE, color: MUTE }}
          >
            <div>ID</div>
            <div>Date</div>
            <div>Person</div>
            <div>Workstream</div>
            <div>Activity</div>
            <div>Category</div>
            <div className="text-right">Hours</div>
            <div className="text-center">Billable</div>
            <div>Status</div>
            <div />
          </div>
          {entries.map((e) => {
            const meta = statusMeta(e.status);
            return (
              <div key={e.id} className="grid items-center border-b px-5 py-3.5 text-[13px] hover:bg-[#fafafd]" style={{ gridTemplateColumns: cols, borderColor: "#f5f5fa" }}>
                <div className="font-headline font-semibold" style={{ color: INDIGO }}>
                  {e.entryId}
                </div>
                <div className="font-headline tabular-nums" style={{ color: SLATE }}>
                  {formatDate(e.date)}
                </div>
                <div className="truncate pr-2 font-medium" style={{ color: INK }}>
                  {e.personName}
                </div>
                <div className="flex min-w-0 items-center gap-2 pr-2">
                  <span className="h-2 w-2 flex-none rounded-full" style={{ background: wsColor(e.workstreamId) }} />
                  <span className="truncate">{e.workstreamId ? wsName(e.workstreamId) : "—"}</span>
                </div>
                <div className="truncate pr-2.5" style={{ color: SLATE }}>
                  {e.activity}
                </div>
                <div>
                  <span className="inline-block rounded-full px-2.5 py-0.5 text-[11.5px]" style={{ background: "#efeff6", color: SLATE }}>
                    {e.category}
                  </span>
                </div>
                <div className="text-right font-headline font-bold tabular-nums" style={{ color: INK }}>
                  {e.hours.toFixed(1)}
                </div>
                <div className="text-center text-[11.5px]" style={{ color: e.billable ? SLATE : MUTE }}>
                  {e.billable ? "Billable" : "Non-bill."}
                </div>
                <div>
                  <select
                    value={e.status}
                    onChange={(ev) => onStatus(e.id, ev.target.value as TimeEntryStatus)}
                    className="cursor-pointer rounded-full border-0 px-2.5 py-1 text-[11px] font-bold uppercase tracking-wide outline-none"
                    style={{ color: meta.text, background: meta.bg }}
                  >
                    {TIME_ENTRY_STATUSES.map((s) => (
                      <option key={s} value={s} style={{ color: "#15162b", background: "#fff" }}>
                        {statusMeta(s).label}
                      </option>
                    ))}
                  </select>
                </div>
                <div className="relative flex justify-center">
                  <button onClick={() => setMenuFor(menuFor === e.id ? null : e.id)} className="rounded p-1" style={{ color: "#b9bacb" }}>
                    <MoreVertical size={16} />
                  </button>
                  {menuFor === e.id && (
                    <>
                      <div className="fixed inset-0 z-10" onClick={() => setMenuFor(null)} />
                      <div className="absolute right-0 top-7 z-20 w-32 rounded-lg border bg-white py-1 shadow-lg" style={{ borderColor: LINE }}>
                        <button
                          onClick={() => {
                            setDeleteTarget(e);
                            setMenuFor(null);
                          }}
                          className="flex w-full items-center gap-2 px-3 py-1.5 text-left text-[13px] hover:bg-red-50"
                          style={{ color: "#e63946" }}
                        >
                          <Trash2 size={14} /> Delete
                        </button>
                      </div>
                    </>
                  )}
                </div>
              </div>
            );
          })}
          {entries.length === 0 && (
            <div className="px-5 py-12 text-center text-[13px]" style={{ color: "#b9bacb" }}>
              No time entries match. Click “Log time” to register hours.
            </div>
          )}
          {entries.length > 0 && (
            <div className="grid items-center px-5 py-3.5" style={{ gridTemplateColumns: cols, background: MIST, borderTop: `2px solid ${LINE}` }}>
              <div className="text-[11px] font-bold uppercase tracking-[.08em]" style={{ gridColumn: "1 / 6", color: SLATE }}>
                Total · {entries.length} entr{entries.length === 1 ? "y" : "ies"}
              </div>
              <div className="text-right font-headline text-[15px] font-bold tabular-nums" style={{ color: INK }}>
                {(Math.round(totalHours * 10) / 10).toFixed(1)}
              </div>
              <div />
              <div />
              <div />
            </div>
          )}
        </div>
      </div>

      {deleteTarget && (
        <div className="fixed inset-0 z-40 flex items-center justify-center" style={{ background: "rgba(7,4,116,.28)" }}>
          <div className="w-[320px] rounded-[14px] bg-white p-5 shadow-2xl">
            <p className="text-sm font-semibold" style={{ color: INK }}>
              Delete time entry?
            </p>
            <p className="mt-1 text-sm" style={{ color: SLATE }}>
              <span className="font-medium" style={{ color: INK }}>
                {deleteTarget.entryId}
              </span>{" "}
              ({deleteTarget.hours}h) will be permanently deleted.
            </p>
            <div className="mt-4 flex justify-end gap-2">
              <button onClick={() => setDeleteTarget(null)} disabled={deleting} className="rounded-[9px] border px-3 py-1.5 text-sm disabled:opacity-50" style={{ borderColor: LINE, color: SLATE }}>
                Cancel
              </button>
              <button onClick={handleDelete} disabled={deleting} className="rounded-[9px] px-3 py-1.5 text-sm font-semibold text-white disabled:opacity-50" style={{ background: "#e63946" }}>
                {deleting ? "Deleting…" : "Delete"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
