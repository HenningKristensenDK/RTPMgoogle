import { useLocation, useNavigate } from "react-router-dom";
import type { CorrespondenceItem, Organization, RoleResponsibility } from "../../types";
import { PRIORITY_META, formatDate, pickResponsible } from "../../lib/format";
import { tierColor } from "../../lib/tiers";
import PersonAvatar from "../common/PersonAvatar";

interface Props {
  item: CorrespondenceItem;
  roles: RoleResponsibility[];
  orgs: Organization[];
}

export default function CorrespondenceCard({ item, roles, orgs }: Props) {
  const navigate = useNavigate();
  const location = useLocation();
  const responsible = roles
    .filter((r) => item.workstreamIds.includes(r.id))
    .map(pickResponsible)
    .find((p) => p !== null);
  const workstreams = [
    ...new Set(
      roles
        .filter((r) => item.workstreamIds.includes(r.id))
        .map((r) => r.workstream)
    ),
  ];
  const prio = PRIORITY_META[item.priority];

  return (
    <button
      onClick={() => navigate(`/correspondence/${item.id}`, { state: { background: location } })}
      className="flex w-full flex-col gap-2 rounded-card border border-bordergray bg-white p-3 text-left shadow-card transition-shadow hover:shadow-panel"
    >
      <div className="flex items-center justify-between gap-2">
        <span className="font-mono text-[11px] font-semibold text-gray-500">
          {item.itemId}
        </span>
        <span className="rounded-full bg-indigo/10 px-2 py-0.5 text-[10px] font-medium text-indigo">
          {item.type}
        </span>
      </div>

      <div className="text-sm font-semibold leading-snug text-ink">
        {item.title}
      </div>

      <div className="flex flex-wrap items-center justify-between gap-1">
        <div className="flex flex-wrap gap-1">
          {workstreams.map((ws) => (
            <span
              key={ws}
              className="rounded-full bg-gray-100 px-2 py-0.5 text-[10px] font-medium text-gray-500"
            >
              {ws}
            </span>
          ))}
        </div>
        <span className="flex items-center gap-1 text-[11px] font-medium" style={{ color: prio.text }}>
          <span className="h-2 w-2 rounded-full" style={{ background: prio.dot }} />
          {prio.label}
        </span>
      </div>

      <div className="mt-1 flex items-center justify-between">
        <span className="text-[11px] text-gray-400">
          Due {formatDate(item.dueDate)}
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
