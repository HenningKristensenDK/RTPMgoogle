import { useMemo } from "react";
import { Check } from "lucide-react";
import type { Timestamp } from "firebase/firestore";
import { useRiskStore } from "../store/riskStore";
import { STATUS_LABEL, NEXT_STEP_OWNER } from "../lib/format";
import type { RiskStatus } from "../types";

const MILESTONES = [
  { label: "NTP",                  date: "2026.03.01", iso: "2026-03-01" },
  { label: "Design Freeze",        date: "2026.06.15", iso: "2026-06-15" },
  { label: "MEP Procurement",      date: "2026.09.01", iso: "2026-09-01" },
  { label: "Civil Complete",       date: "2026.12.01", iso: "2026-12-01" },
  { label: "Commissioning Start",  date: "2027.03.01", iso: "2027-03-01" },
  { label: "COD",                  date: "2027.09.30", iso: "2027-09-30" },
];

const COD_DATE = new Date("2027-09-30");

type ActivityEntry = {
  riskId: string;
  title: string;
  to: string;
  changedAt: Timestamp;
};

export default function Dashboard() {
  const { risks, roles, loading } = useRiskStore();

  const today = new Date();
  const openRisks = useMemo(() => risks.filter((r) => r.status !== "resolved"), [risks]);
  const criticalCount = useMemo(() => risks.filter((r) => r.priority === "critical").length, [risks]);
  const daysToCod = Math.ceil((COD_DATE.getTime() - today.getTime()) / 86400000);

  // Milestone state: index of first upcoming milestone (-1 if all past)
  const firstUpcomingIdx = MILESTONES.findIndex((m) => new Date(m.iso) > today);
  const fu = firstUpcomingIdx === -1 ? MILESTONES.length : firstUpcomingIdx;

  // Workstream bar chart
  const workstreamData = useMemo(() => {
    const wsMap: Record<string, number> = {};
    openRisks.forEach((r) => {
      const ws = [...new Set(
        roles.filter((role) => r.workstreamIds.includes(role.id)).map((role) => role.workstream)
      )];
      ws.forEach((w) => { wsMap[w] = (wsMap[w] || 0) + 1; });
    });
    return Object.entries(wsMap).sort(([, a], [, b]) => b - a);
  }, [openRisks, roles]);

  const maxWsCount = workstreamData[0]?.[1] || 1;

  // Ball in court
  const ballData = useMemo(() => {
    const counts: Record<string, number> = {};
    openRisks.forEach((r) => {
      const owner = NEXT_STEP_OWNER[r.status];
      if (owner) counts[owner] = (counts[owner] || 0) + 1;
    });
    return Object.entries(counts).sort(([, a], [, b]) => b - a);
  }, [openRisks]);

  // Recent activity — deduplicated (latest entry per risk+status), max 8
  const recentActivity = useMemo((): ActivityEntry[] => {
    // Collect all entries with a timestamp
    const all: ActivityEntry[] = [];
    risks.forEach((r) => {
      (r.statusHistory || []).forEach((h) => {
        if (h.changedAt) {
          all.push({ riskId: r.riskId, title: r.title, to: h.to, changedAt: h.changedAt });
        }
      });
    });
    // Sort newest-first so the first occurrence of each riskId+status is the most recent
    all.sort((a, b) => b.changedAt.toMillis() - a.changedAt.toMillis());
    // Keep only the first (most recent) entry per riskId+status combination
    const seen = new Set<string>();
    const deduped: ActivityEntry[] = [];
    for (const entry of all) {
      const key = `${entry.riskId}::${entry.to}`;
      if (!seen.has(key)) {
        seen.add(key);
        deduped.push(entry);
      }
    }
    return deduped.slice(0, 8);
  }, [risks]);

  if (loading) {
    return (
      <div className="flex h-full items-center justify-center text-sm text-gray-400">
        Loading…
      </div>
    );
  }

  return (
    <div className="scroll-thin h-full overflow-auto">

      <div className="flex flex-col gap-5 p-6">

        {/* Section 2 — KPI cards */}
        <div className="grid grid-cols-5 gap-4">
          <KpiCard label="Open Risks" value={openRisks.length} />
          <KpiCard
            label="Critical Risks"
            value={criticalCount}
            valueColor={criticalCount > 0 ? "#e63946" : undefined}
          />
          <KpiCard label="Open Early Warnings" value={4} />
          <KpiCard label="Pending Changes" value={2} />
          <KpiCard label="Days to COD" value={daysToCod} />
        </div>

        {/* Section 3 — Milestone timeline */}
        <div className="rounded-card bg-white px-6 py-5 shadow-card">
          <h2
            className="mb-4 text-[11px] font-semibold uppercase tracking-wider"
            style={{ color: "#8a8ca6" }}
          >
            Milestone timeline
          </h2>
          <div className="flex items-start">
            {MILESTONES.map((ms, idx) => {
              const isDone = idx < fu;
              const isCurrent = idx === firstUpcomingIdx;
              const isLast = idx === MILESTONES.length - 1;
              const lineSolid = isDone;

              return (
                <div key={ms.label} className="flex flex-1 flex-col items-center">
                  {/* Circle row with connectors */}
                  <div className="flex w-full items-center">
                    <div className="flex-1">
                      {idx > 0 && (
                        <div
                          className="h-[2px] w-full"
                          style={{
                            background: lineSolid ? "#28a745" : "transparent",
                            borderTop: lineSolid ? "none" : "2px dashed #D1D5DB",
                          }}
                        />
                      )}
                    </div>
                    <div
                      className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full"
                      style={{
                        background: isDone ? "#28a745" : "transparent",
                        border: isDone
                          ? "none"
                          : isCurrent
                          ? "2px solid #0d08d2"
                          : "2px solid #D1D5DB",
                      }}
                    >
                      {isDone && <Check size={11} strokeWidth={3} color="#fff" />}
                    </div>
                    <div className="flex-1">
                      {!isLast && (
                        <div
                          className="h-[2px] w-full"
                          style={{
                            background: lineSolid ? "#28a745" : "transparent",
                            borderTop: lineSolid ? "none" : "2px dashed #D1D5DB",
                          }}
                        />
                      )}
                    </div>
                  </div>
                  {/* Label */}
                  <div
                    className="mt-2 text-center text-[11px] font-semibold"
                    style={{
                      color: isDone ? "#28a745" : isCurrent ? "#0d08d2" : "#8a8ca6",
                    }}
                  >
                    {ms.label}
                  </div>
                  {/* Date */}
                  <div className="mt-0.5 text-center text-[10px]" style={{ color: "#8a8ca6" }}>
                    {ms.date}
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Section 4 — Workstream bars + Ball in court */}
        <div className="grid grid-cols-3 gap-4">

          {/* Left 2/3: Open risks by workstream */}
          <div className="col-span-2 rounded-card bg-white px-6 py-5 shadow-card">
            <h2
              className="mb-4 text-[11px] font-semibold uppercase tracking-wider"
              style={{ color: "#8a8ca6" }}
            >
              Open risks by workstream
            </h2>
            {workstreamData.length === 0 ? (
              <p className="text-sm text-gray-400">No open risks.</p>
            ) : (
              <div className="flex flex-col gap-3">
                {workstreamData.map(([ws, count]) => (
                  <div key={ws} className="flex items-center gap-3">
                    <span
                      className="w-40 shrink-0 truncate text-[12px] font-medium"
                      style={{ color: "#595b78" }}
                    >
                      {ws}
                    </span>
                    <div
                      className="flex-1 overflow-hidden rounded-full"
                      style={{ background: "#f0f0f8", height: "8px" }}
                    >
                      <div
                        className="h-full rounded-full"
                        style={{
                          width: `${(count / maxWsCount) * 100}%`,
                          background: "#0d08d2",
                        }}
                      />
                    </div>
                    <span
                      className="w-6 shrink-0 text-right text-[12px] font-semibold"
                      style={{ color: "#0d08d2" }}
                    >
                      {count}
                    </span>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Right 1/3: Ball in court */}
          <div className="rounded-card bg-white px-6 py-5 shadow-card">
            <h2
              className="mb-4 text-[11px] font-semibold uppercase tracking-wider"
              style={{ color: "#8a8ca6" }}
            >
              Ball in court
            </h2>
            {ballData.length === 0 ? (
              <p className="text-sm text-gray-400">No open risks.</p>
            ) : (
              <div className="flex flex-col gap-3">
                {ballData.map(([owner, count]) => (
                  <div key={owner} className="flex items-center justify-between">
                    <span className="text-[13px]" style={{ color: "#15162b" }}>
                      {owner}
                    </span>
                    <span
                      className="flex h-6 min-w-[24px] items-center justify-center rounded-full px-2 text-[12px] font-semibold text-white"
                      style={{ background: "#0d08d2" }}
                    >
                      {count}
                    </span>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Section 5 — Recent Activity */}
        <div className="overflow-hidden rounded-card bg-white shadow-card">
          <div className="border-b border-bordergray px-6 py-4">
            <h2
              className="text-[11px] font-semibold uppercase tracking-wider"
              style={{ color: "#8a8ca6" }}
            >
              Recent Activity
            </h2>
          </div>
          {recentActivity.length === 0 ? (
            <p className="px-6 py-4 text-sm text-gray-400">No status changes recorded yet.</p>
          ) : (
            <table className="w-full text-left text-sm">
              <thead className="bg-gray-50 text-[11px] uppercase tracking-wide text-gray-400">
                <tr>
                  <th className="px-6 py-2.5">Type</th>
                  <th className="px-6 py-2.5">Risk ID</th>
                  <th className="px-6 py-2.5">Title</th>
                  <th className="px-6 py-2.5">Moved to</th>
                  <th className="px-6 py-2.5">Date</th>
                </tr>
              </thead>
              <tbody>
                {recentActivity.map((act, i) => (
                  <tr
                    key={i}
                    className="border-t border-bordergray"
                    style={{ background: i % 2 === 0 ? "#ffffff" : "#f7f7fb" }}
                  >
                    <td className="px-6 py-2.5">
                      <span
                        className="rounded-full px-2.5 py-0.5 text-[11px] font-semibold"
                        style={{ background: "#e7e6fa", color: "#0d08d2" }}
                      >
                        Risk
                      </span>
                    </td>
                    <td className="px-6 py-2.5 font-mono text-[12px] text-gray-500">
                      {act.riskId}
                    </td>
                    <td className="px-6 py-2.5 text-[13px] font-medium text-ink">
                      {act.title.replace(/◆/g, " - ")}
                    </td>
                    <td className="px-6 py-2.5">
                      <span
                        className="rounded-full px-2.5 py-0.5 text-[11px] font-semibold"
                        style={{ background: "#f0f0f8", color: "#595b78" }}
                      >
                        {STATUS_LABEL[act.to as RiskStatus] ?? act.to}
                      </span>
                    </td>
                    <td className="px-6 py-2.5 text-[12px] text-gray-500">
                      {act.changedAt
                        .toDate()
                        .toLocaleDateString("en-GB", {
                          day: "numeric",
                          month: "short",
                          year: "numeric",
                        })}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>

      </div>
    </div>
  );
}

function KpiCard({
  label,
  value,
  valueColor,
}: {
  label: string;
  value: number;
  valueColor?: string;
}) {
  return (
    <div
      className="rounded-card bg-white px-5 py-4 shadow-card"
      style={{ border: "1px solid #e6e6f0" }}
    >
      <div
        className="text-[28px] font-bold leading-none"
        style={{ color: valueColor ?? "#070474" }}
      >
        {value}
      </div>
      <div className="mt-2 text-[12px]" style={{ color: "#595b78" }}>
        {label}
      </div>
    </div>
  );
}
