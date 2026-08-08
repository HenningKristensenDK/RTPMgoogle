import { useRef, useState } from "react";
import { Check, Trash2, Highlighter, MessageSquarePlus } from "lucide-react";
import type {
  AnnotationKind,
  CommentAnchor,
  DocumentAnnotation,
  DocumentComment,
} from "../../types";
import {
  addDocumentAnnotation,
  updateDocumentAnnotation,
  deleteDocumentAnnotation,
} from "../../firebase/firestore";
import {
  COMMENT_STATUS_LABEL,
  COMMENT_STATUS_META,
  commentColor,
  effectiveKind,
  formatTime,
} from "../../lib/format";

export type Tool =
  | "select"
  | "comment"
  | "highlight"
  | "arrow"
  | "rectangle"
  | "comment_area";

export const KIND_COLOR: Record<AnnotationKind, string> = {
  comment: "#ff8b00",
  highlight: "#ffcc00",
  arrow: "#e63946",
  rectangle: "#0d08d2",
};
const RESOLVED_COLOR = "#9CA3AF";
const DRAG_THRESHOLD = 0.008;
const DRAG_TOOLS: Tool[] = ["highlight", "arrow", "rectangle", "comment_area"];

interface Point {
  xPct: number;
  yPct: number;
}

interface Draft {
  kind: AnnotationKind;
  xPct: number;
  yPct: number;
  x2Pct?: number;
  y2Pct?: number;
  text: string;
}

interface SelectionBox {
  xPct: number;
  yPct: number;
  x2Pct: number;
  y2Pct: number;
  text: string;
}

function ShapeMark({
  kind,
  x,
  y,
  x2,
  y2,
  color,
  dashed = false,
  interactive = false,
  onClick,
}: {
  kind: "highlight" | "arrow" | "rectangle";
  x: number;
  y: number;
  x2: number;
  y2: number;
  color: string;
  dashed?: boolean;
  interactive?: boolean;
  onClick?: () => void;
}) {
  const shared = {
    style: {
      cursor: interactive ? "pointer" : undefined,
      pointerEvents: interactive ? ("all" as const) : ("none" as const),
    },
    onClick: interactive
      ? (e: React.MouseEvent) => {
          e.stopPropagation();
          onClick?.();
        }
      : undefined,
  };
  if (kind === "arrow") {
    return (
      <line
        x1={`${x * 100}%`}
        y1={`${y * 100}%`}
        x2={`${x2 * 100}%`}
        y2={`${y2 * 100}%`}
        stroke={color}
        strokeWidth={2.5}
        strokeDasharray={dashed ? "6 4" : undefined}
        markerEnd="url(#rtpm-arrowhead)"
        {...shared}
      />
    );
  }
  const left = Math.min(x, x2);
  const top = Math.min(y, y2);
  const width = Math.abs(x2 - x);
  const height = Math.abs(y2 - y);
  return (
    <rect
      x={`${left * 100}%`}
      y={`${top * 100}%`}
      width={`${width * 100}%`}
      height={`${height * 100}%`}
      fill={kind === "highlight" ? color : "none"}
      fillOpacity={kind === "highlight" ? 0.35 : 1}
      stroke={kind === "rectangle" ? color : "none"}
      strokeWidth={2}
      strokeDasharray={dashed ? "6 4" : undefined}
      {...shared}
    />
  );
}

interface Props {
  documentId: string;
  pageNumber: number;
  annotations: DocumentAnnotation[];
  comments: DocumentComment[];
  activeTool: Tool;
  authorUid: string;
  authorName: string;
  flashCommentId: string | null;
  onCreateCommentFromAnchor: (anchor: CommentAnchor, quotedText: string) => void;
  onOpenComment: (comment: DocumentComment) => void;
  children: React.ReactNode;
}

