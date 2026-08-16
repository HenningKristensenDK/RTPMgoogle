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
  RiskKind,
  RiskMessage,
  RoleResponsibility,
  Organization,
  ChatMode,
  RiskStatus,
  StatusHistoryEntry,
  CorrespondenceItem,
  CorrespondenceMessage,
  CorrespondenceStatus,
  CorrespondenceType,
  DocumentItem,
  DocumentMessage,
  DocumentStatus,
  DocumentAnnotation,
  DocumentComment,
} from "../types";
import { computeRiskScore, priorityFromScore } from "../lib/riskScoring";

// ---------------------------------------------------------------------------
// Collection references
// ---------------------------------------------------------------------------
const projectsCol = collection(db, "projects");
const rolesCol = collection(db, "roles_and_responsibilities");
const risksCol = collection(db, "risks");
const messagesCol = collection(db, "risk_messages");
const organizationsCol = collection(db, "organizations");
const correspondenceCol = collection(db, "correspondence");
const correspondenceMessagesCol = collection(db, "correspondence_messages");
const documentsCol = collection(db, "documents");
const documentMessagesCol = collection(db, "document_messages");
const documentAnnotationsCol = collection(db, "document_annotations");
const documentCommentsCol = collection(db, "document_comments");

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

const RISK_KIND_PREFIX: Record<RiskKind, string> = {
  risk: "RK-",
  opportunity: "OP-",
};

/** Generate the next sequential human-readable id e.g. RK-007 or OP-003 — each kind has its own counter. */
export async function nextRiskCode(projectId: string, kind: RiskKind = "risk"): Promise<string> {
  const prefix = RISK_KIND_PREFIX[kind];
  const q = query(risksCol, where("projectId", "==", projectId));
  const snap = await getDocs(q);
  let max = 0;
  snap.docs.forEach((d) => {
    const code: string = d.data().riskId || "";
    if (!code.startsWith(prefix)) return;
    const n = parseInt(code.slice(prefix.length), 10);
    if (!Number.isNaN(n) && n > max) max = n;
  });
  return `${prefix}${String(max + 1).padStart(3, "0")}`;
}

