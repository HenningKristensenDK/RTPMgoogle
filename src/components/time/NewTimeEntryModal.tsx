import { useMemo, useState } from "react";
import { Timestamp } from "firebase/firestore";
import { X } from "lucide-react";
import { TIME_CATEGORIES, type TimeCategory, type RoleResponsibility } from "../../types";

export interface NewTimeEntryData {
  date: Timestamp;
  personName: string;
  personOrg: string;
  workstreamId: string;
  activity: string;
  category: TimeCategory;
  hours: number;
  billable: boolean;
  notes: string;
}

interface Props {
  roles: RoleResponsibility[];
  currentName: string;
  onCreate: (data: NewTimeEntryData) => void;
  onCancel: () => void;
}

const INK = "#15162b";
const MUTE = "#8a8ca6";
const INDIGO = "#0d08d2";
const INDIGO_TINT = "#e7e6fa";
const LINE = "#e6e6f0";
const LINE_SOFT = "#f0f0f5";
const GOLD = "#ffcc00";

const WS_COLOR: Record<string, string> = {
  "Civil Works": "#0d08d2",
  "MEP Infrastructure": "#00acff",
  "IT/Data Infrastructure": "#5652e0",
  Quality: "#00c794",
  HSE: "#ff8b00",
  "Permit and Authorities": "#aa00d3",
};
const SERIES = ["#0d08d2", "#00c794", "#ff8b00", "#00acff", "#aa00d3", "#5652e0"];

const labelCls = "mb-1.5 block text-[11px] font-semibold uppercase tracking-[.08em]";
const fieldCls = "w-full rounded-[9px] border bg-white px-3 py-[11px] text-[13.5px] outline-none";

function todayInput(): string {
  return new Date().toISOString().slice(0, 10);
}

