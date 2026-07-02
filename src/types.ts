import type { Timestamp } from "firebase/firestore";

export type RiskStatus = "identified" | "assessed" | "mitigated" | "resolved";
export type RiskPriority = "low" | "medium" | "high" | "critical";
export type Recurrence = "none" | "daily" | "weekly" | "monthly";

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
  consulted: Party;
  responsibleCustomer: Party | null;
  responsibleContractor: Party | null;
  informedCustomer: Party | null;
  informedContractor: Party | null;
  description: string;
}

export type OrgTier = 1 | 2 | 3;

export interface Organization {
  id: string;
  projectId: string;
  orgId: string;
  name: string;
  tier: OrgTier;
  parentOrgId: string | null;
  contractType: string | null;
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

export interface Risk {
  id: string;
  projectId: string;
  riskId: string; // "RK-001"
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

export interface RiskMessage {
  id: string;
  riskId: string;
  mode: ChatMode;
  role: MessageRole;
  content: string;
  authorUid: string;
  authorName: string;
  authorAvatar?: string;
  reactions?: Record<string, string[]>; // emoji -> uid[]
  timestamp: Timestamp | null;
}
