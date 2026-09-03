import { Users } from "lucide-react";
import type { Party, RoleResponsibility } from "../../types";

interface Props {
  roles: RoleResponsibility[];
  selectedIds: string[];
}

interface Entry {
  workstream: string;
  slot: string;
  party: Party;
}

function Column({ title, entries }: { title: string; entries: Entry[] }) {
  return (
    <div className="flex-1">
      <div className="mb-2 text-[11px] font-semibold uppercase tracking-wide text-gray-400">
        {title}
      </div>
      {entries.length === 0 && (
        <div className="text-[11px] text-gray-300">None</div>
      )}
      <div className="flex flex-col gap-2">
        {entries.map((e, i) => (
          <div
            key={i}
            className="rounded-r-md border-l-2 border-indigo/30 bg-gray-50 py-1.5 pl-3 pr-2"
          >
            <div className="text-[12px] font-semibold text-gray-800">
              {e.party.name}{" "}
              <span className="font-normal text-gray-400">
                ({e.party.organization})
              </span>
            </div>
            <div className="text-[11px] text-gray-500">
              › {e.workstream}: {e.party.role} — {e.slot}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

export default function InvolvedPartiesCard({ roles, selectedIds }: Props) {
  const involved = roles.filter((r) => selectedIds.includes(r.id));

  const responsible: Entry[] = [];
  const informed: Entry[] = [];

  for (const r of involved) {
    if (r.responsibleCustomer) {
      responsible.push({ workstream: r.workstream, slot: "Customer", party: r.responsibleCustomer });
    }
    if (r.responsibleContractor) {
      responsible.push({ workstream: r.workstream, slot: "Contractor", party: r.responsibleContractor });
    }
    for (const party of r.informedCustomer) {
      informed.push({ workstream: r.workstream, slot: "Customer", party });
    }
    for (const party of r.informedContractor) {
      informed.push({ workstream: r.workstream, slot: "Contractor", party });
    }
  }

  return (
    <div className="rounded-card border border-bordergray bg-white p-4 shadow-card">
      <div className="mb-3 flex items-center gap-2 text-[13px] font-semibold text-gray-700">
        <Users size={15} /> Involved parties
      </div>
      {involved.length === 0 ? (
        <p className="text-xs text-gray-400">
          Select one or more workstreams to see responsible and informed parties.
        </p>
      ) : (
        <div className="flex gap-6">
          <Column title="Responsible (R)" entries={responsible} />
          <Column title="Informed (I)" entries={informed} />
        </div>
      )}
    </div>
  );
}
