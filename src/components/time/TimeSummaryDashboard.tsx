import type { RoleResponsibility, TimeEntry, TimeCategory } from "../../types";
import { TIME_CATEGORIES } from "../../types";

const MUTED = "#8a8ca6";
const SECONDARY = "#595b78";
const INDIGO = "#0d08d2";
const INFO = "#00acff";
const GREEN = "#28a745";

function barHeight(v: number, max: number): number {
  return v === 0 ? 0 : Math.max(6, (v / max) * 100);
}

function Label({ children }: { children: React.ReactNode }) {
  return (
    <span className="text-[11px] font-semibold uppercase tracking-wider" style={{ color: MUTED }}>
      {children}
    </span>
  );
}

/** Round to at most 1 decimal, drop trailing .0 */
function fmtHrs(h: number): string {
  return (Math.round(h * 10) / 10).toString();
}

/** A clickable, cross-filtering bar chart — shared by Workstream and Category. */
function BarChart({
  label,
  bars,
  selected,
  onSelect,
  barColor,
}: {
  label: string;
  bars: { key: string; label: string; value: number }[];
  selected: string | null;
  onSelect: (key: string | null) => void;
  barColor: string;
}) {
  const max = Math.max(...bars.map((b) => b.value), 1);
  return (
    <div
      className="flex min-w-0 flex-1 flex-col rounded-card border border-bordergray bg-white px-6 py-4 shadow-card"
      onClick={() => onSelect(null)}
    >
      <div className="flex items-baseline justify-between">
        <Label>{label}</Label>
        {selected && (
          <span className="text-[11px] font-medium" style={{ color: INDIGO }}>
            Click outside a bar to clear
          </span>
        )}
      </div>
      {bars.length === 0 ? (
        <p className="mt-4 text-sm text-gray-400">No data.</p>
      ) : (
        <>
          <div className="mt-2 flex flex-1 items-end justify-between gap-2 border-b border-gray-100 pt-2">
            {bars.map((b) => {
              const isSelected = selected === b.key;
              const dimmed = selected !== null && !isSelected;
              return (
                <div
                  key={b.key}
                  className="flex min-w-0 flex-1 cursor-pointer flex-col items-center gap-2"
                  style={{ opacity: dimmed ? 0.35 : 1 }}
                  onClick={(e) => {
                    e.stopPropagation();
                    onSelect(isSelected ? null : b.key);
                  }}
                >
                  <span className="text-[11px] font-bold tabular-nums" style={{ color: isSelected ? INDIGO : SECONDARY }}>
                    {fmtHrs(b.value)}
                  </span>
                  <div
                    className="w-full max-w-[40px] rounded-t-md"
                    style={{ background: barColor, height: `${barHeight(b.value, max)}px` }}
                  />
                </div>
              );
            })}
          </div>
          <div className="flex justify-between gap-2 pt-2">
            {bars.map((b) => (
              <span
                key={b.key}
                className="min-w-0 flex-1 text-center text-[10.5px] leading-tight"
                style={{ color: selected === b.key ? INDIGO : SECONDARY }}
              >
                {b.label}
              </span>
            ))}
          </div>
        </>
      )}
    </div>
  );
}

export default function TimeSummaryDashboard({
  entries,
  roles,
  selectedWorkstream,
  onSelectWorkstream,
  selectedCategory,
  onSelectCategory,
}: {
  entries: TimeEntry[];
  roles: RoleResponsibility[];
  selectedWorkstream: string | null;
  onSelectWorkstream: (v: string | null) => void;
  selectedCategory: string | null;
  onSelectCategory: (v: string | null) => void;
}) {
  const totalHours = entries.reduce((s, e) => s + (e.hours || 0), 0);
  const billableHours = entries.filter((e) => e.billable).reduce((s, e) => s + (e.hours || 0), 0);
  const billablePct = totalHours ? Math.round((billableHours / totalHours) * 100) : 0;
  const approved = entries.filter((e) => e.status === "approved").length;

  const weekAgo = Date.now() - 7 * 86400000;
  const weekHours = entries
    .filter((e) => (e.date?.toMillis() ?? 0) >= weekAgo)
    .reduce((s, e) => s + (e.hours || 0), 0);

  const wsName = (id: string) => roles.find((r) => r.id === id)?.workstream ?? "Unassigned";

  // Hours by workstream
  const wsMap = new Map<string, number>();
  entries.forEach((e) => {
    const name = e.workstreamId ? wsName(e.workstreamId) : "Unassigned";
    wsMap.set(name, (wsMap.get(name) ?? 0) + (e.hours || 0));
  });
  const workstreamBars = [...new Set(roles.map((r) => r.workstream))].map((w) => ({
    key: w,
    label: w,
    value: wsMap.get(w) ?? 0,
  }));

  // Hours by category
  const catMap = new Map<string, number>();
  entries.forEach((e) => catMap.set(e.category, (catMap.get(e.category) ?? 0) + (e.hours || 0)));
  const categoryBars = (TIME_CATEGORIES as TimeCategory[]).map((c) => ({
    key: c,
    label: c.split(" ")[0],
    value: catMap.get(c) ?? 0,
  }));

  return (
    <div className="mb-4 flex items-stretch gap-4">
      {/* Overview */}
      <div className="flex min-w-[240px] flex-col justify-between rounded-card border border-bordergray bg-white px-6 py-5 shadow-card">
        <div>
          <Label>Time logged</Label>
          <div className="mt-1 flex items-baseline gap-2">
            <span className="text-[40px] font-bold leading-none text-ink">{fmtHrs(totalHours)}</span>
            <span className="text-[13px] font-semibold text-gray-400">hrs</span>
          </div>
          <p className="mt-1 text-[12px]" style={{ color: SECONDARY }}>
            {entries.length} entr{entries.length === 1 ? "y" : "ies"} · {approved} approved
          </p>
        </div>
        <div className="mt-3 flex flex-wrap gap-x-4 gap-y-1">
          <span className="flex items-center gap-1.5 text-[12px]" style={{ color: SECONDARY }}>
            <span className="h-2 w-2 rounded-sm" style={{ background: GREEN }} />
            {billablePct}% billable
          </span>
          <span className="flex items-center gap-1.5 text-[12px]" style={{ color: SECONDARY }}>
            <span className="h-2 w-2 rounded-sm" style={{ background: INFO }} />
            {fmtHrs(weekHours)} hrs this week
          </span>
        </div>
      </div>

      <BarChart
        label="Hours by workstream"
        bars={workstreamBars}
        selected={selectedWorkstream}
        onSelect={onSelectWorkstream}
        barColor={INDIGO}
      />
      <BarChart
        label="Hours by category"
        bars={categoryBars}
        selected={selectedCategory}
        onSelect={onSelectCategory}
        barColor={INFO}
      />
    </div>
  );
}
