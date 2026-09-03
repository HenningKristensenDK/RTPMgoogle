import { useMemo, useState } from "react";
import { Timestamp } from "firebase/firestore";
import { ChevronLeft, ChevronRight, Plus, Send, Check, RotateCcw, Trash2, AlertTriangle } from "lucide-react";
import {
  TIME_CATEGORIES,
  type RoleResponsibility,
  type TimeCategory,
  type TimeEntry,
  type TimeEntryStatus,
} from "../../types";
import { createTimeEntry, updateTimeEntry, deleteTimeEntry } from "../../firebase/firestore";
import { toast } from "../../lib/toast";

/* RTPM brand tokens (from rtpm-design-system v4) */
const INK = "#15162b";
const SLATE = "#595b78";
const MUTE = "#8a8ca6";
const MUTE_SOFT = "#b9bacb";
const INDIGO = "#0d08d2";
const INDIGO_TINT = "#e7e6fa";
const LINE = "#e6e6f0";
const LINE_SOFT = "#f0f0f5";
const MIST = "#fafafd";
const GOLD = "#ffcc00";
const BILL_GREEN = "#00c794";
const GREEN_TINT = "#e8f6eb";
const GREEN_INK = "#1b7a31";
const AMBER = "#e0a800";
const AMBER_TINT = "#fdf4dd";
const AMBER_INK = "#8a6600";
const TODAY_BG = "#f1f0fb";

const DAY_LABELS = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];
const TARGET_HOURS = 37.5;
const OVER_DAY = 10;

/* Fixed workstream / category → brand series colour (max 5 + alt) */
const WS_COLOR: Record<string, string> = {
  "Civil Works": "#0d08d2",
  "MEP Infrastructure": "#00acff",
  "IT/Data Infrastructure": "#5652e0",
  Quality: "#00c794",
  HSE: "#ff8b00",
  "Permit and Authorities": "#aa00d3",
};
const SERIES = ["#0d08d2", "#00c794", "#ff8b00", "#00acff", "#aa00d3", "#5652e0"];
function wsColor(name: string, idx = 0): string {
  return WS_COLOR[name] ?? SERIES[idx % SERIES.length];
}
const CAT_COLOR: Record<string, string> = {
  Labour: "#0d08d2",
  Supervision: "#5652e0",
  Engineering: "#00acff",
  "Plant & Equipment": "#00c794",
  Travel: "#ff8b00",
  Other: "#aa00d3",
};

function mondayOf(d: Date): Date {
  const x = new Date(d);
  x.setHours(0, 0, 0, 0);
  const dow = (x.getDay() + 6) % 7;
  x.setDate(x.getDate() - dow);
  return x;
}
function fmtHrs(h: number): string {
  return (Math.round(h * 100) / 100).toString();
}

interface Line {
  key: string;
  workstreamId: string;
  activity: string;
  category: TimeCategory;
  billable: boolean;
  days: (TimeEntry | undefined)[];
}

/* Gold-primary / indigo-secondary / ghost — the design-system Button */
function Btn({
  variant = "secondary",
  onClick,
  children,
}: {
  variant?: "primary" | "secondary" | "ghost";
  onClick: () => void;
  children: React.ReactNode;
}) {
  const base =
    "inline-flex items-center gap-1.5 rounded-[9px] px-3.5 py-2 text-sm font-semibold transition-colors";
  const styles: Record<string, string> = {
    primary: "text-ink hover:brightness-[.97]",
    secondary: "text-white hover:brightness-110",
    ghost: "hover:bg-[#e7e6fa]",
  };
  const bg =
    variant === "primary"
      ? { background: GOLD }
      : variant === "secondary"
      ? { background: INDIGO }
      : { background: "transparent", color: INDIGO };
  return (
    <button onClick={onClick} className={`${base} ${styles[variant]}`} style={bg}>
      {children}
    </button>
  );
}

