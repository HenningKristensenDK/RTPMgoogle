import { useEffect, useState } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { Plus, Table2, Network, Pencil } from "lucide-react";
import type { Organization, Party, RoleResponsibility } from "../types";
import { useRiskStore } from "../store/riskStore";
import { upsertRole, watchOrganizations } from "../firebase/firestore";
import { toast } from "../lib/toast";
import { TIER_COLORS, DEFAULT_TIER_COLOR, tierOf, tierColor } from "../lib/tiers";
import PersonAvatar from "../components/common/PersonAvatar";
import OrgChart from "../components/roles/OrgChart";
import RoleDrawer from "../components/roles/RoleDrawer";

type View = "table" | "orgchart";

interface TierMeta {
  color: string;
  label: string;
  sublabel: string;
}

const TIER_META: Record<number, TierMeta> = {
  0: { color: TIER_COLORS[0], label: "Tier 0", sublabel: "Customer & PMC" },
  1: { color: TIER_COLORS[1], label: "Tier 1", sublabel: "Main contractors" },
  2: { color: TIER_COLORS[2], label: "Tier 2", sublabel: "Sub-contractors" },
  3: { color: TIER_COLORS[3], label: "Tier 3", sublabel: "Vendors & suppliers" },
};

function tierMeta(tier: number): TierMeta {
  return TIER_META[tier] ?? { color: DEFAULT_TIER_COLOR, label: `Tier ${tier}`, sublabel: "" };
}

const RACI_META: Record<"A" | "R" | "C" | "I", { bg: string; label: string }> = {
  A: { bg: "#15162b", label: "Accountable owns the outcome" },
  R: { bg: "#0d08d2", label: "Responsible does the work, one per side" },
  C: { bg: "#00acff", label: "Consulted gives input first" },
  I: { bg: "#9CA3AF", label: "Informed kept up to date" },
};

interface RaciEntry {
  raci: "A" | "R" | "C" | "I";
  party: Party;
}

function raciEntries(r: RoleResponsibility): RaciEntry[] {
  const entries: RaciEntry[] = [{ raci: "A", party: r.accountable }];
  for (const p of r.consulted) entries.push({ raci: "C", party: p });
  if (r.responsibleCustomer) entries.push({ raci: "R", party: r.responsibleCustomer });
  if (r.responsibleContractor) entries.push({ raci: "R", party: r.responsibleContractor });
  for (const p of r.informedCustomer) entries.push({ raci: "I", party: p });
  for (const p of r.informedContractor) entries.push({ raci: "I", party: p });
  return entries;
}

function RaciBadge({ raci }: { raci: "A" | "R" | "C" | "I" }) {
  return (
    <span
      className="flex h-[18px] w-[18px] shrink-0 items-center justify-center rounded-full text-[10px] font-bold text-white"
      style={{ background: RACI_META[raci].bg }}
    >
      {raci}
    </span>
  );
}

function PersonCard({
  party,
  orgs,
  raci,
}: {
  party: Party;
  orgs: Organization[];
  raci?: "A" | "R" | "C" | "I";
}) {
  return (
    <div className="flex items-start gap-2">
      {raci && <RaciBadge raci={raci} />}
      <PersonAvatar name={party.name} ringColor={tierColor(orgs, party.organization)} size={28} />
      <div className="min-w-0">
        <div className="flex items-center gap-1.5">
          <span className="truncate text-[13px] font-semibold text-ink">{party.name}</span>
        </div>
        <div className="truncate text-[11px] text-gray-500">{party.role}</div>
        <div className="truncate text-[11px] italic text-gray-400">{party.organization}</div>
      </div>
    </div>
  );
}

function LegendBar({ orgs }: { orgs: Organization[] }) {
  const tiersPresent = [...new Set(orgs.map((o) => o.tier))].sort((a, b) => a - b);

  return (
    <div className="mb-4 flex flex-wrap items-center gap-x-7 gap-y-2.5 rounded-card border border-bordergray bg-white px-4 py-3 shadow-card">
      <div className="flex flex-wrap items-center gap-5">
        {(["A", "R", "C", "I"] as const).map((k) => (
          <div key={k} className="flex items-center gap-2">
            <RaciBadge raci={k} />
            <span className="text-[11px] text-gray-600">{RACI_META[k].label}</span>
          </div>
        ))}
      </div>
      <div className="hidden h-5 w-px self-stretch bg-bordergray sm:block" />
      <div className="flex flex-wrap items-center gap-4">
        {tiersPresent.map((t) => {
          const meta = tierMeta(t);
          return (
            <div key={t} className="flex items-center gap-1.5">
              <span className="h-2.5 w-2.5 rounded-full" style={{ background: meta.color }} />
              <span className="text-[11px] text-gray-600">
                <strong className="text-ink">{meta.label}</strong> {meta.sublabel}
              </span>
            </div>
          );
        })}
      </div>
    </div>
  );
}

