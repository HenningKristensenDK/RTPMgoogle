import { useEffect, useRef, useState } from "react";
import { Document as PdfDocument, Page as PdfPage, pdfjs } from "react-pdf";
import {
  ChevronLeft,
  ChevronRight,
  MessageSquarePlus,
  Highlighter,
  ArrowUpRight,
  Square,
  FileText,
  ExternalLink,
  Check,
  Trash2,
  type LucideIcon,
} from "lucide-react";
import type { AnnotationKind, DocumentAnnotation, DocumentItem } from "../../types";
import {
  watchDocumentAnnotations,
  addDocumentAnnotation,
  updateDocumentAnnotation,
  deleteDocumentAnnotation,
} from "../../firebase/firestore";
import { effectiveKind, formatTime } from "../../lib/format";

pdfjs.GlobalWorkerOptions.workerSrc = new URL(
  "pdfjs-dist/build/pdf.worker.min.mjs",
  import.meta.url
).toString();

interface Props {
  item: DocumentItem;
  authorUid: string;
  authorName: string;
}

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

const KIND_COLOR: Record<AnnotationKind, string> = {
  comment: "#ff8b00",
  highlight: "#ffcc00",
  arrow: "#e63946",
  rectangle: "#0d08d2",
};
const RESOLVED_COLOR = "#9CA3AF";

const TOOLS: { kind: AnnotationKind; label: string; Icon: LucideIcon; instruction: string }[] = [
  { kind: "comment", label: "Comment", Icon: MessageSquarePlus, instruction: "Click the document to place a comment" },
  { kind: "highlight", label: "Highlight", Icon: Highlighter, instruction: "Drag to highlight a region" },
  { kind: "arrow", label: "Arrow", Icon: ArrowUpRight, instruction: "Drag to draw an arrow" },
  { kind: "rectangle", label: "Rectangle", Icon: Square, instruction: "Drag to draw a box" },
];

const DRAG_THRESHOLD = 0.01;

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
    style: { cursor: interactive ? "pointer" : undefined },
    pointerEvents: interactive ? ("all" as const) : ("none" as const),
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

