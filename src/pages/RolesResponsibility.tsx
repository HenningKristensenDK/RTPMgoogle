import { useState } from "react";
import { Plus, Table2, Network, ListTree, Pencil } from "lucide-react";
import type { Party, RoleResponsibility } from "../types";
import { useRiskStore } from "../store/riskStore";
import { upsertRole } from "../firebase/firestore";
import { toast } from "../lib/toast";
import OrgChart from "../components/roles/OrgChart";
import RoleDrawer from "../components/roles/RoleDrawer";

type View = "table" | "orgchart";

const CUSTOMER_ZONE = "#e7e6fa";
const CONTRACTOR_ZONE = "#f7f7fb";

function PartyStack({ party }: { party: Party | null }) {
  if (!party || !party.name) return <span className="text-gray-300">—</span>;
  return (
    <div>
      <div className="text-[13px] font-medium text-ink">{party.name}</div>
      <div className="text-[11px] text-gray-400">{party.organization}</div>
    </div>
  );
}

function PartyListStack({ people }: { people: Party[] }) {
  if (people.length === 0) return <span className="text-gray-300">—</span>;
  return (
    <div className="flex flex-col gap-1.5">
      {people.map((p, i) => (
        <div key={i}>
          <div className="text-[12px] font-medium text-ink">{p.name}</div>
          <div className="text-[11px] text-gray-400">{p.organization}</div>
        </div>
      ))}
    </div>
  );
}

export default function RolesResponsibility() {
  const { roles, projectId } = useRiskStore();
  const [view, setView] = useState<View>("table");
  const [raci, setRaci] = useState(false);
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [editingRole, setEditingRole] = useState<RoleResponsibility | null>(null);

  function openCreateDrawer() {
    setEditingRole(null);
    setDrawerOpen(true);
  }

  function openEditDrawer(role: RoleResponsibility) {
    setEditingRole(role);
    setDrawerOpen(true);
  }

  async function handleSaveDrawer(patch: Partial<RoleResponsibility>) {
    try {
      await upsertRole({ ...patch, projectId });
      toast.success("Saved");
    } catch {
      toast.error("Save failed");
    }
  }

  return (
    <div className="flex h-full flex-col">
      <div className="flex items-center justify-between border-b border-bordergray bg-white px-6 py-4">
        <div>
          <h1 className="text-lg font-bold text-ink">
            {view === "orgchart" ? "OBS diagram" : raci ? "RACI" : "Roles & Responsibility"}
          </h1>
          <p className="text-xs text-gray-400">
            {view === "orgchart"
              ? "A real-time map of who does the work. Displays the project organization in detail and structures all contractors by contract tiers—making responsibilities, boundaries, and hierarchy immediately visible."
              : raci
              ? "Defines the project team and ownership across workstreams. Each workstream drives responsibility and automatically assigns all tasks, documents, and communication to the right people while informing stakeholders in real time."
              : "Source of truth for workstream lookups and involved parties"}
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
              <Network size={15} /> OBS diagram
            </button>
          </div>
          {view === "table" && (
            <button
              onClick={() => setRaci((v) => !v)}
              className={`flex items-center gap-1.5 rounded-btn border px-3 py-1.5 text-sm ${
                raci
                  ? "border-indigo bg-indigo text-white"
                  : "border-bordergray bg-white text-gray-500 hover:bg-gray-50"
              }`}
            >
              <ListTree size={15} /> RACI
            </button>
          )}
          {view === "table" && (
            <button
              onClick={openCreateDrawer}
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
            {raci ? (
              <RaciTable roles={roles} onEdit={openEditDrawer} />
            ) : (
              <CollapsedTable roles={roles} />
            )}
          </div>
        ) : (
          <div className="overflow-hidden rounded-card border border-bordergray shadow-card">
            <OrgChart projectId={projectId} roles={roles} />
          </div>
        )}
      </div>

      <RoleDrawer
        role={editingRole}
        open={drawerOpen}
        onClose={() => setDrawerOpen(false)}
        onSave={handleSaveDrawer}
      />
    </div>
  );
}

