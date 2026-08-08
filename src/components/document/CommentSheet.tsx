import { useEffect, useMemo, useRef, useState } from "react";
import { Timestamp } from "firebase/firestore";
import { X, Plus, Download, Trash2, Send, MapPin, AtSign, Lock } from "lucide-react";
import {
  COMMENT_STATUSES,
  type CommentReply,
  type CommentRole,
  type CommentStatus,
  type DocumentComment,
  type DocumentItem,
  type IncorporatedFlag,
  type Party,
  type RoleResponsibility,
} from "../../types";
import {
  watchDocumentComments,
  nextCommentNo,
  addDocumentComment,
  updateDocumentComment,
  deleteDocumentComment,
} from "../../firebase/firestore";
import { COMMENT_STATUS_LABEL, COMMENT_STATUS_META, formatTime, raciPeople, resolveMyRole } from "../../lib/format";
import { commentsToCsv, downloadCsv } from "../../lib/commentCsv";
import { toast } from "../../lib/toast";
import NewCommentModal from "./NewCommentModal";

interface Props {
  item: DocumentItem;
  roles: RoleResponsibility[];
  currentUid: string;
  currentName: string;
  /** When opened from a marker click, pre-select this comment. */
  initialSelectedId?: string | null;
  /** "Locate in PDF" on an anchored row — jump the viewer to the comment. */
  onJumpToAnchor?: (comment: DocumentComment) => void;
  onClose: () => void;
}

function StatusPill({ status }: { status: CommentStatus }) {
  const meta = COMMENT_STATUS_META[status];
  return (
    <span
      className="rounded-full px-2 py-0.5 text-[11px] font-semibold"
      style={{ color: meta.text, background: meta.bg }}
    >
      {COMMENT_STATUS_LABEL[status]}
    </span>
  );
}

