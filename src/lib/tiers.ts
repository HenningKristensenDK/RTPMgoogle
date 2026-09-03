import type { Organization } from "../types";

// Same tier codex used by the OBS diagram, RACI legend, and Risk Register charts.
export const TIER_COLORS: Record<number, string> = {
  0: "#0d08d2",
  1: "#00acff",
  2: "#ff8b00",
  3: "#14B8A6",
};
export const DEFAULT_TIER_COLOR = "#9CA3AF";

export function tierOf(orgs: Organization[], orgName: string): number | undefined {
  return orgs.find((o) => o.name === orgName)?.tier;
}

/** The color for whichever tier an organization name belongs to — falls back to neutral gray if unknown. */
export function tierColor(orgs: Organization[], orgName: string): string {
  const tier = tierOf(orgs, orgName);
  return tier !== undefined ? TIER_COLORS[tier] ?? DEFAULT_TIER_COLOR : DEFAULT_TIER_COLOR;
}