export default function PageSurface({
  documentId,
  pageNumber,
  annotations,
  comments,
  activeTool,
  authorUid,
  authorName,
  flashCommentId,
  onCreateCommentFromAnchor,
  onOpenComment,
  children,
}: Props) {
  const wrapRef = useRef<HTMLDivElement>(null);
  const [dragStart, setDragStart] = useState<Point | null>(null);
  const [dragCurrent, setDragCurrent] = useState<Point | null>(null);
  const [draft, setDraft] = useState<Draft | null>(null);
  const [openId, setOpenId] = useState<string | null>(null);
  const [selection, setSelection] = useState<SelectionBox | null>(null);
  // Which anchored comment is "opened" on the page — intensifies its highlight
  // and shows an inline preview so you can read it without leaving the viewer.
  const [activeCommentId, setActiveCommentId] = useState<string | null>(null);

  const isSelectMode = activeTool === "select";
  const pins = annotations.filter((a) => effectiveKind(a) === "comment");
  const shapes = annotations.filter((a) => effectiveKind(a) !== "comment");

  function pointFromEvent(e: React.MouseEvent): Point | null {
    if (!wrapRef.current) return null;
    const rect = wrapRef.current.getBoundingClientRect();
    return {
      xPct: (e.clientX - rect.left) / rect.width,
      yPct: (e.clientY - rect.top) / rect.height,
    };
  }

  function handleMouseDown(e: React.MouseEvent<HTMLDivElement>) {
    if (!DRAG_TOOLS.includes(activeTool)) return;
    const p = pointFromEvent(e);
    if (!p) return;
    setDragStart(p);
    setDragCurrent(p);
  }

  function handleMouseMove(e: React.MouseEvent<HTMLDivElement>) {
    if (!dragStart) return;
    const p = pointFromEvent(e);
    if (p) setDragCurrent(p);
  }

  function handleMouseUp() {
    // Text-selection path (select mode): show floating Highlight/Comment toolbar.
    if (isSelectMode) {
      captureTextSelection();
      return;
    }
    if (!dragStart || !dragCurrent) return;
    const dx = Math.abs(dragCurrent.xPct - dragStart.xPct);
    const dy = Math.abs(dragCurrent.yPct - dragStart.yPct);
    if (dx < DRAG_THRESHOLD && dy < DRAG_THRESHOLD) {
      setDragStart(null);
      setDragCurrent(null);
      return;
    }
    const x1 = Math.min(dragStart.xPct, dragCurrent.xPct);
    const y1 = Math.min(dragStart.yPct, dragCurrent.yPct);
    const x2 = Math.max(dragStart.xPct, dragCurrent.xPct);
    const y2 = Math.max(dragStart.yPct, dragCurrent.yPct);

    if (activeTool === "comment_area") {
      onCreateCommentFromAnchor({ page: pageNumber, xPct: x1, yPct: y1, x2Pct: x2, y2Pct: y2 }, "");
    } else if (activeTool === "arrow") {
      // Markup shapes are quick visual marks now — save straight away, no note prompt.
      void saveShape("arrow", dragStart.xPct, dragStart.yPct, dragCurrent.xPct, dragCurrent.yPct);
    } else {
      void saveShape(activeTool as AnnotationKind, x1, y1, x2, y2);
    }
    setDragStart(null);
    setDragCurrent(null);
  }

  async function saveShape(kind: AnnotationKind, x: number, y: number, x2: number, y2: number) {
    await addDocumentAnnotation({
      documentId,
      page: pageNumber,
      kind,
      xPct: x,
      yPct: y,
      x2Pct: x2,
      y2Pct: y2,
      text: "",
      authorUid,
      authorName,
      resolved: false,
    });
  }

  function handleClick(e: React.MouseEvent<HTMLDivElement>) {
    // Clicking empty page area dismisses an open comment preview.
    if (isSelectMode) {
      if (activeCommentId) setActiveCommentId(null);
      return;
    }
    if (activeTool !== "comment") return;
    const p = pointFromEvent(e);
    if (!p) return;
    setDraft({ kind: "comment", xPct: p.xPct, yPct: p.yPct, text: "" });
  }

  function captureTextSelection() {
    const sel = window.getSelection();
    if (!sel || sel.isCollapsed || !wrapRef.current) {
      return;
    }
    const range = sel.getRangeAt(0);
    if (!wrapRef.current.contains(range.commonAncestorContainer)) return;
    const wrapRect = wrapRef.current.getBoundingClientRect();
    const r = range.getBoundingClientRect();
    if (r.width < 2 && r.height < 2) return;
    setSelection({
      xPct: (r.left - wrapRect.left) / wrapRect.width,
      yPct: (r.top - wrapRect.top) / wrapRect.height,
      x2Pct: (r.right - wrapRect.left) / wrapRect.width,
      y2Pct: (r.bottom - wrapRect.top) / wrapRect.height,
      text: sel.toString(),
    });
  }

  async function highlightSelection() {
    if (!selection) return;
    await addDocumentAnnotation({
      documentId,
      page: pageNumber,
      kind: "highlight",
      xPct: selection.xPct,
      yPct: selection.yPct,
      x2Pct: selection.x2Pct,
      y2Pct: selection.y2Pct,
      text: "",
      authorUid,
      authorName,
      resolved: false,
    });
    clearSelection();
  }

  function commentSelection() {
    if (!selection) return;
    onCreateCommentFromAnchor(
      { page: pageNumber, xPct: selection.xPct, yPct: selection.yPct, x2Pct: selection.x2Pct, y2Pct: selection.y2Pct },
      selection.text
    );
    clearSelection();
  }

  function clearSelection() {
    setSelection(null);
    window.getSelection()?.removeAllRanges();
  }

  async function saveDraft() {
    if (!draft) return;
    const text = draft.text.trim();
    if (draft.kind === "comment" && !text) {
      setDraft(null);
      return;
    }
    const base = {
      documentId,
      page: pageNumber,
      kind: draft.kind,
      xPct: draft.xPct,
      yPct: draft.yPct,
      text,
      authorUid,
      authorName,
      resolved: false,
    };
    const payload =
      draft.x2Pct !== undefined && draft.y2Pct !== undefined
        ? { ...base, x2Pct: draft.x2Pct, y2Pct: draft.y2Pct }
        : base;
    await addDocumentAnnotation(payload);
    setDraft(null);
  }

  async function toggleResolved(a: DocumentAnnotation) {
    await updateDocumentAnnotation(a.id, { resolved: !a.resolved });
  }

  async function removeAnnotation(a: DocumentAnnotation) {
    await deleteDocumentAnnotation(a.id);
    setOpenId(null);
  }

  return (
    <div
      ref={wrapRef}
      data-page={pageNumber}
      onMouseDown={handleMouseDown}
      onMouseMove={handleMouseMove}
      onMouseUp={handleMouseUp}
      onClick={handleClick}
      className={`relative ${activeTool === "comment" || activeTool === "comment_area" || DRAG_TOOLS.includes(activeTool) ? "cursor-crosshair" : ""}`}
    >
      {children}

      {/* Overlay — transparent to clicks in select mode so text selection works;
          markers/pins/shapes set their own pointer-events. */}
      <svg
        className="absolute inset-0 h-full w-full"
        style={{ pointerEvents: "none" }}
      >
        <defs>
          <marker id="rtpm-arrowhead" markerWidth="8" markerHeight="8" refX="6" refY="4" orient="auto" markerUnits="userSpaceOnUse">
            <path d="M0,0 L8,4 L0,8 Z" fill={KIND_COLOR.arrow} />
          </marker>
        </defs>

        {/* Anchored-comment highlights — subtle tint always visible, brighter when active/flashing */}
        {comments.map((c) => {
          const a = c.anchor;
          if (!a || a.x2Pct === undefined || a.y2Pct === undefined) return null;
          const color = commentColor(c.commentNo);
          const lit = activeCommentId === c.id || flashCommentId === c.id;
          const left = Math.min(a.xPct, a.x2Pct);
          const top = Math.min(a.yPct, a.y2Pct);
          return (
            <rect
              key={`region-${c.id}`}
              x={`${left * 100}%`}
              y={`${top * 100}%`}
              width={`${Math.abs(a.x2Pct - a.xPct) * 100}%`}
              height={`${Math.abs(a.y2Pct - a.yPct) * 100}%`}
              rx={3}
              fill={color}
              fillOpacity={lit ? 0.22 : 0.1}
              stroke={color}
              strokeOpacity={lit ? 0.9 : 0.28}
              strokeWidth={lit ? 2 : 1}
              style={{ pointerEvents: "none", transition: "fill-opacity 160ms ease, stroke-opacity 160ms ease" }}
            />
          );
        })}

        {shapes.map((a) => {
          const kind = effectiveKind(a) as "highlight" | "arrow" | "rectangle";
          return (
            <ShapeMark
              key={a.id}
              kind={kind}
              x={a.xPct}
              y={a.yPct}
              x2={a.x2Pct ?? a.xPct}
              y2={a.y2Pct ?? a.yPct}
              color={a.resolved ? RESOLVED_COLOR : KIND_COLOR[kind]}
              interactive={isSelectMode}
              onClick={() => setOpenId(openId === a.id ? null : a.id)}
            />
          );
        })}
        {dragStart && dragCurrent && (activeTool === "highlight" || activeTool === "arrow" || activeTool === "rectangle" || activeTool === "comment_area") && (
          <ShapeMark
            kind={activeTool === "comment_area" ? "rectangle" : (activeTool as "highlight" | "arrow" | "rectangle")}
            x={dragStart.xPct}
            y={dragStart.yPct}
            x2={dragCurrent.xPct}
            y2={dragCurrent.yPct}
            color={activeTool === "comment_area" ? "#ff8b00" : KIND_COLOR[activeTool as AnnotationKind]}
            dashed
          />
        )}
      </svg>

      {/* Comment pins (markups) */}
      {pins.map((a, i) => (
        <button
          key={a.id}
          onClick={(e) => {
            e.stopPropagation();
            setOpenId(openId === a.id ? null : a.id);
          }}
          className="absolute flex h-6 w-6 -translate-x-1/2 -translate-y-1/2 items-center justify-center rounded-full text-[11px] font-bold text-white shadow-panel"
          style={{
            left: `${a.xPct * 100}%`,
            top: `${a.yPct * 100}%`,
            background: a.resolved ? RESOLVED_COLOR : KIND_COLOR.comment,
            pointerEvents: isSelectMode ? "auto" : "none",
          }}
          title={a.text}
        >
          {i + 1}
        </button>
      ))}

      {/* Anchored comment pins — a teardrop whose tip points at the region, in the comment's own colour */}
      {comments.map((c) => {
        const a = c.anchor;
        if (!a) return null;
        const color = commentColor(c.commentNo);
        const tipX = a.x2Pct !== undefined ? (a.xPct + a.x2Pct) / 2 : a.xPct;
        const tipY = a.y2Pct !== undefined ? Math.min(a.yPct, a.y2Pct) : a.yPct;
        const active = activeCommentId === c.id;
        const flashing = flashCommentId === c.id;
        const closed = c.status === "closed";
        return (
          <button
            key={c.id}
            onClick={(e) => {
              e.stopPropagation();
              setActiveCommentId(active ? null : c.id);
            }}
            className={`absolute -translate-x-1/2 -translate-y-full transition-transform hover:scale-110 ${flashing ? "animate-pulse" : ""}`}
            style={{
              left: `${tipX * 100}%`,
              top: `${tipY * 100}%`,
              pointerEvents: isSelectMode ? "auto" : "none",
              opacity: closed && !active ? 0.65 : 1,
              zIndex: active || flashing ? 25 : 10,
            }}
            title={`#${c.commentNo}: ${c.text}`}
          >
            <svg width="26" height="34" viewBox="0 0 26 34" style={{ display: "block", filter: "drop-shadow(0 1px 2px rgba(0,0,0,0.3))" }}>
              <path
                d="M13 33 C13 33 24 19 24 12 A11 11 0 1 0 2 12 C2 19 13 33 13 33 Z"
                fill={color}
                stroke="#fff"
                strokeWidth="2"
              />
              <text x="13" y="16" textAnchor="middle" fontSize="11" fontWeight="700" fill="#fff">
                {c.commentNo}
              </text>
            </svg>
          </button>
        );
      })}

      {/* Inline preview of the opened comment — read it without leaving the document */}
      {comments.map((c) => {
        const a = c.anchor;
        if (!a || activeCommentId !== c.id) return null;
        const color = commentColor(c.commentNo);
        const px = a.x2Pct !== undefined ? (a.xPct + a.x2Pct) / 2 : a.xPct;
        const py = a.y2Pct !== undefined ? Math.max(a.yPct, a.y2Pct) : a.yPct;
        const meta = COMMENT_STATUS_META[c.status];
        return (
          <div
            key={`cpop-${c.id}`}
            onClick={(e) => e.stopPropagation()}
            className="absolute z-30 w-60 -translate-x-1/2 rounded-card border bg-white p-3 shadow-panel"
            style={{ left: `${px * 100}%`, top: `${py * 100}%`, marginTop: 10, borderColor: color, pointerEvents: "auto" }}
          >
            <div className="mb-1.5 flex items-center justify-between gap-2">
              <span className="flex items-center gap-1.5 text-[11px] font-bold" style={{ color }}>
                <span className="flex h-4 min-w-4 items-center justify-center rounded-full px-1 text-[10px] text-white" style={{ background: color }}>
                  {c.commentNo}
                </span>
                Comment {c.commentNo}
              </span>
              <span className="rounded-full px-2 py-0.5 text-[10px] font-semibold" style={{ color: meta.text, background: meta.bg }}>
                {COMMENT_STATUS_LABEL[c.status]}
              </span>
            </div>
            <p className="text-[12px] text-ink" style={{ display: "-webkit-box", WebkitLineClamp: 4, WebkitBoxOrient: "vertical", overflow: "hidden" }}>
              {c.text}
            </p>
            {c.section && <p className="mt-1 text-[10.5px] text-gray-400">Section {c.section}</p>}
            <button
              onClick={() => onOpenComment(c)}
              className="mt-2.5 w-full rounded-btn py-1.5 text-[11px] font-semibold text-white hover:opacity-90"
              style={{ background: color }}
            >
              Open in Comment Sheet
            </button>
          </div>
        );
      })}

      {/* Markup resolve/delete popover */}
      {annotations.map((a) =>
        openId === a.id ? (
          <div
            key={`pop-${a.id}`}
            onClick={(e) => e.stopPropagation()}
            className="absolute z-20 w-56 -translate-x-1/2 rounded-card border border-bordergray bg-white p-3 shadow-panel"
            style={{ left: `${((a.x2Pct ?? a.xPct) + a.xPct) / 2 * 100}%`, top: `${((a.y2Pct ?? a.yPct) + a.yPct) / 2 * 100}%`, marginTop: 14, pointerEvents: "auto" }}
          >
            <div className="mb-1 flex items-center justify-between">
              <span className="text-[11px] font-semibold text-gray-700">{a.authorName}</span>
              <span className="text-[10px] text-gray-400">{formatTime(a.createdAt)}</span>
            </div>
            <p className={`text-[12px] ${a.resolved ? "text-gray-400 line-through" : "text-ink"}`}>
              {a.text || <span className="italic text-gray-400">No note</span>}
            </p>
            <div className="mt-2 flex items-center justify-end gap-2">
              <button onClick={() => toggleResolved(a)} className="flex items-center gap-1 text-[11px] font-medium text-emerald hover:underline">
                <Check size={12} /> {a.resolved ? "Reopen" : "Resolve"}
              </button>
              {a.authorUid === authorUid && (
                <button onClick={() => removeAnnotation(a)} className="flex items-center gap-1 text-[11px] font-medium text-critical hover:underline">
                  <Trash2 size={12} /> Delete
                </button>
              )}
            </div>
          </div>
        ) : null
      )}

      {/* Draft markup popover */}
      {draft && (
        <div
          onClick={(e) => e.stopPropagation()}
          className="absolute z-20 w-56 -translate-x-1/2 rounded-card border bg-white p-3 shadow-panel"
          style={{ left: `${((draft.x2Pct ?? draft.xPct) + draft.xPct) / 2 * 100}%`, top: `${((draft.y2Pct ?? draft.yPct) + draft.yPct) / 2 * 100}%`, borderColor: KIND_COLOR[draft.kind], pointerEvents: "auto" }}
        >
          <textarea
            autoFocus
            value={draft.text}
            onChange={(e) => setDraft({ ...draft, text: e.target.value })}
            placeholder={draft.kind === "comment" ? "Add a comment…" : "Add a note (optional)…"}
            rows={3}
            className="w-full resize-none rounded-input border border-bordergray p-2 text-[12px] outline-none focus:border-indigo"
          />
          <div className="mt-2 flex justify-end gap-2">
            <button onClick={() => setDraft(null)} className="rounded-btn border border-bordergray px-2 py-1 text-[11px] text-gray-600 hover:bg-gray-50">
              Cancel
            </button>
            <button onClick={saveDraft} className="rounded-btn px-2 py-1 text-[11px] font-semibold text-white hover:opacity-90" style={{ background: KIND_COLOR[draft.kind] }}>
              Save
            </button>
          </div>
        </div>
      )}

      {/* Text-selection floating toolbar */}
      {selection && (
        <div
          onClick={(e) => e.stopPropagation()}
          className="absolute z-30 flex -translate-x-1/2 gap-1 rounded-btn border border-bordergray bg-white p-1 shadow-panel"
          style={{ left: `${(selection.xPct + selection.x2Pct) / 2 * 100}%`, top: `${selection.y2Pct * 100}%`, marginTop: 6, pointerEvents: "auto" }}
        >
          <button onClick={highlightSelection} className="flex items-center gap-1 rounded px-2 py-1 text-[11px] font-semibold text-gray-600 hover:bg-gray-50">
            <Highlighter size={12} style={{ color: KIND_COLOR.highlight }} /> Highlight
          </button>
          <button onClick={commentSelection} className="flex items-center gap-1 rounded px-2 py-1 text-[11px] font-semibold text-gray-600 hover:bg-gray-50">
            <MessageSquarePlus size={12} style={{ color: "#0d08d2" }} /> Comment
          </button>
        </div>
      )}
    </div>
  );
}
