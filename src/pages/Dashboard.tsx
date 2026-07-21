import { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { Check, FileText, Mail, GitPullRequest, CheckSquare, Sparkles, ArrowRight } from "lucide-react";
import type { LucideIcon } from "lucide-react";
import type { Timestamp } from "firebase/firestore";
import type { Organization, Risk, RiskPriority } from "../types";
import { useRiskStore } from "../store/riskStore";
import { useTodosOverlayStore } from "../store/todosStore";
import { useAgentPanelStore } from "../store/agentPanelStore";
import { watchOrganizations } from "../firebase/firestore";
import { STATUS_LABEL, NEXT_STEP_OWNER, PRIORITY_META, formatDate, pickResponsible } from "../lib/format";
import { tierColor } from "../lib/tiers";
import { toast } from "../lib/toast";
import PersonAvatar from "../components/common/PersonAvatar";
import {
  PROJECT_HEALTH,
  MY_TODO_MOCK,
  SCHEDULE_CONFIDENCE_MOCK,
  OPEN_DECISIONS_MOCK,
  DOCUMENTS_WAITING_MOCK,
  CORRESPONDENCE_WAITING_MOCK,
  CHANGE_EXPOSURE_MOCK,
} from "../lib/dashboardMock";
import type { RiskStatus } from "../types";

const MILESTONES = [
  { label: "NTP",                  date: "2026.03.01", iso: "2026-03-01" },
  { label: "Design Freeze",        date: "2026.06.15", iso: "2026-06-15" },
  { label: "MEP Procurement",      date: "2026.09.01", iso: "2026-09-01" },
  { label: "Civil Complete",       date: "2026.12.01", iso: "2026-12-01" },
  { label: "Commissioning Start",  date: "2027.03.01", iso: "2027-03-01" },
  { label: "COD",                  date: "2027.09.30", iso: "2027-09-30" },
];

const MATRIX_PRIORITIES: RiskPriority[] = ["critical", "high", "medium", "low"];

type ActivityEntry = {
  riskId: string;
  title: string;
  to: string;
  changedAt: Timestamp;
};

function isOverdue(r: Risk, today: Date): boolean {
  return !!r.dueDate && r.dueDate.toDate() < today;
}

export default function Dashboard() {
  const navigate = useNavigate();
  const { risks, roles, projectId, loading } = useRiskStore();
  const setTodosOpen = useTodosOverlayStore((s) => s.setOpen);
  const askAgent = useAgentPanelStore((s) => s.askAgent);
  const [orgs, setOrgs] = useState<Organization[]>([]);

  useEffect(() => {
    if (!projectId) return;
    return watchOrganizations(projectId, setOrgs);
  }, [projectId]);

  const today = new Date();
  const openRisks = useMemo(() => risks.filter((r) => r.status !== "resolved"), [risks]);
  const criticalCount = useMemo(
    () => openRisks.filter((r) => r.priority === "critical").length,
    [openRisks]
  );
  const overdueCount = useMemo(() => openRisks.filter((r) => isOverdue(r, today)).length, [openRisks]);

  // Milestone state: index of first upcoming milestone (-1 if all past)
  const firstUpcomingIdx = MILESTONES.findIndex((m) => new Date(m.iso) > today);
  const fu = firstUpcomingIdx === -1 ? MILESTONES.length : firstUpcomingIdx;

  function ownerOf(risk: Risk) {
    return roles
      .filter((r) => risk.workstreamIds.includes(r.id))
      .map(pickResponsible)
      .find((p) => p !== null);
  }

  // Risk matrix: workstream x priority, entirely real (both fields already
  // exist on Risk/RoleResponsibility) — no fabricated likelihood axis.
  const riskMatrix = useMemo(() => {
    const workstreamNames = [...new Set(roles.map((r) => r.workstream))];
    return workstreamNames
      .map((ws) => {
        const wsRoleIds = roles.filter((r) => r.workstream === ws).map((r) => r.id);
        const counts = MATRIX_PRIORITIES.map(
          (p) =>
            openRisks.filter(
              (r) => r.priority === p && r.workstreamIds.some((id) => wsRoleIds.includes(id))
            ).length
        );
        return { workstream: ws, counts, total: counts.reduce((a, b) => a + b, 0) };
      })
      .filter((row) => row.total > 0)
      .sort((a, b) => b.total - a.total);
  }, [roles, openRisks]);

  // Top critical risks — real, overdue first then earliest due date.
  const topCriticalRisks = useMemo(() => {
    return openRisks
      .filter((r) => r.priority === "critical" || r.priority === "high")
      .sort((a, b) => {
        const aOver = isOverdue(a, today) ? 0 : 1;
        const bOver = isOverdue(b, today) ? 0 : 1;
        if (aOver !== bOver) return aOver - bOver;
        return (a.dueDate?.toMillis() ?? Infinity) - (b.dueDate?.toMillis() ?? Infinity);
      })
      .slice(0, 5);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [openRisks]);

  const mostUrgent = topCriticalRisks[0] ?? null;
  const mostUrgentOwner = mostUrgent ? ownerOf(mostUrgent) : undefined;

  // Ownership hotspots (formerly "Ball in court") — real, unchanged logic.
  const ownershipData = useMemo(() => {
    const counts: Record<string, number> = {};
    openRisks.forEach((r) => {
      const owner = NEXT_STEP_OWNER[r.status];
      if (owner) counts[owner] = (counts[owner] || 0) + 1;
    });
    return Object.entries(counts).sort(([, a], [, b]) => b - a);
  }, [openRisks]);

  // Recent activity — deduplicated (latest entry per risk+status), max 8
  const recentActivity = useMemo((): ActivityEntry[] => {
    const all: ActivityEntry[] = [];
    risks.forEach((r) => {
      (r.statusHistory || []).forEach((h) => {
        if (h.changedAt) {
          all.push({ riskId: r.riskId, title: r.title, to: h.to, changedAt: h.changedAt });
        }
      });
    });
    all.sort((a, b) => b.changedAt.toMillis() - a.changedAt.toMillis());
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

  function goToRisks(preset: { presetPriority?: RiskPriority; presetWorkstream?: string }) {
    navigate("/risks", { state: preset });
  }

  function notBuiltYet(moduleName: string) {
    toast.error(`${moduleName} isn't built in the platform yet.`);
  }

  function askAboutUrgentRisk() {
    if (!mostUrgent) {
      askAgent("What should I be focusing on across the project this week?");
      return;
    }
    askAgent(
      `Draft an escalation note for ${mostUrgent.riskId} — ${mostUrgent.title} — and suggest who should follow up before the next steering meeting.`
    );
  }

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

        {/* KPI cards */}
        <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-6">
          <KpiCard
            label="Project Health"
            value={PROJECT_HEALTH.label}
            subtext={PROJECT_HEALTH.subtext}
            valueColor={PROJECT_HEALTH.color}
          />
          <KpiCard
            label="My To Do"
            value={MY_TODO_MOCK.open}
            subtext={`${MY_TODO_MOCK.overdue} overdue`}
            valueColor="#ff8b00"
            onClick={() => setTodosOpen(true)}
          />
          <KpiCard
            label="Critical Risks"
            value={criticalCount}
            subtext={`${openRisks.length} open`}
            valueColor={criticalCount > 0 ? "#e63946" : undefined}
            onClick={() => goToRisks({ presetPriority: "critical" })}
          />
          <KpiCard
            label="Schedule Confidence"
            value={`${SCHEDULE_CONFIDENCE_MOCK.pct}%`}
            subtext={SCHEDULE_CONFIDENCE_MOCK.subtext}
            valueColor="#ff8b00"
          />
          <KpiCard
            label="Open Decisions"
            value={OPEN_DECISIONS_MOCK.pending}
            subtext={`${OPEN_DECISIONS_MOCK.overdue} overdue`}
            valueColor="#ff8b00"
            onClick={() => notBuiltYet("Decisions & Approvals")}
          />
          <KpiCard
            label="Documents Waiting"
            value={DOCUMENTS_WAITING_MOCK.waiting}
            subtext={`${DOCUMENTS_WAITING_MOCK.overdue} overdue reviews`}
            valueColor="#ff8b00"
            onClick={() => navigate("/documents")}
          />
        </div>

        {/* Milestone timeline */}
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
                  <div
                    className="mt-2 text-center text-[11px] font-semibold"
                    style={{
                      color: isDone ? "#28a745" : isCurrent ? "#0d08d2" : "#8a8ca6",
                    }}
                  >
                    {ms.label}
                  </div>
                  <div className="mt-0.5 text-center text-[10px]" style={{ color: "#8a8ca6" }}>
                    {ms.date}
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Main cockpit grid: risk matrix + top risks | project control queues | AI insights */}
        <div className="grid grid-cols-1 gap-4 xl:grid-cols-3">

          {/* Left: risk matrix + top critical risks */}
          <div className="flex flex-col gap-4">
            <div className="rounded-card bg-white px-6 py-5 shadow-card">
              <h2
                className="text-[11px] font-semibold uppercase tracking-wider"
                style={{ color: "#8a8ca6" }}
              >
                Risk matrix
              </h2>
              <p className="mb-3 mt-1 text-[11px]" style={{ color: "#b8b9c9" }}>
                Open risks by workstream and priority — click a count to filter the Risk Register.
              </p>
              {riskMatrix.length === 0 ? (
                <p className="text-sm text-gray-400">No open risks.</p>
              ) : (
                <div className="scroll-thin overflow-x-auto">
                  <table className="w-full text-left text-[12px]">
                    <thead>
                      <tr>
                        <th className="pb-2 pr-3 font-medium text-gray-400">Workstream</th>
                        {MATRIX_PRIORITIES.map((p) => (
                          <th
                            key={p}
                            className="px-1.5 pb-2 text-center font-medium"
                            style={{ color: PRIORITY_META[p].text }}
                          >
                            {PRIORITY_META[p].label}
                          </th>
                        ))}
                      </tr>
                    </thead>
                    <tbody>
                      {riskMatrix.map((row) => (
                        <tr key={row.workstream} className="border-t border-bordergray">
                          <td className="whitespace-nowrap py-2 pr-3 font-medium text-ink">
                            {row.workstream}
                          </td>
                          {row.counts.map((count, i) => {
                            const p = MATRIX_PRIORITIES[i];
                            return (
                              <td key={p} className="px-1.5 py-2 text-center">
                                {count === 0 ? (
                                  <span className="text-gray-300">—</span>
                                ) : (
                                  <button
                                    onClick={() => goToRisks({ presetWorkstream: row.workstream, presetPriority: p })}
                                    className="inline-flex h-6 min-w-[24px] items-center justify-center rounded-full px-1.5 text-[11px] font-bold text-white transition hover:opacity-80"
                                    style={{ background: PRIORITY_META[p].dot }}
                                  >
                                    {count}
                                  </button>
                                )}
                              </td>
                            );
                          })}
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>

            <div className="overflow-hidden rounded-card bg-white shadow-card">
              <div className="border-b border-bordergray px-6 py-4">
                <h2
                  className="text-[11px] font-semibold uppercase tracking-wider"
                  style={{ color: "#8a8ca6" }}
                >
                  Top critical risks
                </h2>
              </div>
              {topCriticalRisks.length === 0 ? (
                <p className="px-6 py-4 text-sm text-gray-400">No critical or high-priority risks open.</p>
              ) : (
                <div className="flex flex-col">
                  {topCriticalRisks.map((r) => {
                    const person = ownerOf(r);
                    const prio = PRIORITY_META[r.priority];
                    const overdue = isOverdue(r, today);
                    return (
                      <button
                        key={r.id}
                        onClick={() =>
                          navigate(`/risks/${r.id}`, {
                            // Opened from the dashboard, not the Risk Register — the
                            // popup's own close button always routes back to /risks
                            // (RiskDetail.tsx), so the dimmed background should be
                            // the Risk Register, not this Dashboard page.
                            state: { background: { pathname: "/risks", search: "", hash: "", state: null, key: "dashboard" } },
                          })
                        }
                        className="flex items-center gap-3 border-t border-bordergray px-6 py-3 text-left first:border-t-0 hover:bg-fog"
                      >
                        <span
                          className="h-2 w-2 shrink-0 rounded-full"
                          style={{ background: prio.dot }}
                        />
                        <div className="min-w-0 flex-1">
                          <div className="truncate text-[13px] font-medium text-ink">{r.title}</div>
                          <div className="mt-0.5 text-[11px] text-gray-400">
                            {r.riskId} · {STATUS_LABEL[r.status]} ·{" "}
                            <span style={{ color: overdue ? "#e63946" : "#8a8ca6" }}>
                              {overdue ? "overdue" : `due ${formatDate(r.dueDate)}`}
                            </span>
                          </div>
                        </div>
                        {person ? (
                          <PersonAvatar name={person.name} ringColor={tierColor(orgs, person.organization)} size={26} />
                        ) : (
                          <span className="shrink-0 text-[11px] text-gray-400">
                            {NEXT_STEP_OWNER[r.status] ?? ""}
                          </span>
                        )}
                      </button>
                    );
                  })}
                </div>
              )}
            </div>
          </div>

          {/* Middle: project control queues */}
          <div className="flex flex-col gap-3">
            <h2
              className="text-[11px] font-semibold uppercase tracking-wider"
              style={{ color: "#8a8ca6" }}
            >
              Project control queues
            </h2>
            <QueueCard
              icon={FileText}
              label="Documents waiting"
              count={DOCUMENTS_WAITING_MOCK.waiting}
              subtext={`${DOCUMENTS_WAITING_MOCK.overdue} overdue reviews`}
              onView={() => navigate("/documents")}
            />
            <QueueCard
              icon={Mail}
              label="Correspondence waiting"
              count={CORRESPONDENCE_WAITING_MOCK.waiting}
              subtext={CORRESPONDENCE_WAITING_MOCK.subtext}
              onView={() => navigate("/correspondence")}
            />
            <QueueCard
              icon={CheckSquare}
              label="Open decisions"
              count={OPEN_DECISIONS_MOCK.pending}
              subtext={`${OPEN_DECISIONS_MOCK.overdue} overdue`}
              onView={() => notBuiltYet("Decisions & Approvals")}
            />
            <QueueCard
              icon={GitPullRequest}
              label="Change / early warning"
              count={CHANGE_EXPOSURE_MOCK.count}
              subtext={CHANGE_EXPOSURE_MOCK.subtext}
              onView={() => navigate("/change-management")}
            />
          </div>

          {/* Right: AI insights */}
          <div className="flex flex-col gap-4 rounded-card bg-white px-6 py-5 shadow-card">
            <div className="flex items-center gap-2">
              <Sparkles size={15} style={{ color: "#0d08d2" }} />
              <h2
                className="text-[11px] font-semibold uppercase tracking-wider"
                style={{ color: "#8a8ca6" }}
              >
                AI Project Manager Insights
              </h2>
            </div>

            <InsightBlock
              title="What changed"
              text={`${criticalCount} risk${criticalCount === 1 ? " is" : "s are"} currently marked critical, and ${overdueCount} risk${overdueCount === 1 ? " is" : "s are"} past due.`}
            />
            <InsightBlock
              title="Needs attention"
              text={
                mostUrgent
                  ? `${mostUrgent.riskId} — ${mostUrgent.title} is ${isOverdue(mostUrgent, today) ? "overdue" : `due ${formatDate(mostUrgent.dueDate)}`}. ${
                      mostUrgentOwner ? `Owner: ${mostUrgentOwner.name}.` : NEXT_STEP_OWNER[mostUrgent.status] ? `Next: ${NEXT_STEP_OWNER[mostUrgent.status]}.` : ""
                    }`
                  : "Nothing urgent right now — no overdue or critical risks open."
              }
            />
            <InsightBlock
              title="Suggested action"
              text={
                mostUrgent
                  ? `Draft an escalation note for ${mostUrgent.riskId} and assign follow-up before the next steering meeting.`
                  : "No urgent follow-up needed right now."
              }
            />

            <button
              onClick={askAboutUrgentRisk}
              className="mt-1 flex items-center justify-center gap-1.5 rounded-btn bg-indigo px-3 py-2 text-sm font-semibold text-white hover:bg-indigo/90"
            >
              Ask Project Agent <ArrowRight size={14} />
            </button>
          </div>
        </div>

        {/* Recent activity + ownership hotspots */}
        <div className="grid grid-cols-3 gap-4">

          <div className="col-span-2 overflow-hidden rounded-card bg-white shadow-card">
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

          <div className="rounded-card bg-white px-6 py-5 shadow-card">
            <h2
              className="mb-4 text-[11px] font-semibold uppercase tracking-wider"
              style={{ color: "#8a8ca6" }}
            >
              Ownership Hotspots
            </h2>
            {ownershipData.length === 0 ? (
              <p className="text-sm text-gray-400">No open risks.</p>
            ) : (
              <div className="flex flex-col gap-3">
                {ownershipData.map(([owner, count]) => (
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

      </div>
    </div>
  );
}

function KpiCard({
  label,
  value,
  subtext,
  valueColor,
  onClick,
}: {
  label: string;
  value: number | string;
  subtext?: string;
  valueColor?: string;
  onClick?: () => void;
}) {
  const Tag = onClick ? "button" : "div";
  return (
    <Tag
      onClick={onClick}
      className={`rounded-card bg-white px-5 py-4 text-left shadow-card ${onClick ? "transition hover:shadow-panel" : ""}`}
      style={{ border: "1px solid #e6e6f0" }}
    >
      <div className="text-[28px] font-bold leading-none" style={{ color: valueColor ?? "#070474" }}>
        {value}
      </div>
      <div className="mt-2 text-[12px]" style={{ color: "#595b78" }}>
        {label}
      </div>
      {subtext && (
        <div className="mt-0.5 text-[11px]" style={{ color: "#b8b9c9" }}>
          {subtext}
        </div>
      )}
    </Tag>
  );
}

function QueueCard({
  icon: Icon,
  label,
  count,
  subtext,
  onView,
}: {
  icon: LucideIcon;
  label: string;
  count: number;
  subtext: string;
  onView: () => void;
}) {
  return (
    <div className="flex items-center justify-between rounded-card bg-white px-5 py-4 shadow-card">
      <div className="flex items-center gap-3">
        <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg" style={{ background: "#e7e6fa" }}>
          <Icon size={18} style={{ color: "#0d08d2" }} />
        </div>
        <div>
          <div className="flex items-baseline gap-1.5">
            <span className="text-[20px] font-bold leading-none text-ink">{count}</span>
            <span className="text-[12px] font-medium text-ink">{label}</span>
          </div>
          <div className="mt-1 text-[11px]" style={{ color: "#8a8ca6" }}>
            {subtext}
          </div>
        </div>
      </div>
      <button
        onClick={onView}
        className="flex shrink-0 items-center gap-1 text-[12px] font-semibold text-indigo hover:underline"
      >
        View <ArrowRight size={13} />
      </button>
    </div>
  );
}

function InsightBlock({ title, text }: { title: string; text: string }) {
  return (
    <div>
      <div className="text-[12px] font-semibold text-ink">{title}</div>
      <p className="mt-0.5 text-[12.5px] leading-relaxed" style={{ color: "#595b78" }}>
        {text}
      </p>
    </div>
  );
}