export default function NewTimeEntryModal({ roles, currentName, onCreate, onCancel }: Props) {
  const people = useMemo(() => {
    const seen = new Set<string>();
    const out: { name: string; org: string }[] = [];
    if (currentName) {
      seen.add(currentName);
      out.push({ name: currentName, org: "Customer" });
    }
    for (const r of roles) {
      for (const p of [r.accountable, r.responsibleCustomer, r.responsibleContractor, ...r.consulted, ...r.informedCustomer, ...r.informedContractor]) {
        if (p && p.name && !seen.has(p.name)) {
          seen.add(p.name);
          out.push({ name: p.name, org: p.organization });
        }
      }
    }
    return out;
  }, [roles, currentName]);

  const [date, setDate] = useState(todayInput());
  const [person, setPerson] = useState(people[0]?.name ?? "");
  const [workstreamId, setWorkstreamId] = useState(roles[0]?.id ?? "");
  const [activity, setActivity] = useState("");
  const [category, setCategory] = useState<TimeCategory>("Labour");
  const [hours, setHours] = useState("8");
  const [billable, setBillable] = useState(true);
  const [notes, setNotes] = useState("");

  const hoursNum = parseFloat(hours);
  const canCreate = activity.trim() !== "" && !Number.isNaN(hoursNum) && hoursNum > 0;

  const wsName = roles.find((r) => r.id === workstreamId)?.workstream ?? "";
  const wsColor = WS_COLOR[wsName] ?? SERIES[Math.max(0, roles.findIndex((r) => r.id === workstreamId)) % SERIES.length];

  function handleCreate() {
    if (!canCreate) return;
    const p = people.find((x) => x.name === person);
    onCreate({
      date: Timestamp.fromDate(new Date(`${date}T12:00:00`)),
      personName: person,
      personOrg: p?.org ?? "",
      workstreamId,
      activity: activity.trim(),
      category,
      hours: hoursNum,
      billable,
      notes: notes.trim(),
    });
  }

  return (
    <div
      className="fixed inset-0 z-[60] flex items-center justify-center p-6"
      style={{ background: "rgba(7, 4, 116, 0.28)" }}
      onClick={(e) => e.target === e.currentTarget && onCancel()}
    >
      <div className="w-full max-w-[480px] overflow-hidden rounded-[16px] bg-white shadow-[0_8px_24px_rgba(21,22,43,.22)]">
        <div className="flex items-center justify-between border-b px-6 py-4" style={{ borderColor: LINE_SOFT }}>
          <h2 className="font-headline text-[19px] font-bold" style={{ color: INK }}>
            Add time line
          </h2>
          <button onClick={onCancel} style={{ color: "#b9bacb" }}>
            <X size={20} />
          </button>
        </div>

        <div className="flex flex-col gap-4 px-6 py-5">
          <div>
            <label className={labelCls} style={{ color: MUTE }}>
              Workstream
            </label>
            <div className="flex items-center gap-2.5 rounded-[9px] border px-3" style={{ borderColor: LINE }}>
              <span className="h-[9px] w-[9px] flex-none rounded-full" style={{ background: wsColor }} />
              <select value={workstreamId} onChange={(e) => setWorkstreamId(e.target.value)} className="w-full cursor-pointer bg-transparent py-[11px] text-[13.5px] outline-none" style={{ color: INK }}>
                <option value="">No workstream</option>
                {roles.map((r) => (
                  <option key={r.id} value={r.id}>
                    {r.workstream}
                  </option>
                ))}
              </select>
            </div>
          </div>

          <div>
            <label className={labelCls} style={{ color: MUTE }}>
              Activity
            </label>
            <input
              className={fieldCls}
              style={{ borderColor: INDIGO, color: INK, boxShadow: `0 0 0 3px ${INDIGO_TINT}` }}
              value={activity}
              onChange={(e) => setActivity(e.target.value)}
              placeholder="e.g. Rebar fixing to Grid C"
              autoFocus
            />
          </div>

          <div className="grid grid-cols-2 gap-3.5">
            <div>
              <label className={labelCls} style={{ color: MUTE }}>
                Category
              </label>
              <select className={fieldCls} style={{ borderColor: LINE, color: INK }} value={category} onChange={(e) => setCategory(e.target.value as TimeCategory)}>
                {TIME_CATEGORIES.map((c) => (
                  <option key={c} value={c}>
                    {c}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className={labelCls} style={{ color: MUTE }}>
                Billable
              </label>
              <button
                onClick={() => setBillable((b) => !b)}
                className="flex h-[42px] w-full items-center gap-2.5 rounded-[9px] border px-3"
                style={{ borderColor: LINE }}
              >
                <span className="relative h-[19px] w-[34px] flex-none rounded-full transition-colors" style={{ background: billable ? INDIGO : "#dcdce8" }}>
                  <span className="absolute top-0.5 h-[15px] w-[15px] rounded-full bg-white shadow transition-all" style={{ left: billable ? 17 : 2 }} />
                </span>
                <span className="text-[13px] font-medium" style={{ color: INK }}>
                  {billable ? "Billable" : "Non-billable"}
                </span>
              </button>
            </div>
          </div>

          <div>
            <label className={labelCls} style={{ color: MUTE }}>
              Date &amp; hours
            </label>
            <div className="flex items-stretch gap-2.5">
              <input type="date" className={`${fieldCls} flex-1 font-headline`} style={{ borderColor: LINE, color: INK }} value={date} onChange={(e) => setDate(e.target.value)} />
              <div className="flex w-[110px] items-center rounded-[9px] border px-3" style={{ borderColor: LINE }}>
                <input
                  type="number"
                  step="0.5"
                  min="0"
                  className="w-full bg-transparent text-center font-headline text-[13.5px] font-bold outline-none"
                  style={{ color: INK }}
                  value={hours}
                  onChange={(e) => setHours(e.target.value)}
                />
                <span className="text-[13px]" style={{ color: MUTE }}>
                  h
                </span>
              </div>
            </div>
          </div>

          <div>
            <label className={labelCls} style={{ color: MUTE }}>
              Person
            </label>
            <select className={fieldCls} style={{ borderColor: LINE, color: INK }} value={person} onChange={(e) => setPerson(e.target.value)}>
              {people.map((p) => (
                <option key={p.name} value={p.name}>
                  {p.name} · {p.org}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className={labelCls} style={{ color: MUTE }}>
              Notes (optional)
            </label>
            <textarea className={`${fieldCls} resize-none`} style={{ borderColor: LINE, color: INK }} rows={2} value={notes} onChange={(e) => setNotes(e.target.value)} placeholder="Optional…" />
          </div>
        </div>

        <div className="flex justify-end gap-2.5 border-t px-6 py-4" style={{ borderColor: LINE_SOFT }}>
          <button onClick={onCancel} className="rounded-[9px] px-4 py-2 text-sm font-semibold" style={{ color: INDIGO }}>
            Cancel
          </button>
          <button
            onClick={handleCreate}
            disabled={!canCreate}
            className="rounded-[9px] px-4 py-2 text-sm font-semibold transition-[filter] hover:brightness-[.97] disabled:cursor-not-allowed disabled:opacity-50"
            style={{ background: GOLD, color: INK }}
          >
            Add line
          </button>
        </div>
      </div>
    </div>
  );
}
