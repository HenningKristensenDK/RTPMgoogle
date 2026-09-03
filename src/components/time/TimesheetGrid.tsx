import { useMemo, useState } from "react";
import { Timestamp } from "firebase/firestore";
import { ChevronLeft, ChevronRight, Plus, Trash2, Send, Check, RotateCcw } from "lucide-react";
import {
  TIME_CATEGORIES,
  type RoleResponsibility,
  type TimeCategory,
  type TimeEntry,
  type TimeEntryStatus,
} from "../../types";
import { createTimeEntry, updateTimeEntry, deleteTimeEntry } from "../../firebase/firestore";
import { toast } from "../../lib/toast";

const DAY_LABELS = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];
const TARGET_HOURS = 37.5;

const STATUS_META: Record<TimeEntryStatus, { label: string; text: string; bg: string }> = {
  draft: { label: "Draft", text: "#595b78", bg: "#f0f0f5" },
  submitted: { label: "Submitted", text: "#cc7000", bg: "#fff3e0" },
  approved: { label: "Approved", text: "#1b7a34", bg: "#e6f6ea" },
};

function mondayOf(d: Date): Date {
  const x = new Date(d);
  x.setHours(0, 0, 0, 0);
  const dow = (x.getDay() + 6) % 7; // 0 = Monday
  x.setDate(x.getDate() - dow);
  return x;
}

function fmtHrs(h: number): string {
  return (Math.round(h * 10) / 10).toString();
}

interface Line {
  key: string;
  workstreamId: string;
  activity: string;
  category: TimeCategory;
  billable: boolean;
  days: (TimeEntry | undefined)[]; // length 7, Mon..Sun
}

