import type { Timestamp } from "firebase/firestore";
import type { OrgType, RiskPriority, RiskStatus } from "../types";

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
  critical: { label: "Critical", dot: "#F59E0B", text: "#92400E" },
};

export const STATUS_LABEL: Record<RiskStatus, string> = {
  identified: "Identified",
  assessed: "Assessed",
  mitigated: "Mitigated",
  resolved: "Resolved",
};

/** Left-border accent color per organization type for the involved-parties card. */
export function orgAccent(org: OrgType | string): string {
  switch (org) {
    case "Owner":
      return "#0d08d2"; // brand indigo
    case "Main Contractor":
    case "Subcontractor":
      return "#F59E0B"; // orange/amber
    case "Advisor":
      return "#14B8A6"; // teal
    case "Authority":
      return "#A855F7"; // purple
    default:
      return "#9CA3AF";
  }
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
