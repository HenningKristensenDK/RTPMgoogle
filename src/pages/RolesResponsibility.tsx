import { useState } from "react";
import { Plus, Table2, Network } from "lucide-react";
import type { Party, RoleResponsibility } from "../types";
import { useRiskStore } from "../store/riskStore";
import { upsertRole } from "../firebase/firestore";
import { toast } from "../lib/toast";
import OrgChart from "../components/roles/OrgChart";

type View = "table" | "orgchart";

const EMPTY_PARTY: Party = { name: "", organization: "", role: "" };

export default function RolesResponsibility() {
  const { roles, projectId } = useRiskStore();
  const [view, setView] = useState<View>("table");
  const [savingId, setSavingId] = useState<string | null>(null);

  async function save(role: Partial<RoleResponsibility>) {
    setSavingId(role.id || "new");
    try {
      await upsertRole({ ...role, projectId });
      toast.success("Saved");
    } catch {
      toast.error("Save failed");
    } finally {
      setSavingId(null);
    }
  }

  async function addRow() {
    await save({
      workstream: "New Workstream",
      accountable: EMPTY_PARTY,
      consulted: EMPTY_PARTY,
      responsibleCustomer: null,
      responsibleContractor: null,
      informedCustomer: null,
      informedContractor: null,
      description: "",
    });
  }

  return (
    <div className="flex h-full flex-col">
      <div className="flex items-center justify-between border-b border-bordergray bg-white px-6 py-4">
        <div>
          <h1 className="text-lg font-bold text-ink">
            Roles &amp; Responsibility
          </h1>
          <p className="text-xs text-gray-400">
            Source of truth for workstream lookups and involved parties
          </p>
        </div>
        <div className="flex items-center gap-2">
          <div className="flex overflow-hidden rounded-btn border border-bordergray">
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
            <button
              onClick={() => setView("orgchart")}
              className={`flex items-center gap-1.5 px-3 py-1.5 text-sm ${
                view === "orgchart"
                  ? "bg-indigo text-white"
                  : "bg-white text-gray-500 hover:bg-gray-50"
              }`}
            >
              <Network size={15} /> Org Chart
            </button>
          </div>
          {view === "table" && (
            <button
              onClick={addRow}
              className="flex items-center gap-1.5 rounded-btn bg-indigo px-3 py-1.5 text-sm font-semibold text-white hover:bg-indigo/90"
            >
              <Plus size={16} /> Add workstream
            </button>
          )}
        </div>
      </div>

      <div className="scroll-thin flex-1 overflow-auto p-6">
        {view === "table" ? (
          <div className="overflow-x-auto rounded-card border border-bordergray bg-white shadow-card">
            <table className="w-full text-left text-sm">
              <thead className="bg-gray-50 text-[11px] uppercase tracking-wide text-gray-400">
                <tr>
                  <th className="px-3 py-2.5">Workstream</th>
                  <th className="px-3 py-2.5">Accountable</th>
                  <th className="px-3 py-2.5">Consulted</th>
                  <th className="px-3 py-2.5">Responsible – Customer</th>
                  <th className="px-3 py-2.5">Responsible – Contractor</th>
                  <th className="px-3 py-2.5">Informed – Customer</th>
                  <th className="px-3 py-2.5">Informed – Contractor</th>
                  <th className="px-3 py-2.5">Description</th>
                </tr>
              </thead>
              <tbody>
                {roles.map((r) => (
                  <Row key={r.id} role={r} onSave={save} saving={savingId === r.id} />
                ))}
                {roles.length === 0 && (
                  <tr>
                    <td colSpan={8} className="px-3 py-8 text-center text-gray-300">
                      No workstreams yet. Add the first one.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        ) : (
          <div className="rounded-card border border-bordergray bg-white shadow-card">
            <OrgChart projectId={projectId} />
          </div>
        )}
      </div>
    </div>
  );
}

function PartyCell({
  party,
  nullable,
  onChange,
}: {
  party: Party | null;
  nullable: boolean;
  onChange: (next: Party | null) => void;
}) {
  const inputCls =
    "w-full min-w-[130px] bg-transparent px-1 py-0.5 text-[12px] outline-none focus:rounded focus:bg-indigo/5";

  if (party === null) {
    return (
      <button
        onClick={() => onChange({ ...EMPTY_PARTY })}
        className="px-2 py-1 text-[11px] text-gray-300 hover:text-indigo"
      >
        + Add
      </button>
    );
  }

  return (
    <div className="flex flex-col gap-0.5 py-1">
      <input
        className={`${inputCls} font-medium text-ink`}
        placeholder="Name"
        value={party.name}
        onChange={(e) => onChange({ ...party, name: e.target.value })}
      />
      <input
        className={`${inputCls} text-gray-500`}
        placeholder="Organization"
        value={party.organization}
        onChange={(e) => onChange({ ...party, organization: e.target.value })}
      />
      <div className="flex items-center gap-1">
        <input
          className={`${inputCls} text-gray-400`}
          placeholder="Role"
          value={party.role}
          onChange={(e) => onChange({ ...party, role: e.target.value })}
        />
        {nullable && (
          <button
            onClick={() => onChange(null)}
            title="Clear"
            className="shrink-0 px-1 text-gray-300 hover:text-critical"
          >
            ×
          </button>
        )}
      </div>
    </div>
  );
}

function Row({
  role,
  onSave,
  saving,
}: {
  role: RoleResponsibility;
  onSave: (r: Partial<RoleResponsibility>) => void;
  saving: boolean;
}) {
  const [draft, setDraft] = useState(role);

  function commit(next: RoleResponsibility) {
    setDraft(next);
    onSave(next);
  }

  const cell =
    "w-full bg-transparent px-1 py-1 text-sm outline-none focus:rounded focus:bg-indigo/5";

  return (
    <tr className={`border-t border-bordergray align-top ${saving ? "opacity-60" : ""}`}>
      <td className="px-3 py-2">
        <input
          className={`${cell} font-medium`}
          value={draft.workstream}
          onChange={(e) => setDraft({ ...draft, workstream: e.target.value })}
          onBlur={() => commit(draft)}
        />
      </td>
      <td className="px-3 py-2">
        <PartyCell
          party={draft.accountable}
          nullable={false}
          onChange={(p) => commit({ ...draft, accountable: p as Party })}
        />
      </td>
      <td className="px-3 py-2">
        <PartyCell
          party={draft.consulted}
          nullable={false}
          onChange={(p) => commit({ ...draft, consulted: p as Party })}
        />
      </td>
      <td className="px-3 py-2">
        <PartyCell
          party={draft.responsibleCustomer}
          nullable
          onChange={(p) => commit({ ...draft, responsibleCustomer: p })}
        />
      </td>
      <td className="px-3 py-2">
        <PartyCell
          party={draft.responsibleContractor}
          nullable
          onChange={(p) => commit({ ...draft, responsibleContractor: p })}
        />
      </td>
      <td className="px-3 py-2">
        <PartyCell
          party={draft.informedCustomer}
          nullable
          onChange={(p) => commit({ ...draft, informedCustomer: p })}
        />
      </td>
      <td className="px-3 py-2">
        <PartyCell
          party={draft.informedContractor}
          nullable
          onChange={(p) => commit({ ...draft, informedContractor: p })}
        />
      </td>
      <td className="px-3 py-2">
        <textarea
          className={`${cell} min-w-[180px] resize-none`}
          rows={2}
          value={draft.description}
          onChange={(e) => setDraft({ ...draft, description: e.target.value })}
          onBlur={() => commit(draft)}
        />
      </td>
    </tr>
  );
}
