import type { Timestamp } from "firebase/firestore";
import type { AnnotationKind, CommentStatus, CorrespondenceStatus, DocumentAnnotation, DocumentStatus, Party, Risk, RiskKind, RiskPriority, RiskStatus, RoleResponsibility } from "../types";

/** Pre-existing docs have no `kind` field — treat those as plain risks. */
export function riskKind(risk: Pick<Risk, "kind">): RiskKind {
  return risk.kind ?? "risk";
}

/** Annotations predating the kind field have none — treat those as comment pins. */
export function effectiveKind(annotation: Pick<DocumentAnnotation, "kind">): AnnotationKind {
  return annotation.kind ?? "comment";
}

export function tsToDate(ts: Timestamp | null | undefined): Date | null {
  return ts ? ts.toDate() : null;
}

export function formatDate(ts: Timestamp | null | undefined): string {
  const d = tsToDate(ts);
  if (!d) return "—";
  return d.toLocaleDateString("en-GB", {
    day: "numeric",
    month: "short",
    year: "numeric",
  });
}

export function formatDateInput(ts: Timestamp | null | undefined): string {
  const d = tsToDate(ts);
  if (!d) return "";
  return d.toISOString().slice(0, 10);
}

export function formatDateYMD(ts: Timestamp | null | undefined): string {
  const d = tsToDate(ts);
  if (!d) return "—";
  const y = d.getFullYear();
  const mo = String(d.getMonth() + 1).padStart(2, "0");
  const dy = String(d.getDate()).padStart(2, "0");
  return `${y}.${mo}.${dy}`;
}

export function formatEdited(ts: Timestamp | null | undefined): string {
  const d = tsToDate(ts);
  if (!d) return "just now";
  const weekday = d.toLocaleDateString("en-GB", { weekday: "short" });
  const time = d.toLocaleTimeString("en-GB", {
    hour: "2-digit",
    minute: "2-digit",
  });
  return `${weekday} at ${time}`;
}

export function formatTime(ts: Timestamp | null | undefined): string {
  const d = tsToDate(ts);
  if (!d) return "";
  return d.toLocaleTimeString("en-GB", { hour: "2-digit", minute: "2-digit" });
}

export const PRIORITY_META: Record<
  RiskPriority,
  { label: string; dot: string; text: string }
> = {
  low: { label: "Low", dot: "#10B981", text: "#047857" },
  medium: { label: "Medium", dot: "#F59E0B", text: "#B45309" },
  high: { label: "High", dot: "#EF4444", text: "#B91C1C" },
  critical: { label: "Critical", dot: "#DC2626", text: "#7F1D1D" },
};

export const STATUS_LABEL: Record<RiskStatus, string> = {
  identified: "Identified",
  assessed: "Assessed",
  mitigated: "Mitigated",
  resolved: "Resolved",
};

export const CORRESPONDENCE_STATUS_LABEL: Record<CorrespondenceStatus, string> = {
  registered: "Registered",
  sent_accountable: "Sent to Accountable",
  sent_responsible: "Sent to Responsible",
  completed: "Completed",
  obsolete: "Obsolete",
};

export const DOCUMENT_STATUS_LABEL: Record<DocumentStatus, string> = {
  registered: "Registered",
  sent_accountable: "Sent to Accountable",
  sent_responsible: "Sent to Responsible",
  completed: "Completed",
  obsolete: "Obsolete",
};

export const COMMENT_STATUS_LABEL: Record<CommentStatus, string> = {
  open: "Open",
  answered: "Answered",
  closed: "Closed",
};

/** Pill colors for comment-sheet statuses, from the brand palette. */
export const COMMENT_STATUS_META: Record<CommentStatus, { text: string; bg: string }> = {
  open: { text: "#cc7000", bg: "#fff3e0" }, // amber
  answered: { text: "#0069b3", bg: "#e3f3ff" }, // info-blue
  closed: { text: "#1b7a34", bg: "#e6f6ea" }, // green
};

/**
 * A soft, pleasant palette so each anchored comment gets its own recognisable
 * colour on the document — used for the pin marker and its highlight tint.
 * Medium saturation reads clearly as a pin yet stays gentle at low fill-opacity.
 */
export const COMMENT_COLORS = [
  "#6366f1", // indigo
  "#14b8a6", // teal
  "#f59e0b", // amber
  "#ec4899", // pink
  "#8b5cf6", // violet
  "#0ea5e9", // sky
  "#10b981", // emerald
  "#f97316", // orange
] as const;

/** Stable colour for a comment, cycling through the palette by its number. */
export function commentColor(commentNo: number): string {
  const n = COMMENT_COLORS.length;
  return COMMENT_COLORS[(((commentNo - 1) % n) + n) % n];
}

/** Whoever has the ball for a risk's current status. No entry for "resolved" — nothing left to own. */
export const NEXT_STEP_OWNER: Record<string, string> = {
  identified: "Package PM",
  assessed: "Lead Scheduler",
  mitigated: "Quality Manager",
};

/** The single "responsible" party to show where only one avatar fits (Risk Card, Risk Register table). */
export function pickResponsible(role: RoleResponsibility): Party | null {
  return role.responsibleContractor ?? role.responsibleCustomer;
}

export function initials(name: string): string {
  return name
    .split(" ")
    .map((p) => p[0])
    .filter(Boolean)
    .slice(0, 2)
    .join("")
    .toUpperCase();
}