export async function createRisk(
  projectId: string,
  createdBy: string,
  partial: Partial<Risk> = {}
): Promise<string> {
  const kind = partial.kind || "risk";
  const code = await nextRiskCode(projectId, kind);
  // Priority is ALWAYS derived from likelihood x impact — never accept a
  // manually-passed priority, even if one sneaks into `partial`.
  const likelihood = partial.likelihood || 3;
  const impactScore = partial.impactScore || 3;
  const score = computeRiskScore(likelihood, impactScore);
  const payload: DocumentData = {
    projectId,
    riskId: code,
    kind,
    title: partial.title || "Untitled risk",
    status: partial.status || "identified",
    likelihood,
    impactScore,
    riskScore: score,
    priority: priorityFromScore(score),
    impactDriver: partial.impactDriver || "Schedule",
    trend: partial.trend || "flat",
    startDate: partial.startDate ?? null,
    dueDate: partial.dueDate ?? null,
    recurrence: partial.recurrence || "none",
    collection: partial.collection || "",
    workstreamIds: partial.workstreamIds || [],
    checklist: partial.checklist || [],
    mitigationPlan: partial.mitigationPlan || "",
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
// Correspondence
// ---------------------------------------------------------------------------
export function watchCorrespondence(
  projectId: string,
  cb: (items: CorrespondenceItem[]) => void
) {
  const q = query(
    correspondenceCol,
    where("projectId", "==", projectId),
    orderBy("createdAt", "desc")
  );
  return onSnapshot(q, (snap) => {
    cb(snap.docs.map((d) => mapDoc<CorrespondenceItem>(d.id, d.data())));
  });
}

export function watchCorrespondenceItem(
  itemId: string,
  cb: (item: CorrespondenceItem | null) => void
) {
  return onSnapshot(doc(correspondenceCol, itemId), (snap) => {
    cb(snap.exists() ? mapDoc<CorrespondenceItem>(snap.id, snap.data()) : null);
  });
}

export async function getCorrespondenceItem(itemId: string): Promise<CorrespondenceItem | null> {
  const snap = await getDoc(doc(correspondenceCol, itemId));
  return snap.exists() ? mapDoc<CorrespondenceItem>(snap.id, snap.data()) : null;
}

const CORRESPONDENCE_TYPE_PREFIX: Record<CorrespondenceType, string> = {
  RFI: "RFI-",
  TQ: "TQ-",
  "Meeting Minutes": "MM-",
  "Variation Request": "VR-",
  "Site Instruction": "SI-",
  "Extension of Time": "EOT-",
  "Inspection Request": "IR-",
};

/** Generate the next sequential id e.g. RFI-007 — each correspondence type has its own counter. */
export async function nextCorrespondenceCode(
  projectId: string,
  type: CorrespondenceType
): Promise<string> {
  const prefix = CORRESPONDENCE_TYPE_PREFIX[type];
  const q = query(correspondenceCol, where("projectId", "==", projectId));
  const snap = await getDocs(q);
  let max = 0;
  snap.docs.forEach((d) => {
    const code: string = d.data().itemId || "";
    if (!code.startsWith(prefix)) return;
    const n = parseInt(code.slice(prefix.length), 10);
    if (!Number.isNaN(n) && n > max) max = n;
  });
  return `${prefix}${String(max + 1).padStart(3, "0")}`;
}

export async function createCorrespondence(
  projectId: string,
  createdBy: string,
  partial: Partial<CorrespondenceItem> = {}
): Promise<string> {
  const type = partial.type || "RFI";
  const code = await nextCorrespondenceCode(projectId, type);
  const payload: DocumentData = {
    projectId,
    itemId: code,
    type,
    title: partial.title || "Untitled item",
    status: partial.status || "registered",
    priority: partial.priority || "medium",
    startDate: partial.startDate ?? null,
    dueDate: partial.dueDate ?? null,
    workstreamIds: partial.workstreamIds || [],
    checklist: partial.checklist || [],
    notes: partial.notes || "",
    attachments: partial.attachments || [],
    statusHistory: partial.statusHistory || [],
    createdBy,
    createdAt: serverTimestamp(),
    updatedAt: serverTimestamp(),
  };
  const ref = await addDoc(correspondenceCol, payload);
  return ref.id;
}

export async function deleteCorrespondence(itemId: string): Promise<void> {
  await deleteDoc(doc(correspondenceCol, itemId));
}

export async function updateCorrespondence(
  itemId: string,
  patch: Partial<CorrespondenceItem>
): Promise<void> {
  const { id, ...rest } = patch as DocumentData;
  await updateDoc(doc(correspondenceCol, itemId), {
    ...rest,
    updatedAt: serverTimestamp(),
  });
}

export async function changeCorrespondenceStatus(
  itemId: string,
  from: CorrespondenceStatus,
  to: CorrespondenceStatus,
  changedBy: string,
  comment = ""
): Promise<void> {
  const item = await getCorrespondenceItem(itemId);
  const history: StatusHistoryEntry[] = item?.statusHistory
    ? [...item.statusHistory]
    : [];
  history.push({
    from,
    to,
    changedBy,
    changedAt: Timestamp.now(),
    comment,
  });
  await updateDoc(doc(correspondenceCol, itemId), {
    status: to,
    statusHistory: history,
    updatedAt: serverTimestamp(),
  });
}

// ---------------------------------------------------------------------------
// Correspondence messages (team chat only — no AI agent mode)
// ---------------------------------------------------------------------------
export function watchCorrespondenceMessages(
  itemId: string,
  cb: (messages: CorrespondenceMessage[]) => void
) {
  const q = query(
    correspondenceMessagesCol,
    where("itemId", "==", itemId),
    orderBy("timestamp", "asc")
  );
  return onSnapshot(q, (snap) => {
    cb(snap.docs.map((d) => mapDoc<CorrespondenceMessage>(d.id, d.data())));
  });
}

export async function sendCorrespondenceMessage(
  message: Omit<CorrespondenceMessage, "id" | "timestamp">
): Promise<string> {
  const ref = await addDoc(correspondenceMessagesCol, {
    ...message,
    timestamp: serverTimestamp(),
  });
  return ref.id;
}

export async function toggleCorrespondenceReaction(
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
  await updateDoc(doc(correspondenceMessagesCol, messageId), { reactions });
}

// ---------------------------------------------------------------------------
// Documents
// ---------------------------------------------------------------------------
export function watchDocuments(
  projectId: string,
  cb: (items: DocumentItem[]) => void
) {
  const q = query(
    documentsCol,
    where("projectId", "==", projectId),
    orderBy("createdAt", "desc")
  );
  return onSnapshot(q, (snap) => {
    cb(snap.docs.map((d) => mapDoc<DocumentItem>(d.id, d.data())));
  });
}

export function watchDocumentItem(
  documentId: string,
  cb: (item: DocumentItem | null) => void
) {
  return onSnapshot(doc(documentsCol, documentId), (snap) => {
    cb(snap.exists() ? mapDoc<DocumentItem>(snap.id, snap.data()) : null);
  });
}

export async function getDocumentItem(documentId: string): Promise<DocumentItem | null> {
  const snap = await getDoc(doc(documentsCol, documentId));
  return snap.exists() ? mapDoc<DocumentItem>(snap.id, snap.data()) : null;
}

const DOCUMENT_ID_PREFIX = "DOC-";

/** Generate the next sequential id e.g. DOC-007 — single shared counter across all document types. */
export async function nextDocumentCode(projectId: string): Promise<string> {
  const q = query(documentsCol, where("projectId", "==", projectId));
  const snap = await getDocs(q);
  let max = 0;
  snap.docs.forEach((d) => {
    const code: string = d.data().docId || "";
    if (!code.startsWith(DOCUMENT_ID_PREFIX)) return;
    const n = parseInt(code.slice(DOCUMENT_ID_PREFIX.length), 10);
    if (!Number.isNaN(n) && n > max) max = n;
  });
  return `${DOCUMENT_ID_PREFIX}${String(max + 1).padStart(3, "0")}`;
}

export async function createDocumentItem(
  projectId: string,
  createdBy: string,
  partial: Partial<DocumentItem> = {}
): Promise<string> {
  const code = await nextDocumentCode(projectId);
  const payload: DocumentData = {
    projectId,
    docId: code,
    title: partial.title || "Untitled document",
    type: partial.type || "Drawing",
    status: partial.status || "registered",
    workstreamIds: partial.workstreamIds || [],
    fileUrl: partial.fileUrl || "",
    fileName: partial.fileName || "",
    fileType: partial.fileType || "",
    notes: partial.notes || "",
    statusHistory: partial.statusHistory || [],
    createdBy,
    createdAt: serverTimestamp(),
    updatedAt: serverTimestamp(),
  };
  const ref = await addDoc(documentsCol, payload);
  return ref.id;
}

export async function deleteDocumentItem(documentId: string): Promise<void> {
  await deleteDoc(doc(documentsCol, documentId));
}

export async function updateDocumentItem(
  documentId: string,
  patch: Partial<DocumentItem>
): Promise<void> {
  const { id, ...rest } = patch as DocumentData;
  await updateDoc(doc(documentsCol, documentId), {
    ...rest,
    updatedAt: serverTimestamp(),
  });
}

export async function changeDocumentStatus(
  documentId: string,
  from: DocumentStatus,
  to: DocumentStatus,
  changedBy: string,
  comment = ""
): Promise<void> {
  const item = await getDocumentItem(documentId);
  const history: StatusHistoryEntry[] = item?.statusHistory
    ? [...item.statusHistory]
    : [];
  history.push({
    from,
    to,
    changedBy,
    changedAt: Timestamp.now(),
    comment,
  });
  await updateDoc(doc(documentsCol, documentId), {
    status: to,
    statusHistory: history,
    updatedAt: serverTimestamp(),
  });
}

// ---------------------------------------------------------------------------
// Document messages (team chat only — no AI agent mode)
// ---------------------------------------------------------------------------
export function watchDocumentMessages(
  documentId: string,
  cb: (messages: DocumentMessage[]) => void
) {
  const q = query(
    documentMessagesCol,
    where("documentId", "==", documentId),
    orderBy("timestamp", "asc")
  );
  return onSnapshot(q, (snap) => {
    cb(snap.docs.map((d) => mapDoc<DocumentMessage>(d.id, d.data())));
  });
}

export async function sendDocumentMessage(
  message: Omit<DocumentMessage, "id" | "timestamp">
): Promise<string> {
  const ref = await addDoc(documentMessagesCol, {
    ...message,
    timestamp: serverTimestamp(),
  });
  return ref.id;
}

export async function toggleDocumentMessageReaction(
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
  await updateDoc(doc(documentMessagesCol, messageId), { reactions });
}

// ---------------------------------------------------------------------------
// Document annotations (pin-drop comments on rendered PDF/image pages)
// ---------------------------------------------------------------------------
export function watchDocumentAnnotations(
  documentId: string,
  cb: (annotations: DocumentAnnotation[]) => void
) {
  // Queried by documentId only (no orderBy) so no composite index is needed —
  // sort client-side by page then createdAt instead.
  const q = query(documentAnnotationsCol, where("documentId", "==", documentId));
  return onSnapshot(q, (snap) => {
    const items = snap.docs.map((d) => mapDoc<DocumentAnnotation>(d.id, d.data()));
    items.sort((a, b) => {
      if (a.page !== b.page) return a.page - b.page;
      const at = a.createdAt?.toMillis() ?? 0;
      const bt = b.createdAt?.toMillis() ?? 0;
      return at - bt;
    });
    cb(items);
  });
}

export async function addDocumentAnnotation(
  annotation: Omit<DocumentAnnotation, "id" | "createdAt">
): Promise<string> {
  const ref = await addDoc(documentAnnotationsCol, {
    ...annotation,
    createdAt: serverTimestamp(),
  });
  return ref.id;
}

export async function updateDocumentAnnotation(
  annotationId: string,
  patch: Partial<DocumentAnnotation>
): Promise<void> {
  const { id, ...rest } = patch as DocumentData;
  await updateDoc(doc(documentAnnotationsCol, annotationId), rest);
}

export async function deleteDocumentAnnotation(annotationId: string): Promise<void> {
  await deleteDoc(doc(documentAnnotationsCol, annotationId));
}

// ---------------------------------------------------------------------------
// Document comment sheet (formal per-document review register)
// ---------------------------------------------------------------------------
export function watchDocumentComments(
  documentId: string,
  cb: (comments: DocumentComment[]) => void
) {
  // Queried by documentId only (no orderBy) so no composite index is needed —
  // sort client-side by commentNo instead.
  const q = query(documentCommentsCol, where("documentId", "==", documentId));
  return onSnapshot(q, (snap) => {
    const items = snap.docs.map((d) => mapDoc<DocumentComment>(d.id, d.data()));
    items.sort((a, b) => a.commentNo - b.commentNo);
    cb(items);
  });
}

/** Next per-document sequential comment number (1, 2, 3…). */
export async function nextCommentNo(documentId: string): Promise<number> {
  const q = query(documentCommentsCol, where("documentId", "==", documentId));
  const snap = await getDocs(q);
  let max = 0;
  snap.docs.forEach((d) => {
    const n: number = d.data().commentNo || 0;
    if (n > max) max = n;
  });
  return max + 1;
}

export async function addDocumentComment(
  comment: Omit<DocumentComment, "id" | "createdAt" | "updatedAt">
): Promise<string> {
  const ref = await addDoc(documentCommentsCol, {
    ...comment,
    createdAt: serverTimestamp(),
    updatedAt: serverTimestamp(),
  });
  return ref.id;
}

export async function updateDocumentComment(
  commentId: string,
  patch: Partial<DocumentComment>
): Promise<void> {
  const { id, ...rest } = patch as DocumentData;
  await updateDoc(doc(documentCommentsCol, commentId), {
    ...rest,
    updatedAt: serverTimestamp(),
  });
}

export async function deleteDocumentComment(commentId: string): Promise<void> {
  await deleteDoc(doc(documentCommentsCol, commentId));
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
