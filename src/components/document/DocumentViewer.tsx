import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Document as PdfDocument, Page as PdfPage, pdfjs } from "react-pdf";
import "react-pdf/dist/Page/TextLayer.css";
import "react-pdf/dist/Page/AnnotationLayer.css";
import {
  MousePointer2,
  MessageSquarePlus,
  MapPin,
  Highlighter,
  ArrowUpRight,
  Square,
  Eraser,
  ZoomIn,
  ZoomOut,
  Maximize2,
  MoveVertical,
  FileText,
  ExternalLink,
  MessageSquareText,
  type LucideIcon,
} from "lucide-react";
import type { AnnotationKind, CommentAnchor, DocumentAnnotation, DocumentComment, DocumentItem } from "../../types";
import { watchDocumentAnnotations } from "../../firebase/firestore";
import PageSurface, { KIND_COLOR, type Tool } from "./PageSurface";

pdfjs.GlobalWorkerOptions.workerSrc = new URL(
  "pdfjs-dist/build/pdf.worker.min.mjs",
  import.meta.url
).toString();

interface Props {
  item: DocumentItem;
  authorUid: string;
  authorName: string;
  comments: DocumentComment[];
  onCreateCommentFromAnchor: (anchor: CommentAnchor, quotedText: string) => void;
  onOpenComment: (comment: DocumentComment) => void;
  /** Open the full Comment Sheet (from the on-page shortcut). */
  onOpenSheet: () => void;
  /** Bump `nonce` to jump the viewer to a comment's anchor and flash its marker. */
  scrollTarget: { commentId: string; nonce: number } | null;
}

const TOOLBAR: { tool: Tool; label: string; Icon: LucideIcon; group: "review" | "markup" }[] = [
  { tool: "select", label: "Select", Icon: MousePointer2, group: "review" },
  { tool: "comment_area", label: "Comment", Icon: MessageSquarePlus, group: "review" },
  { tool: "comment", label: "Pin", Icon: MapPin, group: "markup" },
  { tool: "highlight", label: "Highlight", Icon: Highlighter, group: "markup" },
  { tool: "arrow", label: "Arrow", Icon: ArrowUpRight, group: "markup" },
  { tool: "rectangle", label: "Box", Icon: Square, group: "markup" },
  { tool: "eraser", label: "Eraser", Icon: Eraser, group: "markup" },
];

const MIN_ZOOM = 0.3;
const MAX_ZOOM = 5;
const PADDING = 32; // scroll-area padding around pages

