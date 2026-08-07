import { DOCUMENT_TYPES, type DocumentItem, type DocumentType, type Organization, type RoleResponsibility } from "../../types";
import { TIER_COLORS, DEFAULT_TIER_COLOR } from "../../lib/tiers";
import { pickResponsible } from "../../lib/format";

const MUTED = "#8a8ca6";
const SECONDARY = "#595b78";
const INDIGO = "#0d08d2";
const INFO = "#00acff";
const GREEN = "#28a745";
const ORANGE = "#ff8b00";
const GRAY = "#c7c9d9";

/** Zero counts render as a flat zero-height bar — no visual floor. */
function barHeight(count: number, max: number): number {
  return count === 0 ? 0 : Math.max(6, (count / max) * 100);
}

function Ring({ pct, color }: { pct: number; color: string }) {
  const size = 58;
  const sw = 6;
  const r = (size - sw) / 2;
  const c = 2 * Math.PI * r;
  return (
    <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`}>
      <circle cx={size / 2} cy={size / 2} r={r} fill="none" stroke="#f0f0f8" strokeWidth={sw} />
      <circle
        cx={size / 2}
        cy={size / 2}
        r={r}
        fill="none"
        stroke={color}
        strokeWidth={sw}
        strokeLinecap="round"
        strokeDasharray={c}
        strokeDashoffset={c * (1 - pct / 100)}
        transform={`rotate(-90 ${size / 2} ${size / 2})`}
      />
      <text x="50%" y="50%" dy="0.35em" textAnchor="middle" fontSize={13} fontWeight={700} fill={color}>
        {pct}%
      </text>
    </svg>
  );
}

function Label({ children }: { children: React.ReactNode }) {
  return (
    <span className="text-[11px] font-semibold uppercase tracking-wider" style={{ color: MUTED }}>
      {children}
    </span>
  );
}

/** A clickable, cross-filtering bar chart — shared by Type, Workstream and To Do. */
function BarChart({
  label,
  headerRight,
  bars,
  selected,
  onSelect,
  barColor,
  badgeStyle,
}: {
  label: string;
  headerRight?: React.ReactNode;
  bars: { key: string; label: string; count: number; color?: string }[];
  selected: string | null;
  onSelect: (key: string | null) => void;
  barColor?: string;
  badgeStyle?: "indigo" | "gray";
}) {
  const max = Math.max(...bars.map((b) => b.count), 1);
  return (
    <div
      className="flex min-w-0 flex-1 flex-col rounded-card border border-bordergray bg-white px-6 py-4 shadow-card"
      onClick={() => onSelect(null)}
    >
      <div className="flex items-baseline justify-between">
        <Label>{label}</Label>
        {selected ? (
          <span className="text-[11px] font-medium" style={{ color: INDIGO }}>
            Click outside a bar to clear
          </span>
        ) : (
          headerRight
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
                  <span
                    className="rounded-full px-2 py-px text-[12px] font-bold"
                    style={
                      badgeStyle === "gray"
                        ? { color: "#15162b", background: "#f0f0f5" }
                        : { color: INDIGO, background: "#e7e6fa" }
                    }
                  >
                    {b.count}
                  </span>
                  <div
                    className="w-full max-w-[40px] rounded-t-md"
                    style={{ background: b.color ?? barColor ?? INDIGO, height: `${barHeight(b.count, max)}px` }}
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

export default function DocumentSummaryDashboard({
  items,
  roles,
  orgs,
  selectedType,
  onSelectType,
  selectedWorkstream,
  onSelectWorkstream,
  selectedTodo,
  onSelectTodo,
}: {
  items: DocumentItem[];
  roles: RoleResponsibility[];
  orgs: Organization[];
  selectedType: DocumentType | null;
  onSelectType: (type: DocumentType | null) => void;
  selectedWorkstream: string | null;
  onSelectWorkstream: (label: string | null) => void;
  selectedTodo: string | null;
  onSelectTodo: (key: string | null) => void;
}) {
  const total = items.length;
  const completed = items.filter((i) => i.status === "completed").length;
  const obsolete = items.filter((i) => i.status === "obsolete").length;
  const pending = Math.max(0, total - completed - obsolete);
  const completedPct = total ? Math.round((completed / total) * 100) : 0;

  const typeBars = DOCUMENT_TYPES.map((t) => ({
    key: t,
    label: t,
    count: items.filter((i) => i.type === t).length,
  }));

  const workstreamBars: { key: string; label: string; count: number }[] = [];
  const seen = new Set<string>();
  roles.forEach((role) => {
    if (seen.has(role.workstream)) return;
    seen.add(role.workstream);
    workstreamBars.push({
      key: role.workstream,
      label: role.workstream,
      count: items.filter((i) => i.workstreamIds.includes(role.id)).length,
    });
  });

  // Whoever currently holds the ball: "sent_accountable" -> that workstream's
  // Accountable org, "sent_responsible" -> that workstream's Responsible org.
  const orgsByTier = [...orgs].sort((a, b) => a.tier - b.tier);
  const todoBars = orgsByTier.map((org) => ({
    key: org.name,
    label: org.name,
    count: items.filter((i) => {
      const itemRoles = roles.filter((role) => i.workstreamIds.includes(role.id));
      if (i.status === "sent_accountable") return itemRoles.some((role) => role.accountable.organization === org.name);
      if (i.status === "sent_responsible") return itemRoles.some((role) => pickResponsible(role)?.organization === org.name);
      return false;
    }).length,
    color: TIER_COLORS[org.tier] ?? DEFAULT_TIER_COLOR,
  }));

  const segment = (count: number) => (total ? `${(count / total) * 100}%` : "0%");

  return (
    <div className="mb-4 flex items-stretch gap-4">
      {/* Overview — combines the old Total / Completed / Pending cards */}
      <div className="flex min-w-[260px] flex-col justify-between rounded-card border border-bordergray bg-white px-6 py-5 shadow-card">
        <div className="flex items-start justify-between">
          <div>
            <Label>Documents</Label>
            <div className="mt-1 flex items-baseline gap-2">
              <span className="text-[40px] font-bold leading-none text-ink">{total}</span>
              <span className="text-[13px] font-semibold" style={{ color: GREEN }}>
                {completedPct}% complete
              </span>
            </div>
          </div>
          <Ring pct={completedPct} color={GREEN} />
        </div>
        <div className="mt-3">
          <div className="flex h-2.5 gap-0.5 overflow-hidden rounded-full bg-gray-100">
            <div style={{ width: segment(completed), background: GREEN }} />
            <div style={{ width: segment(pending), background: ORANGE }} />
            <div style={{ width: segment(obsolete), background: GRAY }} />
          </div>
          <div className="mt-2.5 flex flex-wrap gap-x-4 gap-y-1">
            <span className="flex items-center gap-1.5 text-[12px]" style={{ color: SECONDARY }}>
              <span className="h-2 w-2 rounded-sm" style={{ background: GREEN }} />
              {completed} completed
            </span>
            <span className="flex items-center gap-1.5 text-[12px]" style={{ color: SECONDARY }}>
              <span className="h-2 w-2 rounded-sm" style={{ background: ORANGE }} />
              {pending} pending
            </span>
            {obsolete > 0 && (
              <span className="flex items-center gap-1.5 text-[12px]" style={{ color: MUTED }}>
                <span className="h-2 w-2 rounded-sm" style={{ background: GRAY }} />
                {obsolete} obsolete
              </span>
            )}
          </div>
        </div>
      </div>

      {/* Type */}
      <BarChart
        label="Type"
        bars={typeBars}
        selected={selectedType}
        onSelect={(k) => onSelectType(k as DocumentType | null)}
        barColor={INFO}
      />

      {/* Workstream */}
      <BarChart
        label="Workstream"
        bars={workstreamBars}
        selected={selectedWorkstream}
        onSelect={onSelectWorkstream}
        barColor={INDIGO}
      />

      {/* To Do by stakeholder */}
      <BarChart
        label="To Do by stakeholder"
        headerRight={
          <span className="text-[12px] font-semibold" style={{ color: MUTED }}>
            {total} total
          </span>
        }
        bars={todoBars}
        selected={selectedTodo}
        onSelect={onSelectTodo}
        badgeStyle="gray"
      />
    </div>
  );
}
