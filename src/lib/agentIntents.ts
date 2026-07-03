import type { Risk } from "../types";
import { formatDate, PRIORITY_META, STATUS_LABEL, NEXT_STEP_OWNER } from "./format";

export type Intent = "urgent" | "risks" | "documents" | "correspondence" | "unknown";

/** Simple keyword dispatcher — not an LLM. Real intents read live risk data;
 * everything else gets an honest "not built yet" reply. No invented content. */
export function classifyIntent(text: string): Intent {
  const t = text.toLowerCase();
  if (t.includes("urgent") || t.includes("task")) return "urgent";
  if (t.includes("risk")) return "risks";
  if (t.includes("document") || t.includes("report") || t.includes("inspection") || t.includes("nonconformance")) {
    return "documents";
  }
  if (
    t.includes("message") ||
    t.includes("draft") ||
    t.includes("contractor") ||
    t.includes("correspondence") ||
    t.includes("email")
  ) {
    return "correspondence";
  }
  return "unknown";
}

function isOverdue(risk: Risk, today: Date): boolean {
  return !!risk.dueDate && risk.dueDate.toDate() < today;
}

function daysOverdue(risk: Risk, today: Date): number {
  if (!risk.dueDate) return 0;
  return Math.ceil((today.getTime() - risk.dueDate.toDate().getTime()) / 86400000);
}

/** "Find my urgent tasks" — there's no separate Tasks module yet, so this is
 * grounded in the Risk register: overdue risks first, then open criticals. */
export function urgentRisksReply(risks: Risk[]): string {
  const today = new Date();
  const open = risks.filter((r) => r.status !== "resolved");

  const overdue = open
    .filter((r) => isOverdue(r, today))
    .sort((a, b) => daysOverdue(b, today) - daysOverdue(a, today));
  const criticalNotOverdue = open
    .filter((r) => r.priority === "critical" && !isOverdue(r, today))
    .sort((a, b) => (a.dueDate?.toMillis() ?? Infinity) - (b.dueDate?.toMillis() ?? Infinity));

  const urgent = [...overdue, ...criticalNotOverdue].slice(0, 5);

  if (urgent.length === 0) {
    return "Nothing urgent right now — no overdue risks and no open criticals. (There's no separate Tasks module yet, so this is based on the Risk register.)";
  }

  const lines = urgent.map((r) => {
    const owner = NEXT_STEP_OWNER[r.status] ?? STATUS_LABEL[r.status];
    const dueText = isOverdue(r, today)
      ? `${daysOverdue(r, today)}d overdue`
      : `due ${formatDate(r.dueDate)}`;
    return `${r.riskId} — ${r.title} (${PRIORITY_META[r.priority].label}), ${dueText}. Next: ${owner}.`;
  });

  return `Based on the Risk register (no separate Tasks module yet), here's what's urgent:\n\n${lines.join("\n")}`;
}

/** "Analyze open project risks" — real counts + the highest-priority open risks. */
export function riskAnalysisReply(risks: Risk[]): string {
  const open = risks.filter((r) => r.status !== "resolved");
  if (open.length === 0) return "No open risks in the register right now.";

  const critical = open.filter((r) => r.priority === "critical");
  const high = open.filter((r) => r.priority === "high");
  const top = [...critical, ...high].slice(0, 5);

  const header = `${open.length} open risk${open.length === 1 ? "" : "s"} (${critical.length} critical, ${high.length} high priority).`;
  if (top.length === 0) return header;

  const lines = top.map((r) => `${r.riskId} — ${r.title} (${PRIORITY_META[r.priority].label}, ${STATUS_LABEL[r.status]})`);
  return `${header}\n\n${lines.join("\n")}`;
}

const NOT_BUILT_YET: Record<"documents" | "correspondence", string> = {
  documents:
    "Documents isn't built in the platform yet — it's coming in a later module. I can't pull a site report yet.",
  correspondence:
    "Correspondence isn't built in the platform yet — it's coming in a later module. I can't draft or send messages yet.",
};

const FALLBACK =
  "I can answer questions about open risks right now — urgent items or a risk analysis. The rest of the project record (documents, correspondence, time log, and more) isn't connected to the agent yet.";

export function agentReply(text: string, risks: Risk[]): string {
  switch (classifyIntent(text)) {
    case "urgent":
      return urgentRisksReply(risks);
    case "risks":
      return riskAnalysisReply(risks);
    case "documents":
      return NOT_BUILT_YET.documents;
    case "correspondence":
      return NOT_BUILT_YET.correspondence;
    default:
      return FALLBACK;
  }
}
