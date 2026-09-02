import { useMemo, useState } from "react";
import { Timestamp } from "firebase/firestore";
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

const labelCls = "mb-1 block text-[12px] font-medium text-gray-500";
const fieldCls =
  "w-full rounded-input border border-bordergray bg-white px-2.5 py-2 text-sm text-ink outline-none focus:border-indigo focus:ring-1 focus:ring-indigo";

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
      const parties = [
        r.accountable,
        r.responsibleCustomer,
        r.responsibleContractor,
        ...r.consulted,
        ...r.informedCustomer,
        ...r.informedContractor,
      ];
      for (const p of parties) {
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
      style={{ background: "rgba(7, 4, 116, 0.45)" }}
      onClick={(e) => e.target === e.currentTarget && onCancel()}
    >
      <div className="w-full max-w-md rounded-2xl bg-white p-6 shadow-2xl">
        <h2 className="text-[15px] font-semibold text-ink">Register time</h2>
        <p className="mt-1 text-[12px] text-gray-400">Log hours worked against a workstream.</p>

        <div className="mt-4 flex flex-col gap-4">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className={labelCls}>Date</label>
              <input type="date" className={fieldCls} value={date} onChange={(e) => setDate(e.target.value)} />
            </div>
            <div>
              <label className={labelCls}>Hours</label>
              <input type="number" step="0.5" min="0" className={fieldCls} value={hours} onChange={(e) => setHours(e.target.value)} />
            </div>
          </div>

          <div>
            <label className={labelCls}>Person</label>
            <select className={fieldCls} value={person} onChange={(e) => setPerson(e.target.value)}>
              {people.map((p) => (
                <option key={p.name} value={p.name}>
                  {p.name} · {p.org}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className={labelCls}>Workstream</label>
            <select className={fieldCls} value={workstreamId} onChange={(e) => setWorkstreamId(e.target.value)}>
              <option value="">No workstream</option>
              {roles.map((r) => (
                <option key={r.id} value={r.id}>
                  {r.workstream}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className={labelCls}>Activity</label>
            <input
              className={fieldCls}
              value={activity}
              onChange={(e) => setActivity(e.target.value)}
              placeholder="e.g. Rebar fixing to Grid C"
              autoFocus
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className={labelCls}>Category</label>
              <select className={fieldCls} value={category} onChange={(e) => setCategory(e.target.value as TimeCategory)}>
                {TIME_CATEGORIES.map((c) => (
                  <option key={c} value={c}>
                    {c}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className={labelCls}>Billable</label>
              <label className="flex h-[38px] cursor-pointer items-center gap-2 rounded-input border border-bordergray px-2.5 text-sm text-gray-600">
                <input type="checkbox" checked={billable} onChange={(e) => setBillable(e.target.checked)} className="accent-indigo" />
                {billable ? "Billable" : "Non-billable"}
              </label>
            </div>
          </div>

          <div>
            <label className={labelCls}>Notes</label>
            <textarea className={`${fieldCls} resize-none`} rows={2} value={notes} onChange={(e) => setNotes(e.target.value)} placeholder="Optional…" />
          </div>
        </div>

        <div className="mt-6 flex justify-end gap-2">
          <button onClick={onCancel} className="rounded-btn border border-bordergray px-4 py-1.5 text-sm text-gray-600 hover:bg-gray-50">
            Cancel
          </button>
          <button
            onClick={handleCreate}
            disabled={!canCreate}
            className="rounded-btn bg-indigo px-4 py-1.5 text-sm font-semibold text-white hover:bg-indigo/90 disabled:cursor-not-allowed disabled:opacity-50"
          >
            Register
          </button>
        </div>
      </div>
    </div>
  );
}