function CollapsedTable({ roles }: { roles: RoleResponsibility[] }) {
  return (
    <table className="w-full text-left text-sm">
      <thead className="bg-gray-50 text-[11px] tracking-wide text-gray-400">
        <tr>
          <th className="px-4 py-2.5">Workstream</th>
          <th className="px-4 py-2.5">Description</th>
          <th className="px-4 py-2.5">Customer</th>
          <th className="px-4 py-2.5">Contractor</th>
        </tr>
      </thead>
      <tbody>
        {roles.map((r) => (
          <tr key={r.id} className="border-t border-bordergray">
            <td className="px-4 py-2.5 font-medium text-ink">{r.workstream}</td>
            <td className="max-w-[280px] px-4 py-2.5 text-gray-500">{r.description}</td>
            <td className="px-4 py-2.5">
              <PartyStack party={r.responsibleCustomer} />
            </td>
            <td className="px-4 py-2.5">
              <PartyStack party={r.responsibleContractor} />
            </td>
          </tr>
        ))}
        {roles.length === 0 && (
          <tr>
            <td colSpan={4} className="px-4 py-8 text-center text-gray-300">
              No workstreams yet. Add the first one.
            </td>
          </tr>
        )}
      </tbody>
    </table>
  );
}

function RaciTable({
  roles,
  onEdit,
}: {
  roles: RoleResponsibility[];
  onEdit: (role: RoleResponsibility) => void;
}) {
  const th = "px-3 py-2.5 align-top";
  const td = "px-3 py-2.5 align-top";

  return (
    <table className="w-full text-left text-sm">
      <thead className="text-[11px] tracking-wide text-gray-500">
        <tr>
          <th rowSpan={2} className={`${th} bg-gray-50 align-middle`}>Workstream</th>
          <th rowSpan={2} className={`${th} bg-gray-50 align-middle`}>Description</th>
          <th rowSpan={2} className={`${th} bg-gray-50 align-middle`}>Accountable</th>
          <th colSpan={3} className="px-3 py-2 text-center" style={{ background: CUSTOMER_ZONE }}>
            Customer
          </th>
          <th colSpan={2} className="px-3 py-2 text-center" style={{ background: CONTRACTOR_ZONE }}>
            Contractor
          </th>
          <th rowSpan={2} className={`${th} bg-gray-50`} />
        </tr>
        <tr>
          <th className={th} style={{ background: CUSTOMER_ZONE }}>Consulted</th>
          <th className={th} style={{ background: CUSTOMER_ZONE }}>Responsible</th>
          <th className={th} style={{ background: CUSTOMER_ZONE }}>Informed</th>
          <th className={th} style={{ background: CONTRACTOR_ZONE }}>Responsible</th>
          <th className={th} style={{ background: CONTRACTOR_ZONE }}>Informed</th>
        </tr>
      </thead>
      <tbody>
        {roles.map((r) => (
          <tr key={r.id} className="border-t border-bordergray">
            <td className={`${td} font-medium text-ink`}>{r.workstream}</td>
            <td className={`${td} max-w-[220px] text-gray-500`}>{r.description}</td>
            <td className={td}>
              <PartyStack party={r.accountable} />
            </td>
            <td className={td} style={{ background: CUSTOMER_ZONE }}>
              <PartyStack party={r.consulted} />
            </td>
            <td className={td} style={{ background: CUSTOMER_ZONE }}>
              <PartyStack party={r.responsibleCustomer} />
            </td>
            <td className={td} style={{ background: CUSTOMER_ZONE }}>
              <PartyListStack people={r.informedCustomer} />
            </td>
            <td className={td} style={{ background: CONTRACTOR_ZONE }}>
              <PartyStack party={r.responsibleContractor} />
            </td>
            <td className={td} style={{ background: CONTRACTOR_ZONE }}>
              <PartyListStack people={r.informedContractor} />
            </td>
            <td className={td}>
              <button
                onClick={() => onEdit(r)}
                className="text-gray-400 hover:text-indigo"
                title="Edit"
              >
                <Pencil size={15} />
              </button>
            </td>
          </tr>
        ))}
        {roles.length === 0 && (
          <tr>
            <td colSpan={9} className="px-4 py-8 text-center text-gray-300">
              No workstreams yet. Add the first one.
            </td>
          </tr>
        )}
      </tbody>
    </table>
  );
}