export default function TimesheetGrid({
  entries,
  roles,
  projectId,
  currentName,
}: {
  entries: TimeEntry[];
  roles: RoleResponsibility[];
  projectId: string;
  currentName: string;
}) {
  const people = useMemo(() => {
    const seen = new Set<string>();
    const out: { name: string; org: string }[] = [];
    if (currentName) { seen.add(currentName); out.push({ name: currentName, org: "Customer" }); }
    for (const r of roles) {
      for (const p of [r.accountable, r.responsibleCustomer, r.responsibleContractor, ...r.consulted, ...r.informedCustomer, ...r.informedContractor]) {
        if (p && p.name && !seen.has(p.name)) { seen.add(p.name); out.push({ name: p.name, org: p.organization }); }
      }
    }
    // also include anyone who already has entries
    for (const e of entries) if (e.personName && !seen.has(e.personName)) { seen.add(e.personName); out.push({ name: e.personName, org: e.personOrg }); }
    return out;
  }, [roles, entries, currentName]);

  const [person, setPerson] = useState(people[0]?.name ?? "");
  const [weekStart, setWeekStart] = useState(() => mondayOf(new Date()));
  const [extraLines, setExtraLines] = useState<Line[]>([]);
  const [adding, setAdding] = useState(false);

  const personOrg = (name: string) => people.find((p) => p.name === name)?.org ?? "";
  const wsName = (id: string) => roles.find((r) => r.id === id)?.workstream ?? "Unassigned";

  const days = useMemo(
    () => Array.from({ length: 7 }, (_, i) => { const d = new Date(weekStart); d.setDate(d.getDate() + i); return d; }),
    [weekStart]
  );
  const weekEndMs = weekStart.getTime() + 7 * 86400000;

  // Entries for this person + week
  const weekEntries = useMemo(
    () => entries.filter((e) => e.personName === person && (e.date?.toMillis() ?? 0) >= weekStart.getTime() && (e.date?.toMillis() ?? 0) < weekEndMs),
    [entries, person, weekStart, weekEndMs]
  );

  // Build lines from entries, then merge in any locally-added empty lines.
  const lines = useMemo(() => {
    const map = new Map<string, Line>();
    for (const e of weekEntries) {
      const key = `${e.workstreamId}||${e.activity}||${e.category}||${e.billable ? 1 : 0}`;
      if (!map.has(key)) map.set(key, { key, workstreamId: e.workstreamId, activity: e.activity, category: e.category, billable: e.billable, days: Array(7).fill(undefined) });
      const dayIdx = Math.floor(((e.date?.toMillis() ?? 0) - weekStart.getTime()) / 86400000);
      if (dayIdx >= 0 && dayIdx < 7) map.get(key)!.days[dayIdx] = e;
    }
    // add locally-added lines that don't yet have data
    for (const l of extraLines) if (!map.has(l.key)) map.set(l.key, l);
    return [...map.values()];
  }, [weekEntries, extraLines, weekStart]);

  // Week status: draft if any draft / empty, submitted if any submitted, else approved
  const weekStatus: TimeEntryStatus = useMemo(() => {
    if (weekEntries.length === 0) return "draft";
    const s = new Set(weekEntries.map((e) => e.status));
    if (s.has("draft")) return "draft";
    if (s.has("submitted")) return "submitted";
    return "approved";
  }, [weekEntries]);
  const locked = weekStatus !== "draft";

  const dayTotals = days.map((_, i) => lines.reduce((sum, l) => sum + (l.days[i]?.hours ?? 0), 0));
  const grandTotal = dayTotals.reduce((a, b) => a + b, 0);
  const billableTotal = weekEntries.filter((e) => e.billable).reduce((s, e) => s + e.hours, 0);
  const billablePct = grandTotal ? Math.round((billableTotal / grandTotal) * 100) : 0;

  async function commitCell(line: Line, dayIdx: number, raw: string) {
    if (locked) return;
    const val = parseFloat(raw);
    const hours = Number.isNaN(val) ? 0 : val;
    const existing = line.days[dayIdx];
    try {
      if (hours <= 0) {
        if (existing) await deleteTimeEntry(existing.id);
      } else if (existing) {
        if (hours !== existing.hours) await updateTimeEntry(existing.id, { hours });
      } else {
        const d = days[dayIdx];
        await createTimeEntry(projectId, currentName, {
          date: Timestamp.fromDate(new Date(d.getFullYear(), d.getMonth(), d.getDate(), 12)),
          personName: person, personOrg: personOrg(person),
          workstreamId: line.workstreamId, activity: line.activity, category: line.category,
          billable: line.billable, hours, status: "draft",
        });
        // once persisted the line comes from data; drop the local placeholder
        setExtraLines((xs) => xs.filter((x) => x.key !== line.key));
      }
    } catch {
      toast.error("Could not save hours");
    }
  }

  async function toggleBillable(line: Line) {
    if (locked) return;
    const next = !line.billable;
    setExtraLines((xs) => xs.map((x) => (x.key === line.key ? { ...x, billable: next, key: `${x.workstreamId}||${x.activity}||${x.category}||${next ? 1 : 0}` } : x)));
    await Promise.all(line.days.filter(Boolean).map((e) => updateTimeEntry(e!.id, { billable: next })));
  }

  async function deleteLine(line: Line) {
    if (locked) return;
    setExtraLines((xs) => xs.filter((x) => x.key !== line.key));
    await Promise.all(line.days.filter(Boolean).map((e) => deleteTimeEntry(e!.id)));
  }

  async function setWeekStatus(status: TimeEntryStatus) {
    try {
      await Promise.all(weekEntries.map((e) => updateTimeEntry(e.id, { status })));
      toast.success(status === "submitted" ? "Timesheet submitted" : status === "approved" ? "Timesheet approved" : "Timesheet reopened");
    } catch {
      toast.error("Could not update timesheet");
    }
  }

  function shiftWeek(delta: number) {
    const d = new Date(weekStart); d.setDate(d.getDate() + delta * 7); setWeekStart(d); setExtraLines([]);
  }

  const rangeLabel = `${days[0].toLocaleDateString("en-GB", { day: "numeric", month: "short" })} – ${days[6].toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "numeric" })}`;
  const meta = STATUS_META[weekStatus];
  const todayMs = mondayOf(new Date()).getTime();

  return (
    <div className="flex flex-col gap-4">
      {/* Toolbar */}
      <div className="flex flex-wrap items-center justify-between gap-3 rounded-card border border-bordergray bg-white px-5 py-3 shadow-card">
        <div className="flex items-center gap-3">
          <select
            className="rounded-input border border-bordergray bg-white px-3 py-1.5 text-sm font-medium text-ink outline-none focus:border-indigo"
            value={person}
            onChange={(e) => { setPerson(e.target.value); setExtraLines([]); }}
          >
            {people.map((p) => (
              <option key={p.name} value={p.name}>{p.name} · {p.org}</option>
            ))}
          </select>
          <div className="flex items-center gap-1">
            <button onClick={() => shiftWeek(-1)} className="rounded-btn border border-bordergray p-1.5 text-gray-500 hover:bg-gray-50"><ChevronLeft size={16} /></button>
            <span className="min-w-[170px] text-center text-sm font-semibold text-ink">{rangeLabel}</span>
            <button onClick={() => shiftWeek(1)} className="rounded-btn border border-bordergray p-1.5 text-gray-500 hover:bg-gray-50"><ChevronRight size={16} /></button>
            <button onClick={() => { setWeekStart(mondayOf(new Date())); setExtraLines([]); }} className="ml-1 rounded-btn border border-bordergray px-2.5 py-1.5 text-xs text-gray-600 hover:bg-gray-50">This week</button>
          </div>
        </div>
        <div className="flex items-center gap-3">
          <span className="rounded-full px-2.5 py-1 text-[11px] font-bold uppercase tracking-wide" style={{ color: meta.text, background: meta.bg }}>{meta.label}</span>
          {weekStatus === "draft" && grandTotal > 0 && (
            <button onClick={() => setWeekStatus("submitted")} className="flex items-center gap-1.5 rounded-btn bg-indigo px-3 py-1.5 text-sm font-semibold text-white hover:bg-indigo/90">
              <Send size={15} /> Submit week
            </button>
          )}
          {weekStatus === "submitted" && (
            <>
              <button onClick={() => setWeekStatus("draft")} className="flex items-center gap-1.5 rounded-btn border border-bordergray px-3 py-1.5 text-sm font-medium text-gray-600 hover:bg-gray-50">
                <RotateCcw size={14} /> Reject
              </button>
              <button onClick={() => setWeekStatus("approved")} className="flex items-center gap-1.5 rounded-btn bg-emerald px-3 py-1.5 text-sm font-semibold text-white hover:opacity-90">
                <Check size={15} /> Approve
              </button>
            </>
          )}
          {weekStatus === "approved" && (
            <button onClick={() => setWeekStatus("draft")} className="flex items-center gap-1.5 rounded-btn border border-bordergray px-3 py-1.5 text-sm font-medium text-gray-600 hover:bg-gray-50">
              <RotateCcw size={14} /> Reopen
            </button>
          )}
        </div>
      </div>

      {/* Week stats */}
      <div className="flex flex-wrap items-center gap-6 rounded-card border border-bordergray bg-white px-5 py-3 shadow-card">
        <Stat label="This week" value={`${fmtHrs(grandTotal)} / ${TARGET_HOURS}h`} color={grandTotal >= TARGET_HOURS ? "#28a745" : "#0d08d2"} />
        <div className="h-8 w-px bg-bordergray" />
        <Stat label="Billable" value={`${billablePct}%`} color="#28a745" />
        <div className="h-8 w-px bg-bordergray" />
        <Stat label="Lines" value={`${lines.length}`} color="#595b78" />
        <div className="ml-auto h-2 w-40 overflow-hidden rounded-full bg-gray-100">
          <div className="h-full rounded-full" style={{ width: `${Math.min(100, (grandTotal / TARGET_HOURS) * 100)}%`, background: grandTotal >= TARGET_HOURS ? "#28a745" : "#0d08d2" }} />
        </div>
      </div>

      {/* Grid */}
      <div className="overflow-x-auto rounded-card border border-bordergray bg-white shadow-card">
        <table className="w-full text-left text-sm">
          <thead className="bg-gray-50 text-[11px] uppercase tracking-wide text-gray-400">
            <tr>
              <th className="px-4 py-2.5">Workstream / Activity</th>
              <th className="px-3 py-2.5">Category</th>
              <th className="px-3 py-2.5">Bill</th>
              {days.map((d, i) => {
                const isToday = mondayOf(d).getTime() === todayMs && new Date().getDay() === (d.getDay());
                const weekend = i >= 5;
                return (
                  <th key={i} className={`px-2 py-2.5 text-center ${weekend ? "text-gray-300" : ""}`} style={isToday ? { color: "#0d08d2" } : {}}>
                    {DAY_LABELS[i]}<br /><span className="text-[10px] font-normal">{d.getDate()}</span>
                  </th>
                );
              })}
              <th className="px-3 py-2.5 text-right">Total</th>
              <th className="px-2 py-2.5"></th>
            </tr>
          </thead>
          <tbody>
            {lines.map((line) => {
              const rowTotal = line.days.reduce((s, e) => s + (e?.hours ?? 0), 0);
              return (
                <tr key={line.key} className="border-t border-bordergray">
                  <td className="px-4 py-2">
                    <div className="font-medium text-ink">{line.activity || <span className="italic text-gray-400">New line</span>}</div>
                    <div className="flex items-center gap-1.5 text-[11px] text-gray-500">
                      <span className="h-2 w-2 rounded-full" style={{ background: "#0d08d2" }} />
                      {line.workstreamId ? wsName(line.workstreamId) : "Unassigned"}
                    </div>
                  </td>
                  <td className="px-3 py-2">
                    <span className="rounded-full px-2 py-0.5 text-[11px]" style={{ background: "#f0f0f5", color: "#595b78" }}>{line.category}</span>
                  </td>
                  <td className="px-3 py-2">
                    <button
                      onClick={() => toggleBillable(line)}
                      disabled={locked}
                      className={`rounded-full px-2 py-0.5 text-[10px] font-semibold ${line.billable ? "bg-emerald/15 text-emerald" : "bg-gray-100 text-gray-400"}`}
                    >
                      {line.billable ? "Yes" : "No"}
                    </button>
                  </td>
                  {line.days.map((entry, i) => (
                    <td key={i} className={`px-1 py-2 text-center ${i >= 5 ? "bg-gray-50/40" : ""}`}>
                      <input
                        key={`${line.key}:${i}:${entry?.hours ?? ""}`}
                        type="number"
                        step="0.5"
                        min="0"
                        defaultValue={entry?.hours ? String(entry.hours) : ""}
                        disabled={locked}
                        onBlur={(e) => commitCell(line, i, e.target.value)}
                        className="w-12 rounded-input border border-transparent bg-transparent px-1 py-1 text-center text-sm text-ink outline-none hover:border-bordergray focus:border-indigo focus:bg-white disabled:cursor-default"
                        placeholder="·"
                      />
                    </td>
                  ))}
                  <td className="px-3 py-2 text-right font-semibold tabular-nums text-ink">{rowTotal ? fmtHrs(rowTotal) : "—"}</td>
                  <td className="px-2 py-2 text-right">
                    {!locked && (
                      <button onClick={() => deleteLine(line)} title="Remove line" className="rounded-btn p-1 text-gray-400 hover:bg-red-50 hover:text-critical"><Trash2 size={14} /></button>
                    )}
                  </td>
                </tr>
              );
            })}
            {lines.length === 0 && (
              <tr><td colSpan={11} className="px-4 py-8 text-center text-gray-300">No hours logged for this week. Add a line to start.</td></tr>
            )}
          </tbody>
          <tfoot>
            <tr className="border-t border-bordergray bg-gray-50 text-[12px] font-semibold text-ink">
              <td className="px-4 py-2.5" colSpan={3}>Daily total</td>
              {dayTotals.map((t, i) => (
                <td key={i} className="px-1 py-2.5 text-center tabular-nums" style={t > 10 ? { color: "#ff8b00" } : {}}>{t ? fmtHrs(t) : "—"}</td>
              ))}
              <td className="px-3 py-2.5 text-right tabular-nums" style={{ color: grandTotal >= TARGET_HOURS ? "#28a745" : "#15162b" }}>{fmtHrs(grandTotal)}</td>
              <td></td>
            </tr>
          </tfoot>
        </table>
      </div>

      {/* Add line */}
      {!locked && (adding ? (
        <AddLineForm
          roles={roles}
          existingKeys={new Set(lines.map((l) => l.key))}
          onAdd={(l) => { setExtraLines((xs) => [...xs, l]); setAdding(false); }}
          onCancel={() => setAdding(false)}
        />
      ) : (
        <button onClick={() => setAdding(true)} className="flex w-fit items-center gap-1.5 rounded-btn border border-dashed border-bordergray px-3 py-2 text-sm font-medium text-indigo hover:bg-indigo/5">
          <Plus size={16} /> Add line
        </button>
      ))}
    </div>
  );
}

