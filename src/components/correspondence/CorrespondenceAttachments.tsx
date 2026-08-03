import { useRef, useState } from "react";
import { Paperclip, Upload, FileText, ExternalLink } from "lucide-react";
import { Timestamp } from "firebase/firestore";
import type { CorrespondenceItem } from "../../types";
import { uploadCorrespondenceAttachment } from "../../firebase/storage";
import { formatDate } from "../../lib/format";
import { toast } from "../../lib/toast";

interface Props {
  item: CorrespondenceItem;
  authorName: string;
  onPatch: (patch: Partial<CorrespondenceItem>) => void;
}

export default function CorrespondenceAttachments({ item, authorName, onPatch }: Props) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [busy, setBusy] = useState(false);
  const attachments = item.attachments || [];

  async function handleFiles(files: FileList | null) {
    if (!files || files.length === 0) return;
    setBusy(true);
    try {
      const uploaded = [...attachments];
      for (const file of Array.from(files)) {
        const url = await uploadCorrespondenceAttachment(item.id, file);
        uploaded.push({
          name: file.name,
          url,
          uploadedBy: authorName,
          uploadedAt: Timestamp.now(),
        });
      }
      onPatch({ attachments: uploaded });
      toast.success("Attachment uploaded");
    } catch {
      toast.error("Upload failed");
    } finally {
      setBusy(false);
      if (inputRef.current) inputRef.current.value = "";
    }
  }

  return (
    <div className="rounded-card bg-white p-5 shadow-card">
      <div className="mb-3 flex items-center justify-between">
        <h3 className="flex items-center gap-2 text-[13px] font-semibold text-gray-700">
          <Paperclip size={15} /> Attachments ({attachments.length})
        </h3>
        <button
          onClick={() => inputRef.current?.click()}
          disabled={busy}
          className="flex items-center gap-1.5 rounded-btn border border-bordergray px-2.5 py-1.5 text-xs text-gray-600 hover:bg-gray-50 disabled:opacity-60"
        >
          <Upload size={14} /> {busy ? "Uploading…" : "Upload"}
        </button>
        <input
          ref={inputRef}
          type="file"
          multiple
          className="hidden"
          onChange={(e) => handleFiles(e.target.files)}
        />
      </div>

      {attachments.length === 0 ? (
        <p className="text-xs text-gray-400">No files attached yet.</p>
      ) : (
        <div className="flex flex-col gap-1.5">
          {attachments.map((a, i) => (
            <a
              key={i}
              href={a.url}
              target="_blank"
              rel="noreferrer"
              className="flex items-center gap-2 rounded-btn border border-bordergray px-3 py-2 hover:bg-gray-50"
            >
              <FileText size={16} className="text-gray-400" />
              <span className="min-w-0 flex-1">
                <span className="block truncate text-sm text-ink">{a.name}</span>
                <span className="block text-[11px] text-gray-400">
                  {a.uploadedBy} · {formatDate(a.uploadedAt)}
                </span>
              </span>
              <ExternalLink size={14} className="text-gray-300" />
            </a>
          ))}
        </div>
      )}
    </div>
  );
}
