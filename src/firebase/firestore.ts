import {
  collection,
  doc,
  addDoc,
  updateDoc,
  deleteDoc,
  setDoc,
  getDoc,
  getDocs,
  query,
  where,
  orderBy,
  onSnapshot,
  serverTimestamp,
  Timestamp,
  type QueryConstraint,
  type DocumentData,
} from "firebase/firestore";
import { db } from "./config";
import type {
  Project,
  Risk,
  RiskMessage,
  RoleResponsibility,
  Organization,
  ChatMode,
  RiskStatus,
  StatusHistoryEntry,
} from "../types";

// ---------------------------------------------------------------------------
// Collection references
// ---------------------------------------------------------------------------
const projectsCol = collection(db, "projects");
const rolesCol = collection(db, "roles_and_responsibilities");
const risksCol = collection(db, "risks");
const messagesCol = collection(db, "risk_messages");
const organizationsCol = collection(db, "organizations");

function mapDoc<T>(id: string, data: DocumentData): T {
  return { id, ...data } as T;
}

// ---------------------------------------------------------------------------
// Projects
// ---------------------------------------------------------------------------
export async function listProjects(): Promise<Project[]> {
  const snap = await getDocs(projectsCol);
  return snap.docs.map((d) => mapDoc<Project>(d.id, d.data()));
}

// ---------------------------------------------------------------------------
// Roles & Responsibilities
// ---------------------------------------------------------------------------
export function watchRoles(
  projectId: string,
  cb: (roles: RoleResponsibility[]) => void
) {
  const q = query(rolesCol, where("projectId", "==", projectId));
  return onSnapshot(q, (snap) => {
    cb(snap.docs.map((d) => mapDoc<RoleResponsibility>(d.id, d.data())));
  });
}

export async function listRoles(projectId: string): Promise<RoleResponsibility[]> {
  const q = query(rolesCol, where("projectId", "==", projectId));
  const snap = await getDocs(q);
  return snap.docs.map((d) => mapDoc<RoleResponsibility>(d.id, d.data()));
}

export async function upsertRole(role: Partial<RoleResponsibility>): Promise<string> {
  if (role.id) {
    const { id, ...rest } = role;
    await updateDoc(doc(rolesCol, id), rest as DocumentData);
    return id;
  }
  const ref = await addDoc(rolesCol, role as DocumentData);
  return ref.id;
}

// ---------------------------------------------------------------------------
// Organizations (Org Chart)
// ---------------------------------------------------------------------------
export function watchOrganizations(
  projectId: string,
  cb: (organizations: Organization[]) => void
) {
  const q = query(organizationsCol, where("projectId", "==", projectId));
  return onSnapshot(q, (snap) => {
    cb(snap.docs.map((d) => mapDoc<Organization>(d.id, d.data())));
  });
}

export async function listOrganizations(projectId: string): Promise<Organization[]> {
  const q = query(organizationsCol, where("projectId", "==", projectId));
  const snap = await getDocs(q);
  return snap.docs.map((d) => mapDoc<Organization>(d.id, d.data()));
}

// ---------------------------------------------------------------------------
// Risks
// ---------------------------------------------------------------------------
export function watchRisks(projectId: string, cb: (risks: Risk[]) => void) {
  const constraints: QueryConstraint[] = [
    where("projectId", "==", projectId),
    orderBy("createdAt", "desc"),
  ];
  const q = query(risksCol, ...constraints);
  return onSnapshot(q, (snap) => {
    cb(snap.docs.map((d) => mapDoc<Risk>(d.id, d.data())));
  });
}

export function watchRisk(riskId: string, cb: (risk: Risk | null) => void) {
  return onSnapshot(doc(risksCol, riskId), (snap) => {
    cb(snap.exists() ? mapDoc<Risk>(snap.id, snap.data()) : null);
  });
}

export async function getRisk(riskId: string): Promise<Risk | null> {
  const snap = await getDoc(doc(risksCol, riskId));
  return snap.exists() ? mapDoc<Risk>(snap.id, snap.data()) : null;
}

/** Generate the next sequential human-readable risk id e.g. RK-007. */
export async function nextRiskCode(projectId: string): Promise<string> {
  const q = query(risksCol, where("projectId", "==", projectId));
  const snap = await getDocs(q);
  let max = 0;
  snap.docs.forEach((d) => {
    const code: string = d.data().riskId || "";
    const n = parseInt(code.replace(/^RK-/, ""), 10);
    if (!Number.isNaN(n) && n > max) max = n;
  });
  return `RK-${String(max + 1).padStart(3, "0")}`;
}

