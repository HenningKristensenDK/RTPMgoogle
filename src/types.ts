import type { Timestamp } from "firebase/firestore";

export type RiskStatus = "identified" | "assessed" | "mitigated" | "resolved";
export type RiskPriority = "low" | "medium" | "high" | "critical";
export type Recurrence = "none" | "daily" | "weekly" | "monthly";
export type RiskKind = "risk" | "opportunity";

export const RISK_KIND_LABEL: Record<RiskKind, string> = {
  risk: "Risk",
  opportunity: "Opportunity",
};

export const RISK_STATUSES: RiskStatus[] = [
  "identified",
  "assessed",
  "mitigated",
  "resolved",
];

export interface Project {
  id: string;
  name: string;
  description: string;
  createdAt: Timestamp | null;
}

export interface Party {
  name: string;
  organization: string;
  role: string;
}

export interface RoleResponsibility {
  id: string;
  projectId: string;
  workstream: string;
  accountable: Party;
  consulted: Party[];
  responsibleCustomer: Party | null;
  responsibleContractor: Party | null;
  informedCustomer: Party[];
  informedContractor: Party[];
  description: string;
  interactionSummary: string;
}

export interface Organization {
  id: string;
  projectId: string;
  orgId: string;
  name: string;
  tier: number;
  parentOrgId: string | null;
  roleType: string;
}

export interface ChecklistItem {
  id: string;
  text: string;
  completed: boolean;
}

export interface Attachment {
  name: string;
  url: string;
  uploadedBy: string;
  uploadedAt: Timestamp | null;
}

export interface StatusHistoryEntry {
  from: string;
  to: string;
  changedBy: string;
  changedAt: Timestamp | null;
  comment: string;
}

// ---------------------------------------------------------------------------
// Correspondence
// ---------------------------------------------------------------------------
export type CorrespondenceType =
  | "RFI"
  | "TQ"
  | "Meeting Minutes"
  | "Variation Request"
  | "Site Instruction"
  | "Extension of Time"
  | "Inspection Request";

export const CORRESPONDENCE_TYPES: CorrespondenceType[] = [
  "RFI",
  "TQ",
  "Meeting Minutes",
  "Variation Request",
  "Site Instruction",
  "Extension of Time",
  "Inspection Request",
];

export type CorrespondenceStatus =
  | "registered"
  | "sent_accountable"
  | "sent_responsible"
  | "completed"
  | "obsolete";

/** The linear track shown in the status tracker — "obsolete" is a side branch, not a track step. */
export const CORRESPONDENCE_TRACK_STATUSES: CorrespondenceStatus[] = [
  "registered",
  "sent_accountable",
  "sent_responsible",
  "completed",
];

export interface CorrespondenceItem {
  id: string;
  projectId: string;
  itemId: string; // "RFI-001", "TQ-001", ... — per-type counter, see nextCorrespondenceCode()
  type: CorrespondenceType;
  title: string;
  status: CorrespondenceStatus;
  priority: RiskPriority;
  startDate: Timestamp | null;
  dueDate: Timestamp | null;
  workstreamIds: string[];
  checklist: ChecklistItem[];
  notes: string;
  attachments: Attachment[];
  statusHistory: StatusHistoryEntry[];
  createdBy: string;
  createdAt: Timestamp | null;
  updatedAt: Timestamp | null;
}

export interface Risk {
  id: string;
  projectId: string;
  riskId: string; // "RK-001" or "OP-001"
  kind?: RiskKind; // absent on pre-existing docs — treat as "risk", see riskKind() in lib/format.ts
  title: string;
  status: RiskStatus;
  priority: RiskPriority;
  startDate: Timestamp | null;
  dueDate: Timestamp | null;
  recurrence: Recurrence;
  collection?: string;
  workstreamIds: string[];
  checklist: ChecklistItem[];
  notes: string;
  attachments: Attachment[];
  statusHistory: StatusHistoryEntry[];
  createdBy: string;
  createdAt: Timestamp | null;
  updatedAt: Timestamp | null;
}

export type ChatMode = "chat" | "agent";
export type MessageRole = "user" | "assistant" | "system";

/** Shared shape consumed by ChatMessages/ChatInput — lets both Risk and Correspondence chat reuse the same UI. */
export interface BaseMessage {
  id: string;
  role: MessageRole;
  content: string;
  authorUid: string;
  authorName: string;
  authorAvatar?: string;
  images?: string[];
  reactions?: Record<string, string[]>; // emoji -> uid[]
  timestamp: Timestamp | null;
}

export interface RiskMessage extends BaseMessage {
  riskId: string;
  mode: ChatMode;
}

/** Correspondence chat is team-chat only — no `mode`, role is always "user". */
export interface CorrespondenceMessage extends BaseMessage {
  itemId: string;
}

// ---------------------------------------------------------------------------
// Documents
// ---------------------------------------------------------------------------
export type DocumentType =
  | "Drawing"
  | "Plan"
  | "Report"
  | "Method Statement"
  | "Spec"
  | "Certificate";

export const DOCUMENT_TYPES: DocumentType[] = [
  "Drawing",
  "Plan",
  "Report",
  "Method Statement",
  "Spec",
  "Certificate",
];

export type DocumentStatus =
  | "registered"
  | "sent_accountable"
  | "sent_responsible"
  | "completed"
  | "obsolete";

/** The linear track shown in the status tracker — "obsolete" is a side branch, not a track step. */
export const DOCUMENT_TRACK_STATUSES: DocumentStatus[] = [
  "registered",
  "sent_accountable",
  "sent_responsible",
  "completed",
];

export interface DocumentItem {
  id: string;
  projectId: string;
  docId: string; // "DOC-001", see nextDocumentCode()
  title: string;
  type: DocumentType;
  status: DocumentStatus;
  workstreamIds: string[];
  fileUrl: string;
  fileName: string;
  fileType: string; // MIME type — decides PDF/image/fallback rendering in DocumentViewer
  notes: string;
  statusHistory: StatusHistoryEntry[];
  createdBy: string;
  createdAt: Timestamp | null;
  updatedAt: Timestamp | null;
}

/** Document chat is team-chat only — no `mode`, role is always "user". */
export interface DocumentMessage extends BaseMessage {
  documentId: string;
}

/** A pin-drop comment on a rendered document page. Position is a 0..1 fraction of the
 * rendered page's width/height, so it stays correctly placed across resizes without
 * needing to track zoom level. */
export interface DocumentAnnotation {
  id: string;
  documentId: string;
  page: number; // 1 for images (single "page")
  xPct: number;
  yPct: number;
  text: string;
  authorUid: string;
  authorName: string;
  resolved: boolean;
  createdAt: Timestamp | null;
}
