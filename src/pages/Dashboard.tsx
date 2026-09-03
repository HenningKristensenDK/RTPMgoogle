import { Fragment, useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { FileText, Mail, GitPullRequest, CheckSquare, Sparkles, ArrowRight } from "lucide-react";
import type { LucideIcon } from "lucide-react";
import type { Timestamp } from "firebase/firestore";
import type { Organization, Risk, RiskPriority } from "../types";
import { useRiskStore } from "../store/riskStore";
import { useTodosOverlayStore } from "../store/todosStore";
import { useAgentPanelStore } from "../store/agentPanelStore";
import { watchOrganizations } from "../firebase/firestore";
import { STATUS_LABEL, NEXT_STEP_OWNER, PRIORITY_META, formatDate, pickResponsible } from "../lib/format";
import { tierColor } from "../lib/tiers";
import { bandChip } from "../lib/rag";
import { SCORE_LEVELS, LIKELIHOOD_LABELS, IMPACT_LABELS, priorityFromScore } from "../lib/riskScoring";
import { toast } from "../lib/toast";
import PersonAvatar from "../components/common/PersonAvatar";
import PhaseMilestoneTimeline from "../components/dashboard/PhaseMilestoneTimeline";
import Tier2CategoryCards from "../components/dashboard/Tier2CategoryCards";
import RiskWorkstreamBreakdown from "../components/dashboard/RiskWorkstreamBreakdown";
import { useDashboardMetrics } from "../lib/useDashboardMetrics";
import { contingencyPct, contingencyRag, ragDot } from "../lib/dashboardMetrics";
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

  const metrics = useDashboardMetrics(projectId);
  const commercialLatest = metrics.commercial[metrics.commercial.length - 1];
  const contingencyRemainingPct = contingencyPct(commercialLatest);

  const today = new Date();
  const openRisks = useMemo(() => risks.filter((r) => r.status !== "resolved"), [risks]);
  const criticalCount = useMemo(
    () => openRisks.filter((r) => r.priority === "critical").length,
    [openRisks]
  );
  const overdueCount = useMemo(() => openRisks.filter((r) => isOverdue(r, today)).length, [openRisks]);

  function ownerOf(risk: Risk) {
    return roles
      .filter((r) => risk.workstreamIds.includes(r.id))
      .map(pickResponsible)
      .find((p) => p !== null);
  }

  // Risk matrix: real Likelihood x Impact grid — each open risk plotted at
  // its (likelihood, impactScore) cell. Rows = likelihood 5 (top) to 1
  // (bottom), columns = impact 1 (left) to 5 (right).
  const matrixCells = useMemo(() => {
    const cells = new Map<string, Risk[]>();
    openRisks.forEach((r) => {
      const key = `${r.likelihood}-${r.impactScore}`;
      const bucket = cells.get(key) ?? [];
      bucket.push(r);
      cells.set(key, bucket);
    });
    return cells;
  }, [openRisks]);

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
            label="Contingency Remaining"
            value={`${contingencyRemainingPct.toFixed(0)}%`}
            subtext={`DKK ${(commercialLatest.contingencyRemainingDkk / 1_000_000).toFixed(1)}M of ${(commercialLatest.totalContingencyDkk / 1_000_000).toFixed(0)}M`}
            valueColor={ragDot(contingencyRag(contingencyRemainingPct))}
          />
        </div>

        {/* Phase & milestone timeline (Step 1 — spec Section 6) */}
        <PhaseMilestoneTimeline />

        {/* Main cockpit grid: risk matrix + top risks | project control queues | AI insights */}
        <div className="grid grid-cols-1 gap-4 xl:grid-cols-3">

          {/* Left: workstream/contractor breakdown + risk matrix + top critical risks */}
          <div className="flex flex-col gap-4">
            {/* Step 3 — Workstream/Contractor pivot, above the Risk Matrix */}
            <RiskWorkstreamBreakdown />
            <div className="flex flex-1 flex-col rounded-card bg-white px-6 py-5 shadow-card">
              <h2
                className="text-[11px] font-semibold uppercase tracking-wider"
                style={{ color: "#8a8ca6" }}
              >
                Risk matrix
              </h2>
              <p className="mb-3 mt-1 text-[11px]" style={{ color: "#b8b9c9" }}>
                Likelihood × impact — click a cell to filter the Risk Register.
              </p>
              <div className="flex flex-1 items-stretch gap-2">
                <div
                  className="shrink-0 self-stretch text-center text-[10px] font-medium text-gray-400"
                  style={{ writingMode: "vertical-rl", transform: "rotate(180deg)" }}
                >
                  Likelihood
                </div>
                <div className="flex-1">
                  <div
                    className="grid items-stretch gap-1.5"
                    style={{ gridTemplateColumns: "20px repeat(5, 1fr)" }}
                  >
                    {[5, 4, 3, 2, 1].map((L) => (
                      <Fragment key={L}>
                        <div className="flex items-center justify-center text-[11px] font-medium text-gray-400">
                          {L}
                        </div>
                        {SCORE_LEVELS.map((I) => {
                          const cellRisks = matrixCells.get(`${L}-${I}`) ?? [];
                          const band = priorityFromScore(L * I);
                          const chip = bandChip(band);
                          return (
                            <button
                              key={I}
                              onClick={() => goToRisks({ presetPriority: band })}
                              title={`Likelihood ${L} × Impact ${I} — ${PRIORITY_META[band].label}${cellRisks.length ? `, ${cellRisks.length} risk${cellRisks.length === 1 ? "" : "s"}` : ""}`}
                              className="flex w-full items-center justify-center rounded transition hover:opacity-75"
                              style={{
                                aspectRatio: "1",
                                background: `${chip.bg}22`,
                                border: band === "critical" ? `2px solid ${chip.bg}` : `1px solid ${chip.bg}55`,
                              }}
                            >
                              {cellRisks.length > 0 && (
                                <span
                                  className="flex h-6 min-w-[24px] items-center justify-center rounded-full px-1.5 text-[12px] font-bold"
                                  style={{ background: chip.bg, color: chip.text }}
                                >
                                  {cellRisks.length}
                                </span>
                              )}
                            </button>
                          );
                        })}
                      </Fragment>
                    ))}
                    <div />
                    {SCORE_LEVELS.map((I) => (
                      <div key={I} className="text-center text-[11px] font-medium text-gray-400">
                        {I}
                      </div>
                    ))}
                  </div>
                  <div className="mt-1 pl-4 text-center text-[10px] font-medium text-gray-400">Impact</div>
                </div>
              </div>

              {/* Caption + color-band legend — secondary in weight to the matrix itself */}
              <p className="mt-3 text-center text-[11px]" style={{ color: "#595b78" }}>
                Likelihood: 1 {LIKELIHOOD_LABELS[1]} – 5 {LIKELIHOOD_LABELS[5]} &nbsp;|&nbsp; Impact: 1{" "}
                {IMPACT_LABELS[1]} – 5 {IMPACT_LABELS[5]} (cost / schedule / safety)
              </p>
              <div className="mt-1.5 flex items-center justify-center gap-3 text-[11px]" style={{ color: "#595b78" }}>
                {(["low", "medium", "high", "critical"] as RiskPriority[]).map((band) => {
                  const chip = bandChip(band);
                  return (
                    <span key={band} className="flex items-center gap-1">
                      <span className="h-2 w-2 rounded-full" style={{ background: chip.bg }} />
                      {PRIORITY_META[band].label}
                    </span>
                  );
                })}
              </div>
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

        {/* Tier 2 — control-queue category cards (Step 2 — spec Section 2) */}
        <Tier2CategoryCards metrics={metrics} />

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
                        {act.title}
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