export async function createRisk(
  projectId: string,
  createdBy: string,
  partial: Partial<Risk> = {}
): Promise<string> {
  const code = await nextRiskCode(projectId);
  const payload: DocumentData = {
    projectId,
    riskId: code,
    title: partial.title || "Untitled risk",
    status: partial.status || "identified",
    priority: partial.priority || "medium",
    startDate: partial.startDate ?? null,
    dueDate: partial.dueDate ?? null,
    recurrence: partial.recurrence || "none",
    collection: partial.collection || "",
    workstreamIds: partial.workstreamIds || [],
    checklist: partial.checklist || [],
    notes: partial.notes || "",
    attachments: partial.attachments || [],
    statusHistory: partial.statusHistory || [],
    createdBy,
    createdAt: serverTimestamp(),
    updatedAt: serverTimestamp(),
  };
  const ref = await addDoc(risksCol, payload);
  return ref.id;
}

export async function deleteRisk(riskId: string): Promise<void> {
  await deleteDoc(doc(risksCol, riskId));
}

export async function updateRisk(riskId: string, patch: Partial<Risk>): Promise<void> {
  const { id, ...rest } = patch as DocumentData;
  await updateDoc(doc(risksCol, riskId), {
    ...rest,
    updatedAt: serverTimestamp(),
  });
}

export async function changeRiskStatus(
  riskId: string,
  from: RiskStatus,
  to: RiskStatus,
  changedBy: string,
  comment = ""
): Promise<void> {
  const risk = await getRisk(riskId);
  const history: StatusHistoryEntry[] = risk?.statusHistory
    ? [...risk.statusHistory]
    : [];
  history.push({
    from,
    to,
    changedBy,
    changedAt: Timestamp.now(),
    comment,
  });
  await updateDoc(doc(risksCol, riskId), {
    status: to,
    statusHistory: history,
    updatedAt: serverTimestamp(),
  });
}

// ---------------------------------------------------------------------------
// Risk update emails (Send Update modal)
// ---------------------------------------------------------------------------
export async function sendRiskUpdate(payload: {
  riskId: string;
  projectId: string;
  sender: string;
  senderId: string;
  subject: string;
  message: string;
  recipients: string[];
  cc: string[];
}): Promise<void> {
  await addDoc(messagesCol, {
    ...payload,
    timestamp: serverTimestamp(),
    type: "update",
  });
}

// ---------------------------------------------------------------------------
// Risk messages (chat + agent)
// ---------------------------------------------------------------------------
export function watchMessages(
  riskId: string,
  mode: ChatMode,
  cb: (messages: RiskMessage[]) => void
) {
  const q = query(
    messagesCol,
    where("riskId", "==", riskId),
    where("mode", "==", mode),
    orderBy("timestamp", "asc")
  );
  return onSnapshot(q, (snap) => {
    cb(snap.docs.map((d) => mapDoc<RiskMessage>(d.id, d.data())));
  });
}

export async function sendMessage(
  message: Omit<RiskMessage, "id" | "timestamp">
): Promise<string> {
  const ref = await addDoc(messagesCol, {
    ...message,
    timestamp: serverTimestamp(),
  });
  return ref.id;
}

export async function toggleReaction(
  messageId: string,
  emoji: string,
  uid: string,
  current: Record<string, string[]> | undefined
): Promise<void> {
  const reactions: Record<string, string[]> = { ...(current || {}) };
  const list = reactions[emoji] ? [...reactions[emoji]] : [];
  const idx = list.indexOf(uid);
  if (idx >= 0) list.splice(idx, 1);
  else list.push(uid);
  if (list.length) reactions[emoji] = list;
  else delete reactions[emoji];
  await updateDoc(doc(messagesCol, messageId), { reactions });
}

// ---------------------------------------------------------------------------
// Seed helpers (used by client-side first-run seeding)
// ---------------------------------------------------------------------------
export async function isFirestoreEmpty(): Promise<boolean> {
  const snap = await getDocs(query(projectsCol));
  return snap.empty;
}

export async function setProject(id: string, project: Omit<Project, "id">): Promise<void> {
  await setDoc(doc(projectsCol, id), {
    ...project,
    createdAt: project.createdAt ?? serverTimestamp(),
  });
}
