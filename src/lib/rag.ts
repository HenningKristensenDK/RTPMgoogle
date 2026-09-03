import type { RiskPriority } from "../types";

// RTPM binding RAG law — KNW-038 "Universal brand color, font and logo
// system" §6.2, sourced from 023 Concept Requirements v2.0. This supersedes
// the older #28a745/#ff8b00/#e63946 palette seen elsewhere in this app
// (that pre-dates KNW-038 and hasn't been migrated yet — out of scope for
// this pass, which only touches risk scoring's own visualization).
export const RAG_GREEN = "#27AE60";
export const RAG_AMBER = "#F39C12";
export const RAG_RED = "#C0392B";
// Critical is the same "red" semantic zone as High, intensified — not an
// unauthorized 4th hue, per KNW-038's binding 3-state RAG table.
export const RAG_RED_CRITICAL = "#962D22";

export const RAG_TEXT_ON_GREEN = "#ffffff";
export const RAG_TEXT_ON_AMBER = "#000000";
export const RAG_TEXT_ON_RED = "#ffffff";

/** Solid bg + contrasting text for a priority band, per the binding RAG table. */
export function bandChip(band: RiskPriority): { bg: string; text: string } {
  switch (band) {
    case "low":
      return { bg: RAG_GREEN, text: RAG_TEXT_ON_GREEN };
    case "medium":
      return { bg: RAG_AMBER, text: RAG_TEXT_ON_AMBER };
    case "high":
      return { bg: RAG_RED, text: RAG_TEXT_ON_RED };
    case "critical":
      return { bg: RAG_RED_CRITICAL, text: RAG_TEXT_ON_RED };
  }
}
