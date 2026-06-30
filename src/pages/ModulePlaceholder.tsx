import type { LucideIcon } from "lucide-react";

interface Props {
  moduleName: string;
  icon: LucideIcon;
  isCorrespondence?: boolean;
}

const KPI_LABELS = ["Total", "Open", "My Items", "Overdue"];

const CORRESPONDENCE_TYPES = [
  "RFI",
  "TQ",
  "Meeting Minutes",
  "Variation Request",
  "Site Instruction",
  "Extension of Time",
  "Inspection Request",
];

export default function ModulePlaceholder({ moduleName, icon: Icon, isCorrespondence }: Props) {
  return (
    <div className="flex h-full flex-col">
      {/* Module header */}
      <div className="flex items-center gap-3 border-b border-bordergray bg-white px-6 py-4">
        <div
          className="flex h-9 w-9 flex-shrink-0 items-center justify-center rounded-lg"
          style={{ background: "#e7e6fa" }}
        >
          <Icon size={20} style={{ color: "#0d08d2" }} />
        </div>
        <div>
          <h1
            className="text-lg font-bold leading-tight text-ink"
            style={{ fontFamily: "'Barlow Condensed', sans-serif" }}
          >
            {moduleName}
          </h1>
          <p className="text-xs text-gray-400">Module overview</p>
        </div>
      </div>

      {/* KPI strip */}
      <div className="border-b border-bordergray bg-white px-6 py-5">
        {isCorrespondence && (
          <div className="mb-4">
            <p className="mb-3 text-xs leading-relaxed text-gray-500">
              Correspondence is a cross-cutting view of all communication threads across modules, filtered by type.
            </p>
            <div className="flex flex-wrap gap-2">
              {CORRESPONDENCE_TYPES.map((type) => (
                <span
                  key={type}
                  className="rounded-full border border-bordergray bg-fog px-3 py-1 text-xs font-medium text-gray-500"
                >
                  {type}
                </span>
              ))}
            </div>
          </div>
        )}
        <div className="grid grid-cols-4 gap-4">
          {KPI_LABELS.map((label) => (
            <div
              key={label}
              className="rounded-card border border-bordergray bg-fog p-4 shadow-card"
            >
              <p className="mb-1 text-[11px] font-medium uppercase tracking-wide text-gray-400">
                {label}
              </p>
              <p
                className="text-2xl font-bold"
                style={{ fontFamily: "'Barlow Condensed', sans-serif", color: "#0d08d2" }}
              >
                —
              </p>
            </div>
          ))}
        </div>
      </div>

      {/* Empty state */}
      <div className="flex flex-1 items-center justify-center bg-fog">
        <div className="text-center">
          <div
            className="mx-auto mb-5 flex h-16 w-16 items-center justify-center rounded-full"
            style={{ background: "#e7e6fa" }}
          >
            <Icon size={30} style={{ color: "#0d08d2" }} />
          </div>
          <h2
            className="mb-2 text-xl font-bold"
            style={{ fontFamily: "'Barlow Condensed', sans-serif", color: "#0d08d2" }}
          >
            {moduleName} module — coming soon
          </h2>
          <p
            className="text-sm text-gray-400"
            style={{ fontFamily: "'Montserrat', sans-serif" }}
          >
            Same layout pattern as Risk: KPIs on top, filterable list below.
          </p>
        </div>
      </div>
    </div>
  );
}