export default function DocumentViewer({
  item,
  authorUid,
  authorName,
  comments,
  onCreateCommentFromAnchor,
  onOpenComment,
  onOpenSheet,
  scrollTarget,
}: Props) {
  const isPdf = item.fileType === "application/pdf";
  const isImage = item.fileType.startsWith("image/");

  const [annotations, setAnnotations] = useState<DocumentAnnotation[]>([]);
  const [numPages, setNumPages] = useState(0);
  const [zoom, setZoom] = useState(1); // multiplier; 1 == fit-width
  const [pageAspect, setPageAspect] = useState<number | null>(null); // height / width
  const [imageAspect, setImageAspect] = useState<number | null>(null);
  const [currentPage, setCurrentPage] = useState(1);
  const [activeTool, setActiveTool] = useState<Tool>("select");
  const [containerW, setContainerW] = useState(700);
  const [containerH, setContainerH] = useState(600);
  const [flashCommentId, setFlashCommentId] = useState<string | null>(null);

  const scrollRef = useRef<HTMLDivElement>(null);
  const pageRefs = useRef<Map<number, HTMLDivElement>>(new Map());

  useEffect(() => {
    if (!isPdf && !isImage) return;
    return watchDocumentAnnotations(item.id, setAnnotations);
  }, [item.id, isPdf, isImage]);

  // Measure the scroll area.
  useEffect(() => {
    const el = scrollRef.current;
    if (!el) return;
    const measure = () => {
      setContainerW(el.clientWidth);
      setContainerH(el.clientHeight);
    };
    measure();
    const ro = new ResizeObserver(measure);
    ro.observe(el);
    return () => ro.disconnect();
  }, [isPdf, isImage]);

  const fitWidth = Math.max(120, containerW - PADDING);
  const pageWidth = fitWidth * zoom;

  // Track the most-visible page for the indicator.
  useEffect(() => {
    if (!isPdf || numPages === 0) return;
    const io = new IntersectionObserver(
      (entries) => {
        const visible = entries
          .filter((e) => e.isIntersecting)
          .sort((a, b) => b.intersectionRatio - a.intersectionRatio)[0];
        if (visible) {
          const n = Number((visible.target as HTMLElement).dataset.pageWrap);
          if (n) setCurrentPage(n);
        }
      },
      { root: scrollRef.current, threshold: [0.25, 0.5, 0.75] }
    );
    pageRefs.current.forEach((el) => io.observe(el));
    return () => io.disconnect();
  }, [isPdf, numPages, pageWidth]);

  const scrollToPage = useCallback((n: number) => {
    pageRefs.current.get(n)?.scrollIntoView({ behavior: "smooth", block: "start" });
  }, []);

  // Jump-to-anchor from the Comment Sheet.
  useEffect(() => {
    if (!scrollTarget) return;
    const c = comments.find((x) => x.id === scrollTarget.commentId);
    if (!c?.anchor) return;
    scrollToPage(c.anchor.page);
    setFlashCommentId(c.id);
    const t = setTimeout(() => setFlashCommentId(null), 2200);
    return () => clearTimeout(t);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [scrollTarget?.nonce]);

  function zoomBy(factor: number) {
    setZoom((z) => Math.min(MAX_ZOOM, Math.max(MIN_ZOOM, z * factor)));
  }
  function fitToWidth() {
    setZoom(1);
  }
  function fitToPage() {
    const aspect = isImage ? imageAspect : pageAspect;
    if (!aspect) return;
    const avail = containerH - PADDING;
    const z = avail / (fitWidth * aspect);
    setZoom(Math.min(MAX_ZOOM, Math.max(MIN_ZOOM, z)));
  }

  function handleWheel(e: React.WheelEvent) {
    if (e.ctrlKey || e.metaKey) {
      e.preventDefault();
      zoomBy(e.deltaY < 0 ? 1.1 : 1 / 1.1);
    }
  }

  const commentsByPage = useMemo(() => {
    const map = new Map<number, DocumentComment[]>();
    comments.forEach((c) => {
      if (!c.anchor) return;
      const arr = map.get(c.anchor.page) ?? [];
      arr.push(c);
      map.set(c.anchor.page, arr);
    });
    return map;
  }, [comments]);

  const anchoredCount = useMemo(() => comments.filter((c) => c.anchor).length, [comments]);

  // ---- Non-previewable fallback ----
  if (!isPdf && !isImage) {
    return (
      <div className="flex h-full flex-col items-center justify-center gap-3 rounded-card border border-bordergray bg-fog">
        <div className="flex h-16 w-16 items-center justify-center rounded-full" style={{ background: "#e7e6fa" }}>
          <FileText size={28} style={{ color: "#0d08d2" }} />
        </div>
        <p className="text-sm font-medium text-ink">{item.fileName || "No file"}</p>
        <p className="text-xs text-gray-400">Preview not available for this file type</p>
        {item.fileUrl && (
          <a href={item.fileUrl} target="_blank" rel="noreferrer" className="flex items-center gap-1.5 rounded-btn border border-bordergray px-3 py-1.5 text-sm text-indigo hover:bg-gray-50">
            <ExternalLink size={14} /> Open / Download
          </a>
        )}
      </div>
    );
  }

  const toolBtn = (t: (typeof TOOLBAR)[number]) => (
    <button
      key={t.tool}
      onClick={() => setActiveTool(t.tool)}
      title={t.label}
      className="flex items-center gap-1 rounded-btn border px-2 py-1.5 text-[11px] font-semibold transition-colors"
      style={
        activeTool === t.tool
          ? { background: "#0d08d2", borderColor: "#0d08d2", color: "#fff" }
          : { borderColor: "#e6e6f0", color: "#595b78" }
      }
    >
      <t.Icon size={13} /> {t.label}
    </button>
  );

  return (
    <div className="relative flex h-full flex-col">
      {/* On-page shortcut into the Comment Sheet — shows how many comments live on this document */}
      {anchoredCount > 0 && (
        <button
          onClick={onOpenSheet}
          title={`View ${anchoredCount} comment${anchoredCount === 1 ? "" : "s"} on this document`}
          className="absolute right-2 top-1/2 z-20 flex -translate-y-1/2 flex-col items-center gap-1 rounded-full border border-bordergray bg-white px-2 py-3 shadow-panel transition-colors hover:bg-gray-50"
        >
          <MessageSquareText size={17} style={{ color: "#0d08d2" }} />
          <span className="flex h-4 min-w-4 items-center justify-center rounded-full bg-indigo px-1 text-[10px] font-bold text-white">
            {anchoredCount}
          </span>
        </button>
      )}

      {/* Toolbar */}
      <div className="mb-2 flex flex-wrap items-center justify-between gap-2">
        <div className="flex items-center gap-1.5">
          <button onClick={() => zoomBy(1 / 1.2)} title="Zoom out" className="flex h-7 w-7 items-center justify-center rounded-btn border border-bordergray text-gray-500 hover:bg-gray-50">
            <ZoomOut size={14} />
          </button>
          <span className="w-11 text-center text-xs tabular-nums text-gray-500">{Math.round(zoom * 100)}%</span>
          <button onClick={() => zoomBy(1.2)} title="Zoom in" className="flex h-7 w-7 items-center justify-center rounded-btn border border-bordergray text-gray-500 hover:bg-gray-50">
            <ZoomIn size={14} />
          </button>
          <button onClick={fitToWidth} title="Fit width" className="flex h-7 w-7 items-center justify-center rounded-btn border border-bordergray text-gray-500 hover:bg-gray-50">
            <MoveVertical size={14} className="rotate-90" />
          </button>
          <button onClick={fitToPage} title="Fit page" className="flex h-7 w-7 items-center justify-center rounded-btn border border-bordergray text-gray-500 hover:bg-gray-50">
            <Maximize2 size={14} />
          </button>
          {isPdf && numPages > 0 && (
            <span className="ml-1 text-xs text-gray-500">Page {currentPage} / {numPages}</span>
          )}
        </div>

        <div className="flex items-center gap-1">
          {TOOLBAR.filter((t) => t.group === "review").map(toolBtn)}
          <span className="mx-1 h-4 w-px bg-bordergray" />
          {TOOLBAR.filter((t) => t.group === "markup").map(toolBtn)}
        </div>
      </div>

      {/* Body: thumbnails + scroll area */}
      <div className="flex flex-1 gap-3 overflow-hidden">
        {isPdf ? (
          <PdfDocument
            file={item.fileUrl}
            onLoadSuccess={({ numPages }) => setNumPages(numPages)}
            loading={<div className="flex flex-1 items-center justify-center text-sm text-gray-400">Loading PDF…</div>}
            error={<div className="flex flex-1 items-center justify-center text-sm text-critical">Could not load this PDF.</div>}
            className="flex flex-1 gap-3 overflow-hidden"
          >
            {/* Thumbnail rail */}
            {numPages > 1 && (
              <div className="scroll-thin hidden w-[130px] shrink-0 flex-col gap-2 overflow-auto rounded-card border border-bordergray bg-gray-50 p-2 md:flex">
                {Array.from({ length: numPages }, (_, i) => i + 1).map((n) => (
                  <button
                    key={n}
                    onClick={() => scrollToPage(n)}
                    className={`overflow-hidden rounded border-2 transition-colors ${currentPage === n ? "border-indigo" : "border-transparent hover:border-gray-300"}`}
                  >
                    <PdfPage pageNumber={n} width={110} renderTextLayer={false} renderAnnotationLayer={false} loading="" />
                    <div className="bg-white py-0.5 text-center text-[10px] text-gray-500">{n}</div>
                  </button>
                ))}
              </div>
            )}

            {/* Main scroll area */}
            <div ref={scrollRef} onWheel={handleWheel} className="scroll-thin flex-1 overflow-auto rounded-card border border-bordergray bg-gray-100" style={{ padding: PADDING / 2 }}>
              <div className="mx-auto flex flex-col items-center gap-4" style={{ width: pageWidth }}>
                {Array.from({ length: numPages }, (_, i) => i + 1).map((n) => (
                  <div
                    key={n}
                    data-page-wrap={n}
                    ref={(el) => {
                      if (el) pageRefs.current.set(n, el);
                      else pageRefs.current.delete(n);
                    }}
                    className="w-full shadow-panel"
                  >
                    <PageSurface
                      documentId={item.id}
                      pageNumber={n}
                      annotations={annotations.filter((a) => a.page === n)}
                      comments={commentsByPage.get(n) ?? []}
                      activeTool={activeTool}
                      authorUid={authorUid}
                      authorName={authorName}
                      flashCommentId={flashCommentId}
                      onCreateCommentFromAnchor={onCreateCommentFromAnchor}
                      onOpenComment={onOpenComment}
                    >
                      <PdfPage
                        pageNumber={n}
                        width={pageWidth}
                        renderTextLayer
                        renderAnnotationLayer={false}
                        onLoadSuccess={(p) => {
                          if (n === 1 && !pageAspect) setPageAspect(p.height / p.width);
                        }}
                        loading={<div className="flex items-center justify-center bg-white" style={{ height: pageWidth * (pageAspect ?? 1.414) }}><span className="text-xs text-gray-300">Loading…</span></div>}
                      />
                    </PageSurface>
                  </div>
                ))}
              </div>
            </div>
          </PdfDocument>
        ) : (
          // ---- Image ----
          <div ref={scrollRef} onWheel={handleWheel} className="scroll-thin flex-1 overflow-auto rounded-card border border-bordergray bg-gray-100" style={{ padding: PADDING / 2 }}>
            <div className="mx-auto shadow-panel" style={{ width: pageWidth }}>
              <PageSurface
                documentId={item.id}
                pageNumber={1}
                annotations={annotations.filter((a) => a.page === 1)}
                comments={commentsByPage.get(1) ?? []}
                activeTool={activeTool}
                authorUid={authorUid}
                authorName={authorName}
                flashCommentId={flashCommentId}
                onCreateCommentFromAnchor={onCreateCommentFromAnchor}
                onOpenComment={onOpenComment}
              >
                <img
                  src={item.fileUrl}
                  alt={item.fileName}
                  className="w-full select-none"
                  draggable={false}
                  onLoad={(e) => {
                    const img = e.currentTarget;
                    if (!imageAspect) setImageAspect(img.naturalHeight / img.naturalWidth);
                  }}
                />
              </PageSurface>
            </div>
          </div>
        )}
      </div>

      {activeTool !== "select" && (
        <div
          className="mt-1.5 text-center text-[11px] font-medium"
          style={{
            color:
              activeTool === "eraser"
                ? "#e63946"
                : activeTool === "comment_area"
                ? "#0d08d2"
                : KIND_COLOR[activeTool === "comment" ? "comment" : (activeTool as AnnotationKind)],
          }}
        >
          {activeTool === "eraser"
            ? "Click any markup (pin, highlight, arrow, box) to remove it"
            : activeTool === "comment_area"
            ? "Drag a box on the document to raise a comment"
            : activeTool === "comment"
            ? "Click to drop a note pin"
            : `Drag to draw a ${activeTool}`}
          {" · "}
          <button onClick={() => setActiveTool("select")} className="underline">Done</button>
        </div>
      )}
    </div>
  );
}