function StatusPill({ status }: { status: TimeEntryStatus }) {
  const meta =
    status === "approved"
      ? { label: "Approved", bg: GREEN_TINT, text: GREEN_INK }
      : status === "submitted"
      ? { label: "Submitted", bg: AMBER_TINT, text: AMBER_INK }
      : { label: "Draft", bg: LINE_SOFT, text: SLATE };
  return (
    <span
      className="rounded-full px-2.5 py-1 text-[11px] font-bold uppercase tracking-wide"
      style={{ color: meta.text, background: meta.bg }}
    >
      {meta.label}
    </span>
  );
}

function Ring({ pct, color, label }: { pct: number; color: string; label: string }) {
  const C = 2 * Math.PI * 32;
  const offset = C * (1 - Math.min(Math.max(pct, 0), 1));
  return (
    <div className="relative h-[88px] w-[88px] flex-none">
      <svg width="88" height="88" viewBox="0 0 88 88">
        <circle cx="44" cy="44" r="32" fill="none" stroke="#ededf4" strokeWidth="9" />
        <circle
          cx="44"
          cy="44"
          r="32"
          fill="none"
          stroke={color}
          strokeWidth="9"
          strokeLinecap="round"
          strokeDasharray={C}
          strokeDashoffset={offset}
          transform="rotate(-90 44 44)"
        />
      </svg>
      <div
        className="absolute inset-0 flex items-center justify-center font-headline text-[19px] font-bold tabular-nums"
        style={{ color: INK }}
      >
        {label}
      </div>
    </div>
  );
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
    if (currentName) {
      seen.add(currentName);
      out.push({ name: currentName, org: "Customer" });
    }
    for (const r of roles) {
      for (const p of [
        r.accountable,
        r.responsibleCustomer,
        r.responsibleContractor,
        ...r.consulted,
        ...r.informedCustomer,
        ...r.informedContractor,
      ]) {
        if (p && p.name && !seen.has(p.name)) {
          seen.add(p.name);
          out.push({ name: p.name, org: p.organization });
        }
      }
    }
    for (const e of entries)
      if (e.personName && !seen.has(e.personName)) {
        seen.add(e.personName);
        out.push({ name: e.personName, org: e.personOrg });
      }
    return out;
  }, [roles, entries, currentName]);

  const [person, setPerson] = useState(people[0]?.name ?? "");
  const [weekStart, setWeekStart] = useState(() => mondayOf(new Date()));
  const [extraLines, setExtraLines] = useState<Line[]>([]);
  const [adding, setAdding] = useState(false);

  const personOrg = (name: string) => people.find((p) => p.name === name)?.org ?? "";
  const wsName = (id: string) => roles.find((r) => r.id === id)?.workstream ?? "Unassigned";
  const wsIndex = (id: string) => Math.max(0, roles.findIndex((r) => r.id === id));

  const initials = (name: string) =>
    name
      .split(" ")
      .map((w) => w[0])
      .slice(0, 2)
      .join("")
      .toUpperCase();

  const days = useMemo(
    () =>
      Array.from({ length: 7 }, (_, i) => {
        const d = new Date(weekStart);
        d.setDate(d.getDate() + i);
        return d;
      }),
    [weekStart]
  );
  const weekEndMs = weekStart.getTime() + 7 * 86400000;

  const weekEntries = useMemo(
    () =>
      entries.filter(
        (e) =>
          e.personName === person &&
          (e.date?.toMillis() ?? 0) >= weekStart.getTime() &&
          (e.date?.toMillis() ?? 0) < weekEndMs
      ),
    [entries, person, weekStart, weekEndMs]
  );

  const lines = useMemo(() => {
    const map = new Map<string, Line>();
    for (const e of weekEntries) {
      const key = `${e.workstreamId}||${e.activity}||${e.category}||${e.billable ? 1 : 0}`;
      if (!map.has(key))
        map.set(key, {
          key,
          workstreamId: e.workstreamId,
          activity: e.activity,
          category: e.category,
          billable: e.billable,
          days: Array(7).fill(undefined),
        });
      const dayIdx = Math.floor(((e.date?.toMillis() ?? 0) - weekStart.getTime()) / 86400000);
      if (dayIdx >= 0 && dayIdx < 7) map.get(key)!.days[dayIdx] = e;
    }
    for (const l of extraLines) if (!map.has(l.key)) map.set(l.key, l);
    return [...map.values()];
  }, [weekEntries, extraLines, weekStart]);

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
  const utilPct = Math.round(Math.min(grandTotal / TARGET_HOURS, 1) * 100);
  const overDays = dayTotals
    .map((t, i) => (t > OVER_DAY ? DAY_LABELS[i] : null))
    .filter(Boolean) as string[];

  // hours by workstream / category (this person, this week)
  const wsBars = useMemo(() => {
    const m = new Map<string, number>();
    for (const l of lines) {
      const total = l.days.reduce((s, e) => s + (e?.hours ?? 0), 0);
      if (total <= 0) continue;
      const name = l.workstreamId ? wsName(l.workstreamId) : "Unassigned";
      m.set(name, (m.get(name) ?? 0) + total);
    }
    const max = Math.max(...[...m.values()], 1);
    return [...m.entries()].map(([label, val], i) => ({ label, val, color: wsColor(label, i), w: (val / max) * 100 }));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [lines]);
  const catBars = useMemo(() => {
    const m = new Map<string, number>();
    for (const l of lines) {
      const total = l.days.reduce((s, e) => s + (e?.hours ?? 0), 0);
      if (total <= 0) continue;
      m.set(l.category, (m.get(l.category) ?? 0) + total);
    }
    const max = Math.max(...[...m.values()], 1);
    return [...m.entries()].map(([label, val]) => ({ label, val, color: CAT_COLOR[label] ?? INDIGO, w: (val / max) * 100 }));
  }, [lines]);

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
          personName: person,
          personOrg: personOrg(person),
          workstreamId: line.workstreamId,
          activity: line.activity,
          category: line.category,
          billable: line.billable,
          hours,
          status: "draft",
        });
        setExtraLines((xs) => xs.filter((x) => x.key !== line.key));
      }
    } catch {
      toast.error("Could not save hours");
    }
  }

  async function toggleBillable(line: Line) {
    if (locked) return;
    const next = !line.billable;
    setExtraLines((xs) =>
      xs.map((x) =>
        x.key === line.key
          ? { ...x, billable: next, key: `${x.workstreamId}||${x.activity}||${x.category}||${next ? 1 : 0}` }
          : x
      )
    );
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
      toast.success(
        status === "submitted"
          ? "Timesheet submitted"
          : status === "approved"
          ? "Timesheet approved"
          : "Timesheet reopened"
      );
    } catch {
      toast.error("Could not update timesheet");
    }
  }

  function shiftWeek(delta: number) {
    const d = new Date(weekStart);
    d.setDate(d.getDate() + delta * 7);
    setWeekStart(d);
    setExtraLines([]);
  }

  const rangeLabel = `${days[0].toLocaleDateString("en-GB", { day: "numeric", month: "short" })} – ${days[6].toLocaleDateString(
    "en-GB",
    { day: "numeric", month: "short", year: "numeric" }
  )}`;
  const todayMonday = mondayOf(new Date()).getTime();
  const isThisWeek = todayMonday === weekStart.getTime();
  const todayIdx = isThisWeek ? (new Date().getDay() + 6) % 7 : -1;

  const colTemplate = "200px minmax(150px,1fr) 122px 66px repeat(7, minmax(0,1fr)) 70px 30px";

  const cardCls = "rounded-[14px] border bg-white shadow-[0_2px_8px_rgba(21,22,43,.08)]";

  return (
    <div className="flex flex-col gap-[18px]">
      {/* Toolbar */}
      <div className={`${cardCls} flex flex-wrap items-center justify-between gap-3 px-5 py-3`} style={{ borderColor: LINE }}>
        <div className="flex flex-wrap items-center gap-3">
          {/* week nav pill */}
          <div className="flex items-center gap-0.5 rounded-[10px] border p-[3px]" style={{ borderColor: LINE, background: "#f7f7fb" }}>
            <button onClick={() => shiftWeek(-1)} className="flex h-[30px] w-[30px] items-center justify-center rounded-lg hover:bg-white" style={{ color: SLATE }}>
              <ChevronLeft size={16} />
            </button>
            <span className="whitespace-nowrap px-2 font-headline text-sm font-semibold tabular-nums" style={{ color: INK }}>
              {rangeLabel}
            </span>
            <button onClick={() => shiftWeek(1)} className="flex h-[30px] w-[30px] items-center justify-center rounded-lg hover:bg-white" style={{ color: SLATE }}>
              <ChevronRight size={16} />
            </button>
            <button
              onClick={() => {
                setWeekStart(mondayOf(new Date()));
                setExtraLines([]);
              }}
              className="ml-0.5 rounded-[7px] px-2.5 py-1.5 text-xs font-semibold"
              style={{ color: INDIGO, background: INDIGO_TINT }}
            >
              This week
            </button>
          </div>
          {/* person selector */}
          <label className="flex items-center gap-2 rounded-[10px] border bg-white py-[5px] pl-1.5 pr-3" style={{ borderColor: LINE }}>
            <span className="flex h-7 w-7 items-center justify-center rounded-full font-headline text-[12px] font-bold" style={{ background: INDIGO_TINT, color: INDIGO }}>
              {initials(person || "?")}
            </span>
            <select
              value={person}
              onChange={(e) => {
                setPerson(e.target.value);
                setExtraLines([]);
              }}
              className="cursor-pointer bg-transparent text-[13.5px] font-semibold outline-none"
              style={{ color: INK }}
            >
              {people.map((p) => (
                <option key={p.name} value={p.name}>
                  {p.name} · {p.org}
                </option>
              ))}
            </select>
          </label>
        </div>
        <div className="flex items-center gap-3">
          <StatusPill status={weekStatus} />
          {weekStatus === "draft" && grandTotal > 0 && (
            <Btn variant="primary" onClick={() => setWeekStatus("submitted")}>
              <Send size={15} /> Submit week
            </Btn>
          )}
          {weekStatus === "submitted" && (
            <>
              <Btn variant="ghost" onClick={() => setWeekStatus("draft")}>
                <RotateCcw size={14} /> Reject
              </Btn>
              <Btn variant="primary" onClick={() => setWeekStatus("approved")}>
                <Check size={15} /> Approve week
              </Btn>
            </>
          )}
          {weekStatus === "approved" && (
            <Btn variant="ghost" onClick={() => setWeekStatus("draft")}>
              <RotateCcw size={14} /> Reopen
            </Btn>
          )}
        </div>
      </div>

      {/* Summary strip: utilisation ring + billable ring + bar lists */}
      <div className="grid gap-[18px] lg:grid-cols-[246px_1fr_1.4fr]">
        <div className={`${cardCls} flex items-center gap-[18px] px-5 py-[18px]`} style={{ borderColor: LINE }}>
          <Ring pct={grandTotal / TARGET_HOURS} color={INDIGO} label={`${utilPct}%`} />
          <div className="leading-tight">
            <div className="text-[11px] font-semibold uppercase tracking-[.1em]" style={{ color: MUTE }}>
              This week
            </div>
            <div className="font-headline text-[30px] font-bold tabular-nums" style={{ color: INK }}>
              {fmtHrs(grandTotal)}
              <span className="text-[16px] font-semibold" style={{ color: MUTE }}> h</span>
            </div>
            <div className="text-[12.5px]" style={{ color: SLATE }}>
              of {TARGET_HOURS}h target
            </div>
          </div>
        </div>
        <div className={`${cardCls} flex items-center gap-[18px] px-5 py-[18px]`} style={{ borderColor: LINE }}>
          <Ring pct={billablePct / 100} color={BILL_GREEN} label={`${billablePct}%`} />
          <div className="leading-tight">
            <div className="text-[11px] font-semibold uppercase tracking-[.1em]" style={{ color: MUTE }}>
              Billable
            </div>
            <div className="font-headline text-[30px] font-bold tabular-nums" style={{ color: INK }}>
              {fmtHrs(billableTotal)}
              <span className="text-[16px] font-semibold" style={{ color: MUTE }}> h</span>
            </div>
            <div className="text-[12.5px]" style={{ color: SLATE }}>
              {billablePct}% of logged hours
            </div>
          </div>
        </div>
        <div className={`${cardCls} grid grid-cols-2 gap-6 px-5 py-4`} style={{ borderColor: LINE }}>
          <BarList title="Hours by workstream" bars={wsBars} />
          <BarList title="Hours by category" bars={catBars} />
        </div>
      </div>

      {/* Grid */}
      <div className={`${cardCls} overflow-hidden`} style={{ borderColor: LINE }}>
        <div className="flex items-center justify-between border-b px-5 py-[15px]" style={{ borderColor: LINE_SOFT }}>
          <div className="flex items-center gap-3">
            <span className="font-headline text-[16px] font-bold" style={{ color: INK }}>
              Time entries
            </span>
            <span className="text-[12.5px]" style={{ color: MUTE }}>
              {lines.length} line{lines.length === 1 ? "" : "s"}
            </span>
          </div>
          <div className="flex items-center gap-2.5">
            <span className="text-[12px]" style={{ color: MUTE }}>
              {locked ? "Read-only" : "Auto-saved"}
            </span>
            <StatusPill status={weekStatus} />
          </div>
        </div>

        <div className="overflow-x-auto px-4 pb-4 pt-1.5">
          <div className="min-w-[860px]">
            {/* header row */}
            <div className="grid items-end border-b px-1.5 pb-2.5 pt-3" style={{ gridTemplateColumns: colTemplate, borderColor: LINE }}>
              <HeadCell>Workstream</HeadCell>
              <HeadCell>Activity</HeadCell>
              <HeadCell>Category</HeadCell>
              <HeadCell center>Bill</HeadCell>
              {days.map((d, i) => {
                const weekend = i >= 5;
                const today = i === todayIdx;
                return (
                  <div
                    key={i}
                    className="rounded-t-lg py-1 text-center"
                    style={{ background: today ? TODAY_BG : weekend ? MIST : "transparent" }}
                  >
                    <div className="text-[10px] font-semibold tracking-wide" style={{ color: today ? INDIGO : weekend ? MUTE : SLATE }}>
                      {DAY_LABELS[i]}
                    </div>
                    <div className="font-headline text-[13px] font-semibold tabular-nums" style={{ color: today ? INDIGO : weekend ? MUTE : SLATE }}>
                      {d.getDate()}
                    </div>
                  </div>
                );
              })}
              <HeadCell center>Total</HeadCell>
              <div />
            </div>

            {/* data rows */}
            {lines.map((line) => {
              const rowTotal = line.days.reduce((s, e) => s + (e?.hours ?? 0), 0);
              const idx = wsIndex(line.workstreamId);
              return (
                <div
                  key={line.key}
                  className="grid items-center border-b px-1.5"
                  style={{ gridTemplateColumns: colTemplate, borderColor: LINE_SOFT, minHeight: 48 }}
                >
                  <div className="flex min-w-0 items-center gap-2.5 pr-2">
                    <span className="h-[9px] w-[9px] flex-none rounded-full" style={{ background: wsColor(wsName(line.workstreamId), idx) }} />
                    <span className="truncate text-[13px] font-semibold" style={{ color: INK }}>
                      {line.workstreamId ? wsName(line.workstreamId) : "Unassigned"}
                    </span>
                  </div>
                  <div className="truncate pr-3 text-[13px]" style={{ color: line.activity ? INK : MUTE_SOFT }}>
                    {line.activity || "New line"}
                  </div>
                  <div>
                    <span className="inline-block rounded-full px-2.5 py-0.5 text-[11.5px] font-medium" style={{ background: "#efeff6", color: SLATE }}>
                      {line.category}
                    </span>
                  </div>
                  <div className="flex justify-center">
                    <button
                      onClick={() => toggleBillable(line)}
                      disabled={locked}
                      title={line.billable ? "Billable" : "Non-billable"}
                      className="relative h-[19px] w-[34px] rounded-full transition-colors disabled:opacity-60"
                      style={{ background: line.billable ? INDIGO : "#dcdce8" }}
                    >
                      <span className="absolute top-0.5 h-[15px] w-[15px] rounded-full bg-white shadow transition-all" style={{ left: line.billable ? 17 : 2 }} />
                    </button>
                  </div>
                  {line.days.map((entry, i) => {
                    const weekend = i >= 5;
                    const today = i === todayIdx;
                    const cellBg = locked ? "#f5f5fa" : today ? TODAY_BG : weekend ? MIST : "#fff";
                    return (
                      <div key={i} className="px-[3px] py-1">
                        <input
                          key={`${line.key}:${i}:${entry?.hours ?? ""}`}
                          type="number"
                          step="0.5"
                          min="0"
                          defaultValue={entry?.hours ? String(entry.hours) : ""}
                          disabled={locked}
                          onBlur={(e) => commitCell(line, i, e.target.value)}
                          placeholder="·"
                          className="h-8 w-full rounded-lg border text-center font-headline text-sm font-semibold tabular-nums outline-none transition-colors focus:border-[#0d08d2] disabled:cursor-default"
                          style={{ borderColor: locked ? "#ececf3" : LINE, background: cellBg, color: entry?.hours ? INK : MUTE_SOFT }}
                        />
                      </div>
                    );
                  })}
                  <div className="text-center font-headline text-[15px] font-bold tabular-nums" style={{ color: locked ? SLATE : INK }}>
                    {rowTotal ? fmtHrs(rowTotal) : "—"}
                  </div>
                  <div className="flex justify-center">
                    {!locked && (
                      <button onClick={() => deleteLine(line)} title="Remove line" className="rounded p-1 hover:bg-red-50 hover:text-critical" style={{ color: MUTE_SOFT }}>
                        <Trash2 size={14} />
                      </button>
                    )}
                  </div>
                </div>
              );
            })}
            {lines.length === 0 && (
              <div className="flex flex-col items-center gap-3 px-6 py-12 text-center">
                <div className="flex h-14 w-14 items-center justify-center rounded-[14px]" style={{ background: INDIGO_TINT }}>
                  <Plus size={26} style={{ color: INDIGO }} />
                </div>
                <div>
                  <div className="font-headline text-[18px] font-bold" style={{ color: INK }}>
                    No hours logged yet
                  </div>
                  <div className="mt-1 text-[13px]" style={{ color: MUTE }}>
                    Add your first line to start filling this week.
                  </div>
                </div>
              </div>
            )}

            {/* add line */}
            {!locked &&
              (adding ? (
                <AddLineForm
                  roles={roles}
                  existingKeys={new Set(lines.map((l) => l.key))}
                  onAdd={(l) => {
                    setExtraLines((xs) => [...xs, l]);
                    setAdding(false);
                  }}
                  onCancel={() => setAdding(false)}
                />
              ) : (
                <button onClick={() => setAdding(true)} className="flex items-center gap-2.5 px-2 pb-1.5 pt-3.5 text-[13px] font-semibold" style={{ color: INDIGO }}>
                  <span className="flex h-5 w-5 items-center justify-center rounded-md border border-dashed text-[15px] leading-none" style={{ borderColor: "#b7b4ee" }}>
                    +
                  </span>
                  Add line
                </button>
              ))}

            {/* footer */}
            {lines.length > 0 && (
              <div className="mt-1.5 grid items-center rounded-b-lg px-1.5 py-3" style={{ gridTemplateColumns: colTemplate, background: MIST, borderTop: `2px solid ${LINE}` }}>
                <div className="text-[11px] font-bold uppercase tracking-[.08em]" style={{ gridColumn: "1 / 5", color: SLATE }}>
                  Daily total
                </div>
                {dayTotals.map((t, i) => {
                  const over = t > OVER_DAY;
                  return (
                    <div key={i} className="flex justify-center px-[3px]">
                      <div
                        className="flex h-7 min-w-[40px] items-center justify-center rounded-md font-headline text-sm font-bold tabular-nums"
                        style={{ background: over ? AMBER_TINT : "transparent", color: over ? AMBER_INK : t ? INK : MUTE_SOFT }}
                      >
                        {t ? fmtHrs(t) : "–"}
                      </div>
                    </div>
                  );
                })}
                <div className="flex justify-center">
                  <div
                    className="flex h-[30px] min-w-[52px] items-center justify-center rounded-lg px-2 font-headline text-base font-bold tabular-nums"
                    style={{
                      background: grandTotal >= TARGET_HOURS ? GREEN_TINT : AMBER_TINT,
                      color: grandTotal >= TARGET_HOURS ? GREEN_INK : AMBER_INK,
                    }}
                  >
                    {fmtHrs(grandTotal)}
                  </div>
                </div>
                <div />
              </div>
            )}

            {overDays.length > 0 && (
              <div className="flex items-center gap-2 px-2 pb-1 pt-3 text-[11.5px]" style={{ color: AMBER_INK }}>
                <AlertTriangle size={13} style={{ color: AMBER }} />
                {overDays.join(", ")} {overDays.length === 1 ? "exceeds" : "exceed"} {OVER_DAY}h — review before submitting.
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

function HeadCell({ children, center }: { children: React.ReactNode; center?: boolean }) {
  return (
    <div className={`text-[10.5px] font-semibold uppercase tracking-[.09em] ${center ? "text-center" : ""}`} style={{ color: MUTE }}>
      {children}
    </div>
  );
}

function BarList({ title, bars }: { title: string; bars: { label: string; val: number; color: string; w: number }[] }) {
  return (
    <div className="min-w-0">
      <div className="mb-3 text-[11px] font-semibold uppercase tracking-[.1em]" style={{ color: MUTE }}>
        {title}
      </div>
      <div className="flex flex-col gap-2.5">
        {bars.length === 0 && <span className="text-[12px]" style={{ color: MUTE_SOFT }}>No hours yet</span>}
        {bars.map((b) => (
          <div key={b.label} className="flex items-center gap-2">
            <span className="w-[74px] truncate text-[11px]" style={{ color: SLATE }}>
              {b.label}
            </span>
            <div className="h-2 flex-1 overflow-hidden rounded-full" style={{ background: LINE_SOFT }}>
              <div className="h-full rounded-full" style={{ width: `${b.w}%`, background: b.color }} />
            </div>
            <span className="w-[30px] text-right font-headline text-[12px] font-semibold tabular-nums" style={{ color: INK }}>
              {fmtHrs(b.val)}
            </span>
          </div>
        ))}
      </div>
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

  const fieldCls = "rounded-[9px] border bg-white px-2.5 py-2 text-sm outline-none focus:border-[#0d08d2]";

  function submit() {
    if (!activity.trim()) return;
    const key = `${workstreamId}||${activity.trim()}||${category}||${billable ? 1 : 0}`;
    if (existingKeys.has(key)) {
      onCancel();
      return;
    }
    onAdd({ key, workstreamId, activity: activity.trim(), category, billable, days: Array(7).fill(undefined) });
  }

  return (
    <div className="mt-3 flex flex-wrap items-end gap-2 rounded-[12px] border p-3" style={{ borderColor: LINE, background: MIST }}>
      <select className={fieldCls} style={{ borderColor: LINE, color: INK }} value={workstreamId} onChange={(e) => setWorkstreamId(e.target.value)}>
        <option value="">No workstream</option>
        {roles.map((r) => (
          <option key={r.id} value={r.id}>
            {r.workstream}
          </option>
        ))}
      </select>
      <input
        className={`${fieldCls} min-w-[220px] flex-1`}
        style={{ borderColor: LINE, color: INK }}
        value={activity}
        autoFocus
        placeholder="Activity — e.g. Rebar fixing to Grid C"
        onChange={(e) => setActivity(e.target.value)}
        onKeyDown={(e) => e.key === "Enter" && submit()}
      />
      <select className={fieldCls} style={{ borderColor: LINE, color: INK }} value={category} onChange={(e) => setCategory(e.target.value as TimeCategory)}>
        {TIME_CATEGORIES.map((c) => (
          <option key={c} value={c}>
            {c}
          </option>
        ))}
      </select>
      <label className="flex cursor-pointer items-center gap-1.5 rounded-[9px] border px-2.5 py-2 text-sm" style={{ borderColor: LINE, color: SLATE }}>
        <input type="checkbox" checked={billable} onChange={(e) => setBillable(e.target.checked)} className="accent-indigo" /> Billable
      </label>
      <Btn variant="secondary" onClick={submit}>
        Add
      </Btn>
      <button onClick={onCancel} className="rounded-[9px] border px-3 py-2 text-sm" style={{ borderColor: LINE, color: SLATE }}>
        Cancel
      </button>
    </div>
  );
}
