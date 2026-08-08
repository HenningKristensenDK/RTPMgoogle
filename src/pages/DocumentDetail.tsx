import { useEffect, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { ArrowLeft, X, MessageSquareText } from "lucide-react";
import type { CommentAnchor, DocumentComment, DocumentItem, DocumentStatus } from "../types";
import {
  watchDocumentItem,
  changeDocumentStatus,
  watchDocumentComments,
  addDocumentComment,
  nextCommentNo,
} from "../firebase/firestore";
import { useDocumentStore } from "../store/documentStore";
import { useRiskStore } from "../store/riskStore";
import { useAuthStore, currentIdentity } from "../store/authStore";
import { DOCUMENT_STATUS_LABEL } from "../lib/format";
import { toast } from "../lib/toast";
import DocumentPanel from "../components/document/DocumentPanel";
import CommentSheet from "../components/document/CommentSheet";
import NewCommentModal from "../components/document/NewCommentModal";

export default function DocumentDetail() {
  const { docId } = useParams<{ docId: string }>();
  const navigate = useNavigate();
  const roles = useRiskStore((s) => s.roles);
  const patchItem = useDocumentStore((s) => s.patchItem);
  const user = useAuthStore((s) => s.user);
  const me = currentIdentity(user);

  const [item, setItem] = useState<DocumentItem | null>(null);
  const [notFound, setNotFound] = useState(false);
  const [comments, setComments] = useState<DocumentComment[]>([]);
  const [commentSheetOpen, setCommentSheetOpen] = useState(false);
  const [sheetFocusId, setSheetFocusId] = useState<string | null>(null);
  // A comment being raised from the viewer (highlight/area → comment), before it's saved.
  const [pendingAnchor, setPendingAnchor] = useState<{ anchor: CommentAnchor; quotedText: string } | null>(null);
  // Bump nonce to make the viewer jump to a comment's anchor and flash its marker.
  const [scrollTarget, setScrollTarget] = useState<{ commentId: string; nonce: number } | null>(null);

  useEffect(() => {
    if (!docId) return;
    const unsub = watchDocumentItem(docId, (i) => {
      setItem(i);
      setNotFound(i === null);
    });
    return unsub;
  }, [docId]);

  useEffect(() => {
    if (!docId) return;
    return watchDocumentComments(docId, setComments);
  }, [docId]);

  const openComments = comments.filter((c) => c.status !== "closed").length;

  function close() {
    navigate("/documents");
  }

  async function handleChangeStatus(to: DocumentStatus) {
    if (!item) return;
    const from = item.status;
    try {
      await changeDocumentStatus(item.id, from, to, me.name, "");
      toast.success(`Status set to ${DOCUMENT_STATUS_LABEL[to]}`);
    } catch {
      toast.error("Failed to update status");
    }
  }

  // Viewer → "raise a comment here": open the composer prefilled with the anchor's page + text.
  function handleCreateCommentFromAnchor(anchor: CommentAnchor, quotedText: string) {
    setPendingAnchor({ anchor, quotedText });
  }

  async function handleSaveAnchoredComment(data: {
    workstreamId: string;
    section: string;
    page: string;
    responderName: string;
    text: string;
  }) {
    if (!item || !pendingAnchor) return;
    try {
      const no = await nextCommentNo(item.id);
      await addDocumentComment({
        documentId: item.id,
        projectId: item.projectId,
        commentNo: no,
        workstreamId: data.workstreamId,
        section: data.section,
        page: data.page,
        commenterUid: me.uid,
        commenterName: me.name,
        responderName: data.responderName,
        text: data.text,
        replies: [],
        status: "open",
        incorporated: "",
        anchor: pendingAnchor.anchor,
      });
      setPendingAnchor(null);
      toast.success("Comment added to the sheet");
    } catch {
      toast.error("Could not add comment");
    }
  }

  // Click an anchored marker in the viewer → open the sheet focused on that comment.
  function handleOpenComment(comment: DocumentComment) {
    setSheetFocusId(comment.id);
    setCommentSheetOpen(true);
  }

  // On-page shortcut → open the full Comment Sheet (no specific row focused).
  function handleOpenSheet() {
    setSheetFocusId(null);
    setCommentSheetOpen(true);
  }

  // Comment Sheet "locate in PDF" → close the sheet and jump the viewer to the anchor.
  function handleJumpToAnchor(comment: DocumentComment) {
    setCommentSheetOpen(false);
    setScrollTarget({ commentId: comment.id, nonce: Date.now() });
  }

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-6"
      style={{ background: "rgba(7, 4, 116, 0.45)" }}
      onClick={(e) => e.target === e.currentTarget && close()}
    >
      <div className="flex h-[94vh] w-[97vw] max-w-[1800px] flex-col overflow-hidden rounded-2xl bg-white shadow-2xl">
        {notFound ? (
          <div className="p-8 text-sm text-gray-500">
            Document not found.{" "}
            <button onClick={close} className="text-indigo underline">
              Back to Documents
            </button>
          </div>
        ) : !item ? (
          <div className="p-8 text-sm text-gray-400">Loading document…</div>
        ) : (
          <>
            <div className="flex items-center justify-between border-b border-bordergray bg-white px-6 py-3">
              <button
                onClick={close}
                className="flex items-center gap-1.5 text-sm text-gray-500 hover:text-gray-800"
              >
                <ArrowLeft size={16} /> Back
              </button>
              <div className="flex items-center gap-2">
                <button
                  onClick={() => setCommentSheetOpen(true)}
                  className="flex items-center gap-1.5 rounded-btn border border-bordergray px-3 py-1.5 text-sm font-semibold text-gray-600 hover:bg-gray-50"
                >
                  <MessageSquareText size={15} /> Comment Sheet
                  {openComments > 0 && (
                    <span className="flex h-5 min-w-[20px] items-center justify-center rounded-full bg-indigo px-1.5 text-[11px] font-bold text-white">
                      {openComments}
                    </span>
                  )}
                </button>
                <button
                  onClick={close}
                  title="Close"
                  className="flex h-8 w-8 items-center justify-center rounded border border-bordergray text-gray-500 hover:bg-gray-50 hover:text-critical"
                >
                  <X size={16} />
                </button>
              </div>
            </div>
            <div className="flex-1 overflow-hidden">
              <DocumentPanel
                item={item}
                roles={roles}
                authorUid={me.uid}
                authorName={me.name}
                comments={comments}
                onCreateCommentFromAnchor={handleCreateCommentFromAnchor}
                onOpenComment={handleOpenComment}
                onOpenSheet={handleOpenSheet}
                scrollTarget={scrollTarget}
                onPatch={(patch) => patchItem(item.id, patch)}
                onChangeStatus={handleChangeStatus}
              />
            </div>
            {commentSheetOpen && (
              <CommentSheet
                item={item}
                roles={roles}
                currentUid={me.uid}
                currentName={me.name}
                initialSelectedId={sheetFocusId}
                onJumpToAnchor={handleJumpToAnchor}
                onClose={() => {
                  setCommentSheetOpen(false);
                  setSheetFocusId(null);
                }}
              />
            )}
            {pendingAnchor && (
              <NewCommentModal
                roles={roles}
                commenterName={me.name}
                fromViewer
                initial={{ page: String(pendingAnchor.anchor.page), text: pendingAnchor.quotedText }}
                onCreate={handleSaveAnchoredComment}
                onCancel={() => setPendingAnchor(null)}
              />
            )}
          </>
        )}
      </div>
    </div>
  );
}
