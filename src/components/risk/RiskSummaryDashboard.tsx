import type { Risk, RoleResponsibility } from "../../types";
import { pickResponsible } from "../../lib/format";

const MUTED = "#8a8ca6";
const SECONDARY = "#595b78";
const INDIGO = "#0d08d2";
const GREEN = "#28a745";
const ORANGE = "#ff8b00";

function Ring({ pct, color }: { pct: number; color: string }) {
  const size = 56;
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
      <text
        x="50%"
        y="50%"
        dy="0.35em"
        textAnchor="middle"
        fontSize={13}
        fontWeight={700}
        fill={color}
      >
        {pct}%
      </text>
    </svg>
  );
}

function Label({ children }: { children: React.ReactNode }) {
  return (
    <span
      className="text-[11px] font-semibold uppercase tracking-wider"
      style={{ color: MUTED }}
    >
      {children}
    </span>
  );
}

type TodoKey = "responsible" | "informed";

export default function RiskSummaryDashboard({
  risks,
  roles,
  selectedWorkstream,
  onSelectWorkstream,
  selectedTodo,
  onSelectTodo,
}: {
  risks: Risk[];
  roles: RoleResponsibility[];
  selectedWorkstream: string | null;
  onSelectWorkstream: (label: string | null) => void;
  selectedTodo: TodoKey | null;
  onSelectTodo: (key: TodoKey | null) => void;
}) {
  const total = risks.length;
  const completed = risks.filter((r) => r.status === "resolved").length;
  const pending = total - completed;
  const completedPct = total ? Math.round((completed / total) * 100) : 0;
  const pendingPct = total ? 100 - completedPct : 0;

  const workstream: { label: string; count: number }[] = [];
  const seen = new Set<string>();
  roles.forEach((role) => {
    if (seen.has(role.workstream)) return;
    seen.add(role.workstream);
    const count = risks.filter((r) => r.workstreamIds.includes(role.id)).length;
    workstream.push({ label: role.workstream, count });
  });
  const maxWs = Math.max(...workstream.map((w) => w.count), 1);

  const responsibleCount = risks.filter((r) =>
    roles
      .filter((role) => r.workstreamIds.includes(role.id))
      .some((role) => pickResponsible(role) !== null)
  ).length;
  const informedCount = risks.filter((r) =>
    roles
      .filter((role) => r.workstreamIds.includes(role.id))
      .some((role) => role.informedCustomer.length > 0 || role.informedContractor.length > 0)
  ).length;
  const todo: { key: TodoKey; label: string; count: number; color: string }[] = [
    { key: "responsible", label: "Responsible", count: responsibleCount, color: INDIGO },
    { key: "informed", label: "Informed", count: informedCount, color: "#a8a29e" },
  ];
  const maxTodo = Math.max(...todo.map((t) => t.count), 1);

  return (
    <div className="mb-4 flex items-stretch gap-4">
      {/* Total */}
      <div className="flex min-w-[210px] flex-col justify-between rounded-card border border-bordergray bg-white px-6 py-5 shadow-card">
        <Label>Total risks</Label>
        <div className="my-2 flex items-baseline gap-2">
          <span className="text-[40px] font-bold leading-none text-ink">{total}</span>
          <span className="text-[13px] font-semibold" style={{ color: GREEN }}>
            {completedPct}% complete
          </span>
        </div>
        <div>
          <div className="flex h-2.5 gap-0.5 overflow-hidden rounded-full bg-gray-100">
            <div style={{ width: `${completedPct}%`, background: GREEN }} />
            <div style={{ width: `${pendingPct}%`, background: ORANGE }} />
          </div>
          <div className="mt-2.5 flex gap-4">
            <span className="flex items-center gap-1.5 text-[12px]" style={{ color: SECONDARY }}>
              <span className="h-2 w-2 rounded-sm" style={{ background: GREEN }} />
              {completed} done
            </span>
            <span className="flex items-center gap-1.5 text-[12px]" style={{ color: SECONDARY }}>
              <span className="h-2 w-2 rounded-sm" style={{ background: ORANGE }} />
              {pending} pending
            </span>
          </div>
        </div>
      </div>

      {/* Completed / Pending tiles */}
      <div className="flex min-w-[240px] flex-col gap-4">
        <div className="flex flex-1 items-center justify-between rounded-card border border-bordergray bg-white px-5 py-4 shadow-card">
          <div className="flex flex-col gap-1">
            <Label>Completed</Label>
            <span className="text-[26px] font-bold leading-none text-ink">{completed}</span>
          </div>
          <Ring pct={completedPct} color={GREEN} />
        </div>
        <div className="flex flex-1 items-center justify-between rounded-card border border-bordergray bg-white px-5 py-4 shadow-card">
          <div className="flex flex-col gap-1">
            <Label>Pending</Label>
            <span className="text-[26px] font-bold leading-none text-ink">{pending}</span>
          </div>
          <Ring pct={pendingPct} color={ORANGE} />
        </div>
      </div>

      {/* Workstream */}
      <div
        className="flex min-w-0 flex-1 flex-col rounded-card border border-bordergray bg-white px-6 py-4 shadow-card"
        onClick={() => onSelectWorkstream(null)}
      >
        <div className="flex items-baseline justify-between">
          <Label>Workstream</Label>
          {selectedWorkstream && (
            <span className="text-[11px] font-medium" style={{ color: INDIGO }}>
              Click outside a bar to clear
            </span>
          )}
        </div>
        {workstream.length === 0 ? (
          <p className="mt-4 text-sm text-gray-400">No workstreams.</p>
        ) : (
          <>
            <div className="mt-2 flex flex-1 items-end justify-between gap-2 border-b border-gray-100 pt-2">
              {workstream.map((w) => {
                const isSelected = selectedWorkstream === w.label;
                const dimmed = selectedWorkstream !== null && !isSelected;
                return (
                  <div
                    key={w.label}
                    className="flex min-w-0 flex-1 cursor-pointer flex-col items-center gap-2"
                    style={{ opacity: dimmed ? 0.35 : 1 }}
                    onClick={(e) => {
                      e.stopPropagation();
                      onSelectWorkstream(isSelected ? null : w.label);
                    }}
                  >
                    <span
                      className="rounded-full px-2 py-px text-[12px] font-bold"
                      style={{ color: INDIGO, background: "#e7e6fa" }}
                    >
                      {w.count}
                    </span>
                    <div
                      className="w-full max-w-[40px] rounded-t-md"
                      style={{
                        background: INDIGO,
                        height: `${28 + (w.count / maxWs) * 88}px`,
                      }}
                    />
                  </div>
                );
              })}
            </div>
            <div className="flex justify-between gap-2 pt-2">
              {workstream.map((w) => (
                <span
                  key={w.label}
                  className="min-w-0 flex-1 text-center text-[11px] leading-tight"
                  style={{ color: selectedWorkstream === w.label ? INDIGO : SECONDARY }}
                >
                  {w.label}
                </span>
              ))}
            </div>
          </>
        )}
      </div>

      {/* To Do */}
      <div
        className="flex min-w-[220px] flex-col rounded-card border border-bordergray bg-white px-6 py-4 shadow-card"
        onClick={() => onSelectTodo(null)}
      >
        <div className="flex items-baseline justify-between">
          <Label>To Do</Label>
          <span className="text-[12px] font-semibold" style={{ color: MUTED }}>
            {total} total
          </span>
        </div>
        <div className="mt-2 flex flex-1 items-end justify-center gap-10 border-b border-gray-100 pt-2">
          {todo.map((t) => {
            const isSelected = selectedTodo === t.key;
            const dimmed = selectedTodo !== null && !isSelected;
            return (
              <div
                key={t.key}
                className="flex cursor-pointer flex-col items-center gap-2"
                style={{ opacity: dimmed ? 0.35 : 1 }}
                onClick={(e) => {
                  e.stopPropagation();
                  onSelectTodo(isSelected ? null : t.key);
                }}
              >
                <span
                  className="rounded-full bg-gray-100 px-2 py-px text-[12px] font-bold"
                  style={{ color: "#15162b" }}
                >
                  {t.count}
                </span>
                <div
                  className="w-12 rounded-t-md"
                  style={{ background: t.color, height: `${28 + (t.count / maxTodo) * 88}px` }}
                />
              </div>
            );
          })}
        </div>
        <div className="flex justify-center gap-10 pt-2">
          {todo.map((t) => (
            <span
              key={t.key}
              className="w-12 text-center text-[11px]"
              style={{ color: selectedTodo === t.key ? INDIGO : SECONDARY }}
            >
              {t.label}
            </span>
          ))}
        </div>
      </div>
    </div>
  );
}
