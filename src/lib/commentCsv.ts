import type { DocumentComment } from "../types";
import { COMMENT_STATUS_LABEL } from "./format";

/** Quote a CSV field per RFC 4180 (wrap in quotes, double any inner quotes). */
function csvCell(value: string | number): string {
  const s = String(value ?? "");
  return `"${s.replace(/"/g, '""')}"`;
}

/** Flatten a comment's reply thread into one human-readable cell. */
function threadText(comment: DocumentComment): string {
  return (comment.replies || [])
    .map((r) => `[${r.role === "responder" ? "Responder" : "Commenter"}] ${r.authorName}: ${r.text}`)
    .join("\n");
}

/**
 * Build a CSV string for a document's comment sheet — one row per comment, the
 * reply thread flattened into a single "Discussion" column so it opens cleanly
 * in Excel. No external library.
 */
export function commentsToCsv(comments: DocumentComment[]): string {
  const headers = [
    "No.",
    "Section",
    "Page",
    "Commenter",
    "Comment",
    "Responder",
    "Discussion",
    "Status",
    "Incorporated",
  ];
  const rows = comments.map((c) => [
    c.commentNo,
    c.section,
    c.page,
    c.commenterName,
    c.text,
    c.responderName,
    threadText(c),
    COMMENT_STATUS_LABEL[c.status],
    c.incorporated,
  ]);
  return [headers, ...rows]
    .map((row) => row.map(csvCell).join(","))
    .join("\r\n");
}

/** Trigger a client-side download of the given CSV text. */
export function downloadCsv(filename: string, csv: string): void {
  // Prepend a BOM so Excel reads UTF-8 (æøå etc.) correctly.
  const blob = new Blob(["﻿" + csv], { type: "text/csv;charset=utf-8" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}
