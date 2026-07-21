// Illustrative dashboard data for modules RTPM hasn't built yet (Documents,
// Correspondence, Change Management, Decisions/Approvals) plus a few
// executive-summary figures (Project Health, Schedule Confidence) that would
// normally roll up from real project data once those modules exist. None of
// this is read from Firestore — it exists purely so the dashboard demos as a
// full project-control cockpit rather than a risk-only view. Risk-derived
// widgets (Critical Risks, the risk matrix, Top Critical Risks, Ownership
// Hotspots, Recent Activity) are computed from real data in Dashboard.tsx.

export const PROJECT_HEALTH = {
  label: "Amber",
  subtext: "3 areas need attention",
  color: "#ff8b00",
};

export const MY_TODO_MOCK = {
  open: 17,
  overdue: 5,
};

export const SCHEDULE_CONFIDENCE_MOCK = {
  pct: 72,
  subtext: "Next milestone at risk",
};

export const OPEN_DECISIONS_MOCK = {
  pending: 9,
  overdue: 3,
};

export const DOCUMENTS_WAITING_MOCK = {
  waiting: 34,
  overdue: 8,
};

export const CORRESPONDENCE_WAITING_MOCK = {
  waiting: 12,
  subtext: "replies due",
};

export const CHANGE_EXPOSURE_MOCK = {
  count: 6,
  subtext: "€4.8m exposure under review",
};

export const MY_TODO_PREVIEW_MOCK = [
  { type: "Document", title: "Review civil method statement Rev B", priority: "medium" as const, due: "Tomorrow" },
  { type: "Correspondence", title: "Reply to contractor on access constraint", priority: "high" as const, due: "Today" },
  { type: "Change", title: "Review cost impact for CHG-006", priority: "medium" as const, due: "12 Aug" },
];