export default function CommentSheet({ item, roles, currentUid, currentName, initialSelectedId, onJumpToAnchor, onClose }: Props) {
  const [comments, setComments] = useState<DocumentComment[]>([]);
  const [selectedId, setSelectedId] = useState<string | null>(initialSelectedId ?? null);
  const [newOpen, setNewOpen] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState<DocumentComment | null>(null);

  useEffect(() => {
    return watchDocumentComments(item.id, setComments);
  }, [item.id]);

  const selected = useMemo(
    () => comments.find((c) => c.id === selectedId) ?? null,
    [comments, selectedId]
  );

  const openCount = comments.filter((c) => c.status !== "closed").length;

  async function handleCreate(data: {
    workstreamId: string;
    section: string;
    page: string;
    responderName: string;
    text: string;
  }) {
    try {
      const no = await nextCommentNo(item.id);
      const id = await addDocumentComment({
        documentId: item.id,
        projectId: item.projectId,
        commentNo: no,
        workstreamId: data.workstreamId,
        section: data.section,
        page: data.page,
        commenterUid: currentUid,
        commenterName: currentName,
        responderName: data.responderName,
        text: data.text,
        replies: [],
        status: "open",
        incorporated: "",
      });
      setNewOpen(false);
      setSelectedId(id);
    } catch {
      toast.error("Could not add comment");
    }
  }

  async function handleDelete() {
    if (!deleteTarget) return;
    try {
      await deleteDocumentComment(deleteTarget.id);
      if (selectedId === deleteTarget.id) setSelectedId(null);
      setDeleteTarget(null);
    } catch {
      toast.error("Could not delete comment");
    }
  }

  function handleExport() {
    if (comments.length === 0) {
      toast.info("No comments to export yet");
      return;
    }
    const safeName = item.title.replace(/[^\w.-]+/g, "_");
    downloadCsv(`${item.docId}_${safeName}_comments.csv`, commentsToCsv(comments));
  }

  return (
    <div
      className="fixed inset-0 z-[55] flex items-center justify-center p-6"
      style={{ background: "rgba(7, 4, 116, 0.5)" }}
      onClick={(e) => e.target === e.currentTarget && onClose()}
    >
      <div className="flex h-[94vh] w-[97vw] max-w-[1800px] flex-col overflow-hidden rounded-2xl bg-white shadow-2xl">
        {/* Header */}
        <div className="flex items-center justify-between border-b border-bordergray px-6 py-3">
          <div>
            <h2 className="text-[15px] font-semibold text-ink">Comment Sheet</h2>
            <p className="text-[12px] text-gray-400">
              {item.docId} — {item.title} · {comments.length} comment
              {comments.length === 1 ? "" : "s"} ({openCount} open)
            </p>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={() => setNewOpen(true)}
              className="flex items-center gap-1.5 rounded-btn bg-indigo px-3 py-1.5 text-sm font-semibold text-white hover:bg-indigo/90"
            >
              <Plus size={15} /> New comment
            </button>
            <button
              onClick={handleExport}
              className="flex items-center gap-1.5 rounded-btn border border-bordergray px-3 py-1.5 text-sm text-gray-600 hover:bg-gray-50"
            >
              <Download size={15} /> Export CSV
            </button>
            <button
              onClick={onClose}
              title="Close"
              className="flex h-8 w-8 items-center justify-center rounded border border-bordergray text-gray-500 hover:bg-gray-50 hover:text-critical"
            >
              <X size={16} />
            </button>
          </div>
        </div>

        {/* Body — table + thread */}
        <div className="flex min-h-0 flex-1">
          {/* Table */}
          <div className="scroll-thin min-w-0 flex-[1.4] overflow-auto border-r border-bordergray">
            <table className="w-full text-left text-sm">
              <thead className="sticky top-0 bg-gray-50 text-[11px] uppercase tracking-wide text-gray-400">
                <tr>
                  <th className="px-3 py-2.5">No.</th>
                  <th className="px-3 py-2.5">Section</th>
                  <th className="px-3 py-2.5">Page</th>
                  <th className="px-3 py-2.5">Commenter</th>
                  <th className="px-3 py-2.5">Comment</th>
                  <th className="px-3 py-2.5">Responder</th>
                  <th className="px-3 py-2.5">Status</th>
                  <th className="px-3 py-2.5">Incorp.</th>
                  <th className="px-3 py-2.5"></th>
                </tr>
              </thead>
              <tbody>
                {comments.map((c) => (
                  <tr
                    key={c.id}
                    onClick={() => setSelectedId(c.id)}
                    className={`cursor-pointer border-t border-bordergray hover:bg-gray-50 ${
                      selectedId === c.id ? "bg-indigo/5" : ""
                    }`}
                  >
                    <td className="px-3 py-2.5 font-mono text-[12px] text-gray-500">{c.commentNo}</td>
                    <td className="px-3 py-2.5 text-gray-600">{c.section || "—"}</td>
                    <td className="px-3 py-2.5 text-gray-600">{c.page || "—"}</td>
                    <td className="px-3 py-2.5 text-gray-600">{c.commenterName}</td>
                    <td className="max-w-[280px] truncate px-3 py-2.5 text-ink">{c.text}</td>
                    <td className="px-3 py-2.5 text-gray-600">{c.responderName || "—"}</td>
                    <td className="px-3 py-2.5">
                      <StatusPill status={c.status} />
                    </td>
                    <td className="px-3 py-2.5 text-gray-500">
                      {c.incorporated ? c.incorporated : "—"}
                    </td>
                    <td className="px-3 py-2.5 text-right">
                      <div className="flex items-center justify-end gap-0.5">
                        {c.anchor && onJumpToAnchor && (
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              onJumpToAnchor(c);
                            }}
                            title="Locate in document"
                            className="rounded-btn p-1.5 text-gray-400 hover:bg-indigo/5 hover:text-indigo"
                          >
                            <MapPin size={14} />
                          </button>
                        )}
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            setDeleteTarget(c);
                          }}
                          title="Delete comment"
                          className="rounded-btn p-1.5 text-gray-400 hover:bg-red-50 hover:text-critical"
                        >
                          <Trash2 size={14} />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
                {comments.length === 0 && (
                  <tr>
                    <td colSpan={9} className="px-3 py-10 text-center text-gray-300">
                      No comments yet. Add the first review comment.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>

          {/* Thread pane */}
          <div className="min-w-0 flex-1">
            {selected ? (
              <CommentThread key={selected.id} comment={selected} roles={roles} currentUid={currentUid} currentName={currentName} />
            ) : (
              <div className="flex h-full items-center justify-center px-6 text-center text-sm text-gray-400">
                Select a comment to view and respond to its thread.
              </div>
            )}
          </div>
        </div>
      </div>

      {newOpen && (
        <NewCommentModal
          roles={roles}
          commenterName={currentName}
          onCreate={handleCreate}
          onCancel={() => setNewOpen(false)}
        />
      )}

      {deleteTarget && (
        <div
          className="fixed inset-0 z-[60] flex items-center justify-center bg-black/30"
          onClick={(e) => e.target === e.currentTarget && setDeleteTarget(null)}
        >
          <div className="w-[320px] rounded-card bg-white p-5 shadow-panel">
            <p className="text-sm font-semibold text-ink">Delete comment?</p>
            <p className="mt-1 text-sm text-gray-500">
              Comment <span className="font-medium text-ink">#{deleteTarget.commentNo}</span> and
              its thread will be permanently deleted.
            </p>
            <div className="mt-4 flex justify-end gap-2">
              <button
                onClick={() => setDeleteTarget(null)}
                className="rounded-btn border border-bordergray px-3 py-1.5 text-sm text-gray-600 hover:bg-gray-50"
              >
                Cancel
              </button>
              <button
                onClick={handleDelete}
                className="rounded-btn bg-critical px-3 py-1.5 text-sm font-semibold text-white hover:opacity-90"
              >
                Delete
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

// ---------------------------------------------------------------------------
// Thread pane for the selected comment — a multi-party chat
// ---------------------------------------------------------------------------
const ROLE_CHIP: Record<CommentRole, { label: string; style: React.CSSProperties }> = {
  commenter: { label: "Commenter", style: { background: "#e7e6fa", color: "#0d08d2" } },
  responder: { label: "Responder", style: { background: "#fff3e0", color: "#cc7000" } },
  participant: { label: "Participant", style: { background: "#ede9fe", color: "#6d28d9" } },
};

function RoleChip({ role }: { role: CommentRole }) {
  const m = ROLE_CHIP[role];
  return (
    <span className="rounded-full px-1.5 py-px text-[9px] font-bold uppercase" style={m.style}>
      {m.label}
    </span>
  );
}

function CommentThread({
  comment,
  roles,
  currentUid,
  currentName,
}: {
  comment: DocumentComment;
  roles: RoleResponsibility[];
  currentUid: string;
  currentName: string;
}) {
  const [replyText, setReplyText] = useState("");
  const [sending, setSending] = useState(false);
  const [mentionOpen, setMentionOpen] = useState(false);
  const [mentionQuery, setMentionQuery] = useState("");
  const taRef = useRef<HTMLTextAreaElement>(null);

  // The signed-in user's fixed role on this comment — never a free choice.
  const myRole = resolveMyRole(comment, currentUid, currentName);
  const canPost = myRole !== null;
  const canTag = myRole === "commenter" || myRole === "responder";

  const participants = comment.participants ?? [];

  // People who could still be tagged: the workstream's RACI, minus those already involved.
  const involvedNames = useMemo(
    () => new Set([comment.commenterName, comment.responderName, ...participants.map((p) => p.name)]),
    [comment.commenterName, comment.responderName, participants]
  );
  const taggable = useMemo(
    () => raciPeople(roles, comment.workstreamId).filter((p) => !involvedNames.has(p.name)),
    [roles, comment.workstreamId, involvedNames]
  );
  const mentionMatches = useMemo(() => {
    const q = mentionQuery.trim().toLowerCase();
    return (q ? taggable.filter((p) => p.name.toLowerCase().includes(q)) : taggable).slice(0, 6);
  }, [taggable, mentionQuery]);

  async function tagPerson(p: Party, opts: { fromMention?: boolean } = {}) {
    if (involvedNames.has(p.name)) return;
    try {
      await updateDocumentComment(comment.id, { participants: [...participants, p] });
      if (opts.fromMention) {
        // Replace the trailing "@query" with the chosen name.
        setReplyText((t) => t.replace(/@(\w*)$/, `@${p.name} `));
      } else {
        setReplyText((t) => (t ? `${t} @${p.name} ` : `@${p.name} `));
      }
      toast.success(`${p.name} tagged`);
    } catch {
      toast.error("Could not tag");
    } finally {
      setMentionOpen(false);
      setMentionQuery("");
      taRef.current?.focus();
    }
  }

  function onReplyChange(e: React.ChangeEvent<HTMLTextAreaElement>) {
    const v = e.target.value;
    setReplyText(v);
    // Open the mention picker while typing an "@word" at the caret (tagging only).
    const upToCaret = v.slice(0, e.target.selectionStart ?? v.length);
    const m = /(?:^|\s)@(\w*)$/.exec(upToCaret);
    if (canTag && m) {
      setMentionQuery(m[1]);
      setMentionOpen(true);
    } else {
      setMentionOpen(false);
    }
  }

  async function sendReply() {
    const text = replyText.trim();
    if (!text || !myRole) return;
    setSending(true);
    const reply: CommentReply = {
      id: `r-${Date.now()}`,
      role: myRole,
      authorUid: currentUid,
      authorName: currentName,
      text,
      // Client-side Timestamp — serverTimestamp() sentinels aren't allowed inside array elements.
      createdAt: Timestamp.now(),
    };
    try {
      const nextReplies = [...(comment.replies || []), reply];
      // A responder answering moves an open comment to "answered".
      const nextStatus =
        myRole === "responder" && comment.status === "open" ? "answered" : comment.status;
      await updateDocumentComment(comment.id, { replies: nextReplies, status: nextStatus });
      setReplyText("");
      setMentionOpen(false);
    } catch {
      toast.error("Could not post reply");
    } finally {
      setSending(false);
    }
  }

  async function setStatus(status: CommentStatus) {
    if (status === comment.status) return;
    try {
      await updateDocumentComment(comment.id, { status });
    } catch {
      toast.error("Could not update status");
    }
  }

  async function setIncorporated(flag: IncorporatedFlag) {
    try {
      await updateDocumentComment(comment.id, { incorporated: flag });
    } catch {
      toast.error("Could not update");
    }
  }

  return (
    <div className="flex h-full flex-col">
      {/* Thread header */}
      <div className="border-b border-bordergray px-5 py-3">
        <div className="flex items-center justify-between">
          <span className="text-[13px] font-semibold text-ink">Comment #{comment.commentNo}</span>
          <StatusPill status={comment.status} />
        </div>
        <p className="mt-0.5 text-[11px] text-gray-400">
          {comment.section && `Section ${comment.section} · `}
          {comment.page && `Page ${comment.page} · `}
          {comment.commenterName} → {comment.responderName || "unassigned"}
        </p>
        {participants.length > 0 && (
          <div className="mt-1.5 flex flex-wrap items-center gap-1">
            <span className="text-[10px] font-semibold uppercase text-gray-400">Tagged:</span>
            {participants.map((p) => (
              <span
                key={p.name}
                className="rounded-full px-1.5 py-px text-[10px] font-medium"
                style={{ background: "#ede9fe", color: "#6d28d9" }}
                title={`${p.role} — ${p.organization}`}
              >
                @{p.name}
              </span>
            ))}
          </div>
        )}
      </div>

      {/* Messages */}
      <div className="scroll-thin flex-1 overflow-auto px-5 py-4">
        {/* Original comment */}
        <div className="mb-3">
          <div className="mb-1 flex items-center gap-2">
            <RoleChip role="commenter" />
            <span className="text-[11px] font-medium text-gray-600">{comment.commenterName}</span>
          </div>
          <div className="rounded-card border border-bordergray bg-fog px-3 py-2 text-[13px] text-ink">
            {comment.text}
          </div>
        </div>

        {/* Replies */}
        {(comment.replies || []).map((r) => (
          <div key={r.id} className={`mb-3 ${r.role !== "commenter" ? "pl-6" : ""}`}>
            <div className="mb-1 flex items-center gap-2">
              <RoleChip role={r.role} />
              <span className="text-[11px] font-medium text-gray-600">{r.authorName}</span>
              {r.createdAt && (
                <span className="text-[10px] text-gray-400">{formatTime(r.createdAt)}</span>
              )}
            </div>
            <div
              className="rounded-card px-3 py-2 text-[13px] text-ink"
              style={
                r.role === "responder"
                  ? { background: "#fff8ef" }
                  : r.role === "participant"
                  ? { background: "#f5f3ff" }
                  : { background: "#fff", border: "1px solid #e6e6f0" }
              }
            >
              {r.text}
            </div>
          </div>
        ))}
      </div>

      {/* Controls */}
      <div className="border-t border-bordergray px-5 py-3">
        {/* Reply composer — role is fixed by who's signed in; non-participants can't post */}
        {canPost ? (
          <div className="mb-3">
            <div className="mb-1.5 flex items-center justify-between text-[11px]">
              <span className="flex items-center gap-1.5 text-gray-400">
                Posting as <RoleChip role={myRole} />
                <span className="font-medium text-gray-600">{currentName}</span>
              </span>
              {canTag && (
                <span className="flex items-center gap-1 text-gray-400">
                  <AtSign size={11} /> type @ to tag someone
                </span>
              )}
            </div>
            <div className="relative flex items-end gap-2">
              {/* Mention picker */}
              {mentionOpen && mentionMatches.length > 0 && (
                <div className="absolute bottom-full left-0 z-10 mb-1 w-64 overflow-hidden rounded-card border border-bordergray bg-white shadow-panel">
                  <p className="border-b border-bordergray px-3 py-1.5 text-[10px] font-semibold uppercase text-gray-400">
                    Tag from RACI
                  </p>
                  {mentionMatches.map((p) => (
                    <button
                      key={p.name}
                      onClick={() => tagPerson(p, { fromMention: true })}
                      className="flex w-full flex-col items-start px-3 py-1.5 text-left hover:bg-gray-50"
                    >
                      <span className="text-[12px] font-medium text-ink">{p.name}</span>
                      <span className="text-[10px] text-gray-400">
                        {p.role} · {p.organization}
                      </span>
                    </button>
                  ))}
                </div>
              )}
              <textarea
                ref={taRef}
                value={replyText}
                onChange={onReplyChange}
                onKeyDown={(e) => {
                  if (e.key === "Enter" && !e.shiftKey && !mentionOpen) {
                    e.preventDefault();
                    void sendReply();
                  }
                  if (e.key === "Escape") setMentionOpen(false);
                }}
                placeholder="Write a reply…"
                rows={2}
                className="scroll-thin flex-1 resize-none rounded-input border border-bordergray px-3 py-2 text-[13px] outline-none focus:border-indigo"
              />
              <button
                onClick={sendReply}
                disabled={sending || !replyText.trim()}
                className="flex h-9 w-9 shrink-0 items-center justify-center rounded-btn bg-indigo text-white disabled:opacity-40"
              >
                <Send size={15} />
              </button>
            </div>
          </div>
        ) : (
          <div className="mb-3 flex items-start gap-2 rounded-card border border-bordergray bg-fog px-3 py-2.5 text-[12px] text-gray-500">
            <Lock size={14} className="mt-0.5 shrink-0 text-gray-400" />
            <span>
              You're viewing this thread. Only the commenter, responder, or a tagged person can reply —
              ask the commenter or responder to <span className="font-medium">@-mention</span> you to join.
            </span>
          </div>
        )}

        {/* Status + incorporated */}
        <div className="flex flex-wrap items-center gap-x-5 gap-y-2">
          <div className="flex items-center gap-1.5">
            <span className="text-[11px] font-medium text-gray-400">Status:</span>
            {COMMENT_STATUSES.map((s) => (
              <button
                key={s}
                onClick={() => setStatus(s)}
                className={`rounded-full px-2 py-0.5 text-[11px] font-semibold ${
                  comment.status === s
                    ? "bg-indigo text-white"
                    : "border border-bordergray text-gray-500 hover:bg-gray-50"
                }`}
              >
                {COMMENT_STATUS_LABEL[s]}
              </button>
            ))}
          </div>
          <div className="flex items-center gap-1.5">
            <span className="text-[11px] font-medium text-gray-400">Incorporated:</span>
            {(["yes", "no"] as const).map((flag) => (
              <button
                key={flag}
                onClick={() => setIncorporated(comment.incorporated === flag ? "" : flag)}
                className={`rounded-full px-2 py-0.5 text-[11px] font-semibold capitalize ${
                  comment.incorporated === flag
                    ? flag === "yes"
                      ? "bg-emerald text-white"
                      : "bg-critical text-white"
                    : "border border-bordergray text-gray-500 hover:bg-gray-50"
                }`}
              >
                {flag}
              </button>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