function Stat({ label, value, color }: { label: string; value: string; color: string }) {
  return (
    <div>
      <p className="text-[11px] font-semibold uppercase tracking-wider text-gray-400">{label}</p>
      <p className="text-lg font-bold tabular-nums" style={{ color }}>{value}</p>
    </div>
  );
}

function AddLineForm({
  roles,
  existingKeys,
  onAdd,
  onCancel,
}: {
  roles: RoleResponsibility[];
  existingKeys: Set<string>;
  onAdd: (line: Line) => void;
  onCancel: () => void;
}) {
  const [workstreamId, setWorkstreamId] = useState(roles[0]?.id ?? "");
  const [activity, setActivity] = useState("");
  const [category, setCategory] = useState<TimeCategory>("Labour");
  const [billable, setBillable] = useState(true);

  const fieldCls = "rounded-input border border-bordergray bg-white px-2.5 py-1.5 text-sm text-ink outline-none focus:border-indigo";

  function submit() {
    if (!activity.trim()) return;
    const key = `${workstreamId}||${activity.trim()}||${category}||${billable ? 1 : 0}`;
    if (existingKeys.has(key)) { onCancel(); return; }
    onAdd({ key, workstreamId, activity: activity.trim(), category, billable, days: Array(7).fill(undefined) });
  }

  return (
    <div className="flex flex-wrap items-end gap-2 rounded-card border border-bordergray bg-white px-4 py-3 shadow-card">
      <select className={fieldCls} value={workstreamId} onChange={(e) => setWorkstreamId(e.target.value)}>
        <option value="">No workstream</option>
        {roles.map((r) => <option key={r.id} value={r.id}>{r.workstream}</option>)}
      </select>
      <input className={`${fieldCls} min-w-[220px] flex-1`} value={activity} autoFocus placeholder="Activity — e.g. Rebar fixing to Grid C" onChange={(e) => setActivity(e.target.value)} onKeyDown={(e) => e.key === "Enter" && submit()} />
      <select className={fieldCls} value={category} onChange={(e) => setCategory(e.target.value as TimeCategory)}>
        {TIME_CATEGORIES.map((c) => <option key={c} value={c}>{c}</option>)}
      </select>
      <label className="flex cursor-pointer items-center gap-1.5 rounded-input border border-bordergray px-2.5 py-1.5 text-sm text-gray-600">
        <input type="checkbox" checked={billable} onChange={(e) => setBillable(e.target.checked)} className="accent-indigo" /> Billable
      </label>
      <button onClick={submit} className="rounded-btn bg-indigo px-3 py-1.5 text-sm font-semibold text-white hover:bg-indigo/90">Add</button>
      <button onClick={onCancel} className="rounded-btn border border-bordergray px-3 py-1.5 text-sm text-gray-600 hover:bg-gray-50">Cancel</button>
    </div>
  );
}
