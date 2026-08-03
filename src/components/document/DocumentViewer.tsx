import { useEffect, useRef, useState } from "react";
import { Document as PdfDocument, Page as PdfPage, pdfjs } from "react-pdf";
import {
  ChevronLeft,
  ChevronRight,
  MessageSquarePlus,
  FileText,
  ExternalLink,
  Check,
  Trash2,
} from "lucide-react";
import type { DocumentAnnotation, DocumentItem } from "../../types";
import {
  watchDocumentAnnotations,
  addDocumentAnnotation,
  updateDocumentAnnotation,
  deleteDocumentAnnotation,
} from "../../firebase/firestore";
import { formatTime } from "../../lib/format";

pdfjs.GlobalWorkerOptions.workerSrc = new URL(
  "pdfjs-dist/build/pdf.worker.min.mjs",
  import.meta.url
).toString();

interface Props {
  item: DocumentItem;
  authorUid: string;
  authorName: string;
}

interface Draft {
  xPct: number;
  yPct: number;
  text: string;
}

export default function DocumentViewer({ item, authorUid, authorName }: Props) {
  const isPdf = item.fileType === "application/pdf";
  const isImage = item.fileType.startsWith("image/");

  const [annotations, setAnnotations] = useState<DocumentAnnotation[]>([]);
  const [page, setPage] = useState(1);
  const [numPages, setNumPages] = useState(1);
  const [addMode, setAddMode] = useState(false);
  const [draft, setDraft] = useState<Draft | null>(null);
  const [openPinId, setOpenPinId] = useState<string | null>(null);
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

  const pagePins = annotations.filter((a) => a.page === page);

  function handleSurfaceClick(e: React.MouseEvent<HTMLDivElement>) {
    if (!addMode || !wrapperRef.current) return;
    const rect = wrapperRef.current.getBoundingClientRect();
    const xPct = (e.clientX - rect.left) / rect.width;
    const yPct = (e.clientY - rect.top) / rect.height;
    setDraft({ xPct, yPct, text: "" });
    setAddMode(false);
    setOpenPinId(null);
  }

  async function saveDraft() {
    if (!draft || !draft.text.trim()) {
      setDraft(null);
      return;
    }
    await addDocumentAnnotation({
      documentId: item.id,
      page,
      xPct: draft.xPct,
      yPct: draft.yPct,
      text: draft.text.trim(),
      authorUid,
      authorName,
      resolved: false,
    });
    setDraft(null);
  }

  async function toggleResolved(a: DocumentAnnotation) {
    await updateDocumentAnnotation(a.id, { resolved: !a.resolved });
  }

  async function removePin(a: DocumentAnnotation) {
    await deleteDocumentAnnotation(a.id);
    setOpenPinId(null);
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

  return (
    <div className="flex h-full flex-col">
      {/* Toolbar */}
      <div className="mb-2 flex items-center justify-between">
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
        </div>
        <button
          onClick={() => {
            setAddMode((v) => !v);
            setDraft(null);
          }}
          className={`flex items-center gap-1.5 rounded-btn px-3 py-1.5 text-xs font-semibold ${
            addMode
              ? "bg-indigo text-white"
              : "border border-bordergray text-gray-600 hover:bg-gray-50"
          }`}
        >
          <MessageSquarePlus size={14} />{" "}
          {addMode ? "Click the document to place a comment" : "Add comment"}
        </button>
      </div>

      {/* Surface + comments sidebar */}
      <div className="flex flex-1 gap-3 overflow-hidden">
        <div className="scroll-thin flex-1 overflow-auto rounded-card border border-bordergray bg-gray-100 p-4">
          <div
            ref={wrapperRef}
            onClick={handleSurfaceClick}
            className={`relative mx-auto ${addMode ? "cursor-crosshair" : ""}`}
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

            {/* Existing pins */}
            {pagePins.map((a, i) => (
              <button
                key={a.id}
                onClick={(e) => {
                  e.stopPropagation();
                  setOpenPinId(openPinId === a.id ? null : a.id);
                }}
                className="absolute flex h-6 w-6 -translate-x-1/2 -translate-y-1/2 items-center justify-center rounded-full text-[11px] font-bold text-white shadow-panel"
                style={{
                  left: `${a.xPct * 100}%`,
                  top: `${a.yPct * 100}%`,
                  background: a.resolved ? "#9CA3AF" : "#ff8b00",
                }}
                title={a.text}
              >
                {i + 1}
              </button>
            ))}

            {/* Popover for the open pin */}
            {pagePins.map((a) =>
              openPinId === a.id ? (
                <div
                  key={`popover-${a.id}`}
                  onClick={(e) => e.stopPropagation()}
                  className="absolute z-10 w-56 -translate-x-1/2 rounded-card border border-bordergray bg-white p-3 shadow-panel"
                  style={{ left: `${a.xPct * 100}%`, top: `${a.yPct * 100}%`, marginTop: 14 }}
                >
                  <div className="mb-1 flex items-center justify-between">
                    <span className="text-[11px] font-semibold text-gray-700">{a.authorName}</span>
                    <span className="text-[10px] text-gray-400">{formatTime(a.createdAt)}</span>
                  </div>
                  <p className={`text-[12px] ${a.resolved ? "text-gray-400 line-through" : "text-ink"}`}>
                    {a.text}
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
                        onClick={() => removePin(a)}
                        className="flex items-center gap-1 text-[11px] font-medium text-critical hover:underline"
                      >
                        <Trash2 size={12} /> Delete
                      </button>
                    )}
                  </div>
                </div>
              ) : null
            )}

            {/* Draft (unsaved) pin */}
            {draft && (
              <div
                onClick={(e) => e.stopPropagation()}
                className="absolute z-10 w-56 -translate-x-1/2 rounded-card border border-indigo bg-white p-3 shadow-panel"
                style={{ left: `${draft.xPct * 100}%`, top: `${draft.yPct * 100}%` }}
              >
                <textarea
                  autoFocus
                  value={draft.text}
                  onChange={(e) => setDraft({ ...draft, text: e.target.value })}
                  placeholder="Add a comment…"
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
                    className="rounded-btn bg-indigo px-2 py-1 text-[11px] font-semibold text-white hover:bg-indigo/90"
                  >
                    Save
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Comments sidebar for current page */}
        <div className="scroll-thin flex w-[200px] shrink-0 flex-col gap-2 overflow-auto">
          <span className="text-[11px] font-semibold uppercase tracking-wide text-gray-400">
            Comments ({pagePins.length})
          </span>
          {pagePins.length === 0 ? (
            <p className="text-[11px] text-gray-300">No comments on this page yet.</p>
          ) : (
            pagePins.map((a, i) => (
              <button
                key={a.id}
                onClick={() => setOpenPinId(a.id)}
                className="rounded-btn border border-bordergray p-2 text-left hover:bg-gray-50"
              >
                <div className="flex items-center gap-1.5">
                  <span
                    className="flex h-4 w-4 shrink-0 items-center justify-center rounded-full text-[9px] font-bold text-white"
                    style={{ background: a.resolved ? "#9CA3AF" : "#ff8b00" }}
                  >
                    {i + 1}
                  </span>
                  <span className="truncate text-[11px] font-medium text-gray-700">{a.authorName}</span>
                </div>
                <p
                  className={`mt-1 line-clamp-2 text-[11px] ${
                    a.resolved ? "text-gray-400 line-through" : "text-gray-600"
                  }`}
                >
                  {a.text}
                </p>
              </button>
            ))
          )}
        </div>
      </div>
    </div>
  );
}
