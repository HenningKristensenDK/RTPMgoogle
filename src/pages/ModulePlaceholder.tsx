import type { LucideIcon } from "lucide-react";

interface Props {
  moduleName: string;
  icon: LucideIcon;
}

const KPI_LABELS = ["Total", "Open", "My items", "Overdue"];

export default function ModulePlaceholder({ moduleName, icon: Icon }: Props) {
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
          <h1 className="text-base font-semibold leading-tight text-ink">
            {moduleName}
          </h1>
          <p className="text-xs" style={{ color: "#8a8ca6" }}>Module overview</p>
        </div>
      </div>

      {/* KPI strip */}
      <div className="border-b border-bordergray bg-white px-6 py-5">
        <div className="grid grid-cols-4 gap-4">
          {KPI_LABELS.map((label) => (
            <div
              key={label}
              className="rounded-card border border-bordergray bg-fog p-4 shadow-card"
            >
              <p className="mb-1 text-[11px] font-medium uppercase tracking-wide" style={{ color: "#8a8ca6" }}>
                {label}
              </p>
              <p className="text-2xl font-bold tabular-nums" style={{ color: "#0d08d2" }}>
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
          <h2 className="mb-2 text-lg font-semibold" style={{ color: "#0d08d2" }}>
            {moduleName} — coming soon
          </h2>
          <p className="text-sm" style={{ color: "#8a8ca6" }}>
            Same layout pattern as Risk: KPIs on top, filterable list below.
          </p>
        </div>
      </div>
    </div>
  );
}
