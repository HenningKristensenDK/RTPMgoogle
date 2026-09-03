import { useLocation, useNavigate } from "react-router-dom";
import type { Organization, Risk, RoleResponsibility } from "../../types";
import { PRIORITY_META, formatDate, pickResponsible } from "../../lib/format";
import { tierColor } from "../../lib/tiers";
import PersonAvatar from "../common/PersonAvatar";

interface Props {
  risk: Risk;
  roles: RoleResponsibility[];
  orgs: Organization[];
}

export default function RiskCard({ risk, roles, orgs }: Props) {
  const navigate = useNavigate();
  const location = useLocation();
  const responsible = roles
    .filter((r) => risk.workstreamIds.includes(r.id))
    .map(pickResponsible)
    .find((p) => p !== null);
  const workstreams = [
    ...new Set(
      roles
        .filter((r) => risk.workstreamIds.includes(r.id))
        .map((r) => r.workstream)
    ),
  ];
  const prio = PRIORITY_META[risk.priority];

  return (
    <button
      onClick={() => navigate(`/risks/${risk.id}`, { state: { background: location } })}
      className="flex w-full flex-col gap-2 rounded-card border border-bordergray bg-white p-3 text-left shadow-card transition-shadow hover:shadow-panel"
    >
      <div className="flex items-center justify-between">
        <span className="font-mono text-[11px] font-semibold text-gray-500">
          {risk.riskId}
        </span>
        <span
          className="flex items-center gap-1 text-[11px] font-medium"
          style={{ color: prio.text }}
        >
          <span
            className="h-2 w-2 rounded-full"
            style={{ background: prio.dot }}
          />
          {prio.label}
        </span>
      </div>

      <div className="text-sm font-semibold leading-snug text-ink">
        {risk.title}
      </div>

      <div className="flex flex-wrap gap-1">
        {workstreams.map((ws) => (
          <span
            key={ws}
            className="rounded-full bg-indigo/10 px-2 py-0.5 text-[10px] font-medium text-indigo"
          >
            {ws}
          </span>
        ))}
      </div>

      <div className="mt-1 flex items-center justify-between">
        <span className="text-[11px] text-gray-400">
          Due {formatDate(risk.dueDate)}
        </span>
        {responsible && (
          <PersonAvatar
            name={responsible.name}
            ringColor={tierColor(orgs, responsible.organization)}
            size={24}
          />
        )}
      </div>
    </button>
  );
}