export default function DocumentViewer({ item, authorUid, authorName }: Props) {
  const isPdf = item.fileType === "application/pdf";
  const isImage = item.fileType.startsWith("image/");

  const [annotations, setAnnotations] = useState<DocumentAnnotation[]>([]);
  const [page, setPage] = useState(1);
  const [numPages, setNumPages] = useState(1);
  const [activeTool, setActiveTool] = useState<AnnotationKind | null>(null);
  const [dragStart, setDragStart] = useState<Point | null>(null);
  const [dragCurrent, setDragCurrent] = useState<Point | null>(null);
  const [draft, setDraft] = useState<Draft | null>(null);
  const [openId, setOpenId] = useState<string | null>(null);
  const [pageWidth, setPageWidth] = useState(600);
  const wrapperRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!isPdf && !isImage) return;
    return watchDocumentAnnotations(item.id, setAnnotations);
  }, [item.id, isPdf, isImage]);

  useEffect(() => {
    function measure() {
      if (wrapperRef.current) setPageWidth(wrapperRef.current.clientWidth);
    }
    measure();
    window.addEventListener("resize", measure);
    return () => window.removeEventListener("resize", measure);
  }, []);

  const pageAnnotations = annotations.filter((a) => a.page === page);
  const pins = pageAnnotations.filter((a) => effectiveKind(a) === "comment");
  const shapes = pageAnnotations.filter((a) => effectiveKind(a) !== "comment");

  function clearToolState() {
    setDragStart(null);
    setDragCurrent(null);
    setDraft(null);
  }

  function selectTool(kind: AnnotationKind) {
    setActiveTool((t) => (t === kind ? null : kind));
    clearToolState();
    setOpenId(null);
  }

  function pointFromEvent(e: React.MouseEvent): Point | null {
    if (!wrapperRef.current) return null;
    const rect = wrapperRef.current.getBoundingClientRect();
    return {
      xPct: (e.clientX - rect.left) / rect.width,
      yPct: (e.clientY - rect.top) / rect.height,
    };
  }

  function handleMouseDown(e: React.MouseEvent<HTMLDivElement>) {
    if (activeTool !== "highlight" && activeTool !== "arrow" && activeTool !== "rectangle") return;
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
    if (!dragStart || !dragCurrent || !activeTool) return;
    const dx = Math.abs(dragCurrent.xPct - dragStart.xPct);
    const dy = Math.abs(dragCurrent.yPct - dragStart.yPct);
    if (dx < DRAG_THRESHOLD && dy < DRAG_THRESHOLD) {
      setDragStart(null);
      setDragCurrent(null);
      return;
    }
    let start = dragStart;
    let end = dragCurrent;
    if (activeTool === "highlight" || activeTool === "rectangle") {
      start = { xPct: Math.min(dragStart.xPct, dragCurrent.xPct), yPct: Math.min(dragStart.yPct, dragCurrent.yPct) };
      end = { xPct: Math.max(dragStart.xPct, dragCurrent.xPct), yPct: Math.max(dragStart.yPct, dragCurrent.yPct) };
    }
    setDraft({ kind: activeTool, xPct: start.xPct, yPct: start.yPct, x2Pct: end.xPct, y2Pct: end.yPct, text: "" });
    setDragStart(null);
    setDragCurrent(null);
    setActiveTool(null);
    setOpenId(null);
  }

  function handleSurfaceClick(e: React.MouseEvent<HTMLDivElement>) {
    if (activeTool !== "comment") return;
    const p = pointFromEvent(e);
    if (!p) return;
    setDraft({ kind: "comment", xPct: p.xPct, yPct: p.yPct, text: "" });
    setActiveTool(null);
    setOpenId(null);
  }

  async function saveDraft() {
    if (!draft) return;
    const text = draft.text.trim();
    if (draft.kind === "comment" && !text) {
      setDraft(null);
      return;
    }
    const base = {
      documentId: item.id,
      page,
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

  if (!isPdf && !isImage) {
    return (
      <div className="flex h-full flex-col items-center justify-center gap-3 rounded-card border border-bordergray bg-fog">
        <div
          className="flex h-16 w-16 items-center justify-center rounded-full"
          style={{ background: "#e7e6fa" }}
        >
          <FileText size={28} style={{ color: "#0d08d2" }} />
        </div>
        <p className="text-sm font-medium text-ink">{item.fileName || "No file"}</p>
        <p className="text-xs text-gray-400">Preview not available for this file type</p>
        {item.fileUrl && (
          <a
            href={item.fileUrl}
            target="_blank"
            rel="noreferrer"
            className="flex items-center gap-1.5 rounded-btn border border-bordergray px-3 py-1.5 text-sm text-indigo hover:bg-gray-50"
          >
            <ExternalLink size={14} /> Open / Download
          </a>
        )}
      </div>
    );
  }

  const activeInstruction = TOOLS.find((t) => t.kind === activeTool)?.instruction;
  const cursorClass =
    activeTool === "comment" ? "cursor-crosshair" : activeTool ? "cursor-crosshair" : "";

  return (
    <div className="flex h-full flex-col">
      {/* Toolbar */}
      <div className="mb-2 flex flex-wrap items-center justify-between gap-2">
        <div className="flex items-center gap-2">
          {isPdf && (
            <>
              <button
                onClick={() => setPage((p) => Math.max(1, p - 1))}
                disabled={page <= 1}
                className="flex h-7 w-7 items-center justify-center rounded-btn border border-bordergray text-gray-500 hover:bg-gray-50 disabled:opacity-40"
              >
                <ChevronLeft size={15} />
              </button>
              <span className="text-xs text-gray-500">
                Page {page} of {numPages}
              </span>
              <button
                onClick={() => setPage((p) => Math.min(numPages, p + 1))}
                disabled={page >= numPages}
                className="flex h-7 w-7 items-center justify-center rounded-btn border border-bordergray text-gray-500 hover:bg-gray-50 disabled:opacity-40"
              >
                <ChevronRight size={15} />
              </button>
            </>
          )}
          {activeInstruction && (
            <span className="text-[11px] font-medium" style={{ color: KIND_COLOR[activeTool!] }}>
              {activeInstruction}
            </span>
          )}
        </div>

        <div className="flex items-center gap-1">
          {TOOLS.map(({ kind, label, Icon }) => (
            <button
              key={kind}
              onClick={() => selectTool(kind)}
              title={label}
              className="flex items-center gap-1 rounded-btn border px-2.5 py-1.5 text-xs font-semibold transition-colors"
              style={
                activeTool === kind
                  ? { background: KIND_COLOR[kind], borderColor: KIND_COLOR[kind], color: "#fff" }
                  : { borderColor: "#e6e6f0", color: "#595b78" }
              }
            >
              <Icon size={14} /> {label}
            </button>
          ))}
        </div>
      </div>

      {/* Surface + markups sidebar */}
      <div className="flex flex-1 gap-3 overflow-hidden">
        <div className="scroll-thin flex-1 overflow-auto rounded-card border border-bordergray bg-gray-100 p-4">
          <div
            ref={wrapperRef}
            onMouseDown={handleMouseDown}
            onMouseMove={handleMouseMove}
            onMouseUp={handleMouseUp}
            onClick={handleSurfaceClick}
            className={`relative mx-auto ${cursorClass}`}
            style={{ width: pageWidth }}
          >
            {isPdf ? (
              <PdfDocument
                file={item.fileUrl}
                onLoadSuccess={({ numPages }) => setNumPages(numPages)}
                loading={<div className="p-10 text-center text-sm text-gray-400">Loading PDF…</div>}
                error={
                  <div className="p-10 text-center text-sm text-critical">
                    Could not load this PDF.
                  </div>
                }
              >
                <PdfPage
                  pageNumber={page}
                  width={pageWidth}
                  renderTextLayer={false}
                  renderAnnotationLayer={false}
                />
              </PdfDocument>
            ) : (
              <img src={item.fileUrl} alt={item.fileName} className="w-full" draggable={false} />
            )}

            {/* Saved shapes (highlight / arrow / rectangle) */}
            <svg className="absolute inset-0 h-full w-full" style={{ pointerEvents: "none" }}>
              <defs>
                <marker
                  id="rtpm-arrowhead"
                  markerWidth="8"
                  markerHeight="8"
                  refX="6"
                  refY="4"
                  orient="auto"
                  markerUnits="userSpaceOnUse"
                >
                  <path d="M0,0 L8,4 L0,8 Z" fill={KIND_COLOR.arrow} />
                </marker>
              </defs>
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
                    interactive={activeTool === null}
                    onClick={() => setOpenId(openId === a.id ? null : a.id)}
                  />
                );
              })}
              {/* Live drag preview */}
              {dragStart &&
                dragCurrent &&
                (activeTool === "highlight" || activeTool === "arrow" || activeTool === "rectangle") && (
                  <ShapeMark
                    kind={activeTool}
                    x={dragStart.xPct}
                    y={dragStart.yPct}
                    x2={dragCurrent.xPct}
                    y2={dragCurrent.yPct}
                    color={KIND_COLOR[activeTool]}
                    dashed
                  />
                )}
            </svg>

            {/* Comment pins */}
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
                  pointerEvents: activeTool === null ? "auto" : "none",
                }}
                title={a.text}
              >
                {i + 1}
              </button>
            ))}

            {/* Popover for the open pin/shape */}
            {pageAnnotations.map((a) =>
              openId === a.id ? (
                <div
                  key={`popover-${a.id}`}
                  onClick={(e) => e.stopPropagation()}
                  className="absolute z-10 w-56 -translate-x-1/2 rounded-card border border-bordergray bg-white p-3 shadow-panel"
                  style={{
                    left: `${((a.x2Pct ?? a.xPct) + a.xPct) / 2 * 100}%`,
                    top: `${((a.y2Pct ?? a.yPct) + a.yPct) / 2 * 100}%`,
                    marginTop: 14,
                  }}
                >
                  <div className="mb-1 flex items-center justify-between">
                    <span className="text-[11px] font-semibold text-gray-700">{a.authorName}</span>
                    <span className="text-[10px] text-gray-400">{formatTime(a.createdAt)}</span>
                  </div>
                  <p className={`text-[12px] ${a.resolved ? "text-gray-400 line-through" : "text-ink"}`}>
                    {a.text || <span className="italic text-gray-400">No note</span>}
                  </p>
                  <div className="mt-2 flex items-center justify-end gap-2">
                    <button
                      onClick={() => toggleResolved(a)}
                      className="flex items-center gap-1 text-[11px] font-medium text-emerald hover:underline"
                    >
                      <Check size={12} /> {a.resolved ? "Reopen" : "Resolve"}
                    </button>
                    {a.authorUid === authorUid && (
                      <button
                        onClick={() => removeAnnotation(a)}
                        className="flex items-center gap-1 text-[11px] font-medium text-critical hover:underline"
                      >
                        <Trash2 size={12} /> Delete
                      </button>
                    )}
                  </div>
                </div>
              ) : null
            )}

            {/* Draft (unsaved) markup */}
            {draft && (
              <div
                onClick={(e) => e.stopPropagation()}
                className="absolute z-10 w-56 -translate-x-1/2 rounded-card border bg-white p-3 shadow-panel"
                style={{
                  left: `${((draft.x2Pct ?? draft.xPct) + draft.xPct) / 2 * 100}%`,
                  top: `${((draft.y2Pct ?? draft.yPct) + draft.yPct) / 2 * 100}%`,
                  borderColor: KIND_COLOR[draft.kind],
                }}
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
                  <button
                    onClick={() => setDraft(null)}
                    className="rounded-btn border border-bordergray px-2 py-1 text-[11px] text-gray-600 hover:bg-gray-50"
                  >
                    Cancel
                  </button>
                  <button
                    onClick={saveDraft}
                    className="rounded-btn px-2 py-1 text-[11px] font-semibold text-white hover:opacity-90"
                    style={{ background: KIND_COLOR[draft.kind] }}
                  >
                    Save
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Markups sidebar for current page */}
        <div className="scroll-thin flex w-[200px] shrink-0 flex-col gap-2 overflow-auto">
          <span className="text-[11px] font-semibold uppercase tracking-wide text-gray-400">
            Markups ({pageAnnotations.length})
          </span>
          {pageAnnotations.length === 0 ? (
            <p className="text-[11px] text-gray-300">No markups on this page yet.</p>
          ) : (
            pageAnnotations.map((a) => {
              const kind = effectiveKind(a);
              const Icon = TOOLS.find((t) => t.kind === kind)?.Icon ?? MessageSquarePlus;
              return (
                <button
                  key={a.id}
                  onClick={() => setOpenId(a.id)}
                  className="rounded-btn border border-bordergray p-2 text-left hover:bg-gray-50"
                >
                  <div className="flex items-center gap-1.5">
                    <span
                      className="flex h-4 w-4 shrink-0 items-center justify-center rounded-full text-white"
                      style={{ background: a.resolved ? RESOLVED_COLOR : KIND_COLOR[kind] }}
                    >
                      <Icon size={10} />
                    </span>
                    <span className="truncate text-[11px] font-medium text-gray-700">{a.authorName}</span>
                  </div>
                  <p
                    className={`mt-1 line-clamp-2 text-[11px] ${
                      a.resolved ? "text-gray-400 line-through" : "text-gray-600"
                    }`}
                  >
                    {a.text || <span className="italic text-gray-400">No note</span>}
                  </p>
                </button>
              );
            })
          )}
        </div>
      </div>
    </div>
  );
}
