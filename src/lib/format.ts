import type { Timestamp } from "firebase/firestore";
import type { Party, Risk, RiskKind, RiskPriority, RiskStatus, RoleResponsibility } from "../types";

/** Pre-existing docs have no `kind` field — treat those as plain risks. */
export function riskKind(risk: Pick<Risk, "kind">): RiskKind {
  return risk.kind ?? "risk";
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

// dot/text = small colored dot + adjacent label text-on-white, used in tables
// and cards. Hues match the binding RAG law (KNW-038 §6.2 / lib/rag.ts);
// `text` is a darkened variant of the same hue for readability on white —
// for a solid colored chip/badge use lib/rag.ts's bandChip() instead.
export const PRIORITY_META: Record<
  RiskPriority,
  { label: string; dot: string; text: string }
> = {
  low: { label: "Low", dot: "#27AE60", text: "#1E7E4A" },
  medium: { label: "Medium", dot: "#F39C12", text: "#8A5A08" },
  high: { label: "High", dot: "#C0392B", text: "#8E2C21" },
  critical: { label: "Critical", dot: "#962D22", text: "#6B1F17" },
};

export const STATUS_LABEL: Record<RiskStatus, string> = {
  identified: "Identified",
  assessed: "Assessed",
  mitigated: "Mitigated",
  resolved: "Resolved",
};

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
