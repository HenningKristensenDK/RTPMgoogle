import type { Timestamp } from "firebase/firestore";

export type RiskStatus = "identified" | "assessed" | "mitigated" | "resolved";
export type RiskPriority = "low" | "medium" | "high" | "critical";
export type Recurrence = "none" | "daily" | "weekly" | "monthly";
export type RiskKind = "risk" | "opportunity";
export type RiskImpactDriver = "Cost" | "Schedule" | "Safety" | "Quality";
export type RiskTrend = "up" | "flat" | "down";

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
  priority: RiskPriority; // ALWAYS derived from riskScore — never set this directly, see lib/riskScoring.ts
  likelihood: number; // 1-5
  impactScore: number; // 1-5
  impactDriver: RiskImpactDriver;
  riskScore: number; // likelihood * impactScore, 1-25
  trend: RiskTrend;
  startDate: Timestamp | null;
  dueDate: Timestamp | null;
  recurrence: Recurrence;
  collection?: string;
  workstreamIds: string[];
  checklist: ChecklistItem[];
  mitigationPlan: string;
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

export type AnnotationKind = "comment" | "highlight" | "arrow" | "rectangle";

/** A markup on a rendered document page. Position(s) are 0..1 fractions of the
 * rendered page's width/height, so they stay correctly placed across resizes
 * without needing to track zoom level. */
export interface DocumentAnnotation {
  id: string;
  documentId: string;
  page: number; // 1 for images (single "page")
  /** Absent on documents predating this field — treat as "comment", see effectiveKind() in lib/format.ts. */
  kind?: AnnotationKind;
  xPct: number; // comment: pin position. highlight/rectangle: top-left. arrow: start point.
  yPct: number;
  x2Pct?: number; // arrow: end point. highlight/rectangle: bottom-right. unused for comment.
  y2Pct?: number;
  /** Required (non-empty) for "comment"; optional (may be "") for shape kinds. */
  text: string;
  authorUid: string;
  authorName: string;
  resolved: boolean;
  createdAt: Timestamp | null;
}

// ---------------------------------------------------------------------------
// Document Comment Sheet (formal per-document review register)
// ---------------------------------------------------------------------------
export type CommentStatus = "open" | "answered" | "closed";
export const COMMENT_STATUSES: CommentStatus[] = ["open", "answered", "closed"];

/** Whether the contractor actually changed the document in response — "" = not yet decided. */
export type IncorporatedFlag = "yes" | "no" | "";

/** One entry in a comment's back-and-forth thread (after the original comment). */
/** commenter = customer/reviewer who raised it; responder = assigned contractor;
 * participant = someone else on the project @-tagged into the thread to weigh in. */
export type CommentRole = "commenter" | "responder" | "participant";

export interface CommentReply {
  id: string;
  role: CommentRole;
  authorUid: string;
  authorName: string;
  text: string;
  createdAt: Timestamp | null;
}

/** Where on the document a comment points, so it can be shown/jumped-to in the viewer.
 * Coords are 0..1 fractions of the rendered page — zoom/scroll independent. */
export interface CommentAnchor {
  page: number; // 1-based PDF page (1 for images)
  xPct: number; // top-left of the anchored region
  yPct: number;
  x2Pct?: number; // bottom-right — present for a rect/area/text-highlight anchor
  y2Pct?: number;
}

export interface DocumentComment {
  id: string;
  documentId: string;
  projectId: string;
  commentNo: number; // sequential per document: 1, 2, 3…
  workstreamId: string; // links to a role/workstream ("" if none)
  section: string; // free text — "3.3", "GENERAL", etc.
  page: string; // free text — real sheets mix "6" and "GENERAL"
  // Commenter raises it (customer/reviewer). Responder must answer (contractor).
  commenterUid: string;
  commenterName: string;
  responderName: string; // display name of the assigned responder (defaults from R&R)
  text: string; // the original comment (commenter's)
  replies: CommentReply[]; // multi-party thread after the original
  /** Extra project people @-tagged into the thread (beyond commenter/responder) who may then reply. */
  participants?: Party[];
  status: CommentStatus;
  incorporated: IncorporatedFlag;
  /** Set when the comment was raised from the viewer — lets it show as a marker on the page. */
  anchor?: CommentAnchor;
  createdAt: Timestamp | null;
  updatedAt: Timestamp | null;
}