function WorkstreamCell({
  role,
  onEdit,
}: {
  role: RoleResponsibility;
  onEdit: (role: RoleResponsibility) => void;
}) {
  return (
    <div className="group flex items-start justify-between gap-2">
      <div>
        <div className="font-semibold text-ink">{role.workstream}</div>
        <div className="mt-0.5 max-w-[26ch] text-[12px] text-gray-500">{role.description}</div>
      </div>
      <button
        onClick={() => onEdit(role)}
        className="shrink-0 text-gray-300 opacity-0 transition-opacity hover:text-indigo group-hover:opacity-100"
        title="Edit workstream"
      >
        <Pencil size={14} />
      </button>
    </div>
  );
}

export default function RolesResponsibility() {
  const { roles, projectId } = useRiskStore();
  const [orgs, setOrgs] = useState<Organization[]>([]);
  const [view, setView] = useState<View>("table");
  const [raci, setRaci] = useState(false);
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [editingRole, setEditingRole] = useState<RoleResponsibility | null>(null);
  const location = useLocation();
  const navigate = useNavigate();

  useEffect(() => {
    if (!projectId) return;
    return watchOrganizations(projectId, setOrgs);
  }, [projectId]);

  // Arriving from the Project Manager Agent's "who's responsible for X" prompt —
  // open that workstream's drawer once its data has loaded, then clear the nav
  // state so refreshing this page doesn't reopen it.
  useEffect(() => {
    const workstreamId = (location.state as { openWorkstreamId?: string } | null)?.openWorkstreamId;
    if (!workstreamId || roles.length === 0) return;
    const match = roles.find((r) => r.id === workstreamId);
    if (match) {
      setEditingRole(match);
      setDrawerOpen(true);
    }
    navigate(location.pathname, { replace: true, state: {} });
  }, [location, roles, navigate]);

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
          <p className="text-[12px] text-gray-400">
            {view === "orgchart"
              ? "A real-time map of who does the work. Displays the project organization in detail and structures all contractors by contract tiers—making responsibilities, boundaries, and hierarchy immediately visible."
              : raci
              ? "Defines the project team and ownership across workstreams. Each workstream drives responsibility and automatically assigns all tasks, documents, and communication to the right people while informing stakeholders in real time."
              : "Who is engaged at each contractual tier, and in what RACI capacity."}
          </p>
        </div>
        <div className="flex items-center gap-6">
          <div className="flex h-9 overflow-hidden rounded-btn border border-bordergray">
            <button
              onClick={() => setView("table")}
              className={`flex h-full items-center gap-1.5 whitespace-nowrap px-3 text-sm ${
                view === "table"
                  ? "bg-indigo text-white"
                  : "bg-white text-gray-500 hover:bg-gray-50"
              }`}
            >
              <Table2 size={15} /> Table
            </button>
            <button
              onClick={() => setView("orgchart")}
              className={`flex h-full items-center gap-1.5 whitespace-nowrap px-3 text-sm ${
                view === "orgchart"
                  ? "bg-indigo text-white"
                  : "bg-white text-gray-500 hover:bg-gray-50"
              }`}
            >
              <Network size={15} /> OBS diagram
            </button>
          </div>
          {view === "table" && (
            <div className="flex h-9 overflow-hidden rounded-btn border border-bordergray">
              <button
                onClick={() => setRaci(false)}
                className={`flex h-full items-center whitespace-nowrap px-3 text-sm ${
                  !raci ? "bg-indigo text-white" : "bg-white text-gray-500 hover:bg-gray-50"
                }`}
              >
                Tier
              </button>
              <button
                onClick={() => setRaci(true)}
                className={`flex h-full items-center whitespace-nowrap px-3 text-sm ${
                  raci ? "bg-indigo text-white" : "bg-white text-gray-500 hover:bg-gray-50"
                }`}
              >
                RACI
              </button>
            </div>
          )}
          {view === "table" && (
            <button
              onClick={openCreateDrawer}
              className="flex h-9 items-center gap-1.5 rounded-btn bg-indigo px-3 text-sm font-semibold text-white hover:bg-indigo/90"
            >
              <Plus size={16} /> Add workstream
            </button>
          )}
        </div>
      </div>

      <div className="scroll-thin flex-1 overflow-auto p-6">
        {view === "table" ? (
          <>
            <LegendBar orgs={orgs} />
            <div className="overflow-x-auto rounded-card border border-bordergray bg-white shadow-card">
              {raci ? (
                <RaciFlatTable roles={roles} orgs={orgs} onEdit={openEditDrawer} />
              ) : (
                <OrgGroupedTable roles={roles} orgs={orgs} onEdit={openEditDrawer} />
              )}
            </div>
          </>
        ) : (
          <div className="mx-auto max-w-[1200px] overflow-hidden rounded-card border border-bordergray shadow-card">
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

/** groupBy = "org": one column per contractual tier present in the data. */
function OrgGroupedTable({
  roles,
  orgs,
  onEdit,
}: {
  roles: RoleResponsibility[];
  orgs: Organization[];
  onEdit: (role: RoleResponsibility) => void;
}) {
  const tiers = [...new Set(orgs.map((o) => o.tier))].sort((a, b) => a - b);
  const th = "px-4 py-2.5 align-top min-w-[200px]";
  const td = "px-4 py-3 align-top";

  return (
    <table className="w-full text-left text-sm">
      <thead className="bg-gray-50 text-[11px] tracking-wide text-gray-500">
        <tr>
          <th className={`${th} min-w-[240px]`}>Workstream</th>
          {tiers.map((t) => {
            const meta = tierMeta(t);
            return (
              <th key={t} className={th} style={{ borderTop: `2px solid ${meta.color}` }}>
                <div className="font-bold">{meta.label}</div>
                <div className="text-[11px] font-medium normal-case text-gray-400">{meta.sublabel}</div>
              </th>
            );
          })}
        </tr>
      </thead>
      <tbody>
        {roles.map((r) => {
          const entries = raciEntries(r);
          return (
            <tr key={r.id} className="border-t border-bordergray">
              <td className={td}>
                <WorkstreamCell role={r} onEdit={onEdit} />
              </td>
              {tiers.map((t) => {
                const atTier = entries.filter((e) => tierOf(orgs, e.party.organization) === t);
                return (
                  <td key={t} className={td}>
                    {atTier.length === 0 ? (
                      <span className="text-gray-300">—</span>
                    ) : (
                      <div className="flex flex-col gap-3">
                        {atTier.map((e, i) => (
                          <PersonCard key={i} party={e.party} orgs={orgs} raci={e.raci} />
                        ))}
                      </div>
                    )}
                  </td>
                );
              })}
            </tr>
          );
        })}
        {roles.length === 0 && (
          <tr>
            <td colSpan={1 + tiers.length} className="px-4 py-8 text-center text-gray-300">
              No workstreams yet. Add the first one.
            </td>
          </tr>
        )}
      </tbody>
    </table>
  );
}

/** groupBy = "role": who is Accountable / Responsible / Consulted / Informed. */
function RaciFlatTable({
  roles,
  orgs,
  onEdit,
}: {
  roles: RoleResponsibility[];
  orgs: Organization[];
  onEdit: (role: RoleResponsibility) => void;
}) {
  const th = "px-4 py-2.5 align-top min-w-[200px]";
  const td = "px-4 py-3 align-top";

  return (
    <table className="w-full text-left text-sm">
      <thead className="bg-gray-50 text-[11px] tracking-wide text-gray-500">
        <tr>
          <th className={`${th} min-w-[240px]`}>Workstream</th>
          <th className={th}>Accountable</th>
          <th className={th}>
            Responsible
            <div className="text-[10px] font-medium normal-case text-gray-400">one per side</div>
          </th>
          <th className={th}>Consulted</th>
          <th className={th}>Informed</th>
        </tr>
      </thead>
      <tbody>
        {roles.map((r) => {
          const informed = [...r.informedCustomer, ...r.informedContractor];
          return (
            <tr key={r.id} className="border-t border-bordergray">
              <td className={td}>
                <WorkstreamCell role={r} onEdit={onEdit} />
              </td>
              <td className={td}>
                <PersonCard party={r.accountable} orgs={orgs} />
              </td>
              <td className={td}>
                <div className="flex flex-col gap-3">
                  <div>
                    <div className="mb-1 text-[10px] font-bold uppercase tracking-wide text-gray-400">
                      Customer side
                    </div>
                    {r.responsibleCustomer ? (
                      <PersonCard party={r.responsibleCustomer} orgs={orgs} />
                    ) : (
                      <span className="text-gray-300">—</span>
                    )}
                  </div>
                  <div>
                    <div className="mb-1 text-[10px] font-bold uppercase tracking-wide text-gray-400">
                      Contractor side
                    </div>
                    {r.responsibleContractor ? (
                      <PersonCard party={r.responsibleContractor} orgs={orgs} />
                    ) : (
                      <span className="text-gray-300">—</span>
                    )}
                  </div>
                </div>
              </td>
              <td className={td}>
                {r.consulted.length === 0 ? (
                  <span className="text-gray-300">—</span>
                ) : (
                  <div className="flex flex-col gap-3">
                    {r.consulted.map((p, i) => (
                      <PersonCard key={i} party={p} orgs={orgs} />
                    ))}
                  </div>
                )}
              </td>
              <td className={td}>
                {informed.length === 0 ? (
                  <span className="text-gray-300">—</span>
                ) : (
                  <div className="flex flex-col gap-3">
                    {informed.map((p, i) => (
                      <PersonCard key={i} party={p} orgs={orgs} />
                    ))}
                  </div>
                )}
              </td>
            </tr>
          );
        })}
        {roles.length === 0 && (
          <tr>
            <td colSpan={5} className="px-4 py-8 text-center text-gray-300">
              No workstreams yet. Add the first one.
            </td>
          </tr>
        )}
      </tbody>
    </table>
  );
}
