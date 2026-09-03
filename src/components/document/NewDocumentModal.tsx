import { useRef, useState } from "react";
import { Upload, FileText } from "lucide-react";
import {
  DOCUMENT_TYPES,
  type DocumentType,
  type RoleResponsibility,
} from "../../types";

interface Props {
  roles: RoleResponsibility[];
  onCreate: (data: {
    title: string;
    type: DocumentType;
    workstreamIds: string[];
    file: File;
  }) => void;
  onCancel: () => void;
}

const labelCls = "mb-1 block text-[12px] font-medium text-gray-500";
const fieldCls =
  "w-full rounded-input border border-bordergray bg-white px-2.5 py-2 text-sm text-ink outline-none focus:border-indigo focus:ring-1 focus:ring-indigo";

export default function NewDocumentModal({ roles, onCreate, onCancel }: Props) {
  const [type, setType] = useState<DocumentType>("Drawing");
  const [title, setTitle] = useState("");
  const [workstreamIds, setWorkstreamIds] = useState<string[]>([]);
  const [file, setFile] = useState<File | null>(null);
  const [confirmDiscard, setConfirmDiscard] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const dirty = title.trim() !== "" || workstreamIds.length > 0 || file !== null;
  const canCreate = file !== null;

  function requestClose() {
    if (dirty) setConfirmDiscard(true);
    else onCancel();
  }

  function toggleWorkstream(id: string) {
    setWorkstreamIds((prev) =>
      prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]
    );
  }

  function handleCreate() {
    if (!file) return;
    onCreate({
      title: title.trim() || file.name,
      type,
      workstreamIds,
      file,
    });
  }

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-6"
      style={{ background: "rgba(7, 4, 116, 0.45)" }}
      onClick={(e) => e.target === e.currentTarget && requestClose()}
    >
      <div className="w-full max-w-md rounded-2xl bg-white p-6 shadow-2xl">
        <h2 className="text-[15px] font-semibold text-ink">Upload document</h2>
        <p className="mt-1 text-[12px] text-gray-400">
          Pick a file, then fill in the basics — you can add more detail after creating it.
        </p>

        <div className="mt-4 flex flex-col gap-4">
          <div>
            <label className={labelCls}>File</label>
            <input
              ref={fileInputRef}
              type="file"
              className="hidden"
              onChange={(e) => {
                const f = e.target.files?.[0];
                if (f) {
                  setFile(f);
                  if (!title.trim()) setTitle(f.name.replace(/\.[^.]+$/, ""));
                }
              }}
            />
            {file ? (
              <div className="flex items-center gap-2 rounded-input border border-bordergray px-3 py-2">
                <FileText size={16} className="shrink-0 text-gray-400" />
                <span className="min-w-0 flex-1 truncate text-sm text-ink">{file.name}</span>
                <button
                  type="button"
                  onClick={() => fileInputRef.current?.click()}
                  className="shrink-0 text-xs font-medium text-indigo hover:underline"
                >
                  Change
                </button>
              </div>
            ) : (
              <button
                type="button"
                onClick={() => fileInputRef.current?.click()}
                className="flex w-full items-center justify-center gap-1.5 rounded-input border border-dashed border-bordergray px-3 py-4 text-sm text-gray-500 hover:bg-gray-50"
              >
                <Upload size={15} /> Choose a file
              </button>
            )}
          </div>

          <div>
            <label className={labelCls}>Title</label>
            <input
              className={fieldCls}
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="e.g. Foundation layout drawing Rev C"
            />
          </div>

          <div>
            <label className={labelCls}>Document Type</label>
            <div className="flex flex-wrap gap-1.5">
              {DOCUMENT_TYPES.map((t) => (
                <button
                  key={t}
                  type="button"
                  onClick={() => setType(t)}
                  className={`rounded-full px-2.5 py-1 text-[11px] font-medium ${
                    type === t
                      ? "bg-indigo text-white"
                      : "border border-bordergray text-gray-600 hover:bg-gray-50"
                  }`}
                >
                  {t}
                </button>
              ))}
            </div>
          </div>

          <div>
            <label className={labelCls}>Workstream</label>
            <div className="flex max-h-32 flex-wrap gap-1.5 overflow-auto rounded-input border border-bordergray p-2">
              {roles.length === 0 && (
                <span className="text-sm text-gray-400">No workstreams available</span>
              )}
              {roles.map((r) => (
                <button
                  key={r.id}
                  type="button"
                  onClick={() => toggleWorkstream(r.id)}
                  className={`rounded-full px-2.5 py-1 text-[11px] font-medium ${
                    workstreamIds.includes(r.id)
                      ? "bg-indigo text-white"
                      : "border border-bordergray text-gray-600 hover:bg-gray-50"
                  }`}
                >
                  {r.workstream}
                </button>
              ))}
            </div>
          </div>
        </div>

        <div className="mt-6 flex justify-end gap-2">
          <button
            onClick={requestClose}
            className="rounded-btn border border-bordergray px-4 py-1.5 text-sm text-gray-600 hover:bg-gray-50"
          >
            Cancel
          </button>
          <button
            onClick={handleCreate}
            disabled={!canCreate}
            className="rounded-btn bg-indigo px-4 py-1.5 text-sm font-semibold text-white hover:bg-indigo/90 disabled:cursor-not-allowed disabled:opacity-50"
          >
            Upload
          </button>
        </div>
      </div>

      {confirmDiscard && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/20"
          onClick={(e) => e.stopPropagation()}
        >
          <div className="w-[320px] rounded-card bg-white p-5 shadow-panel">
            <p className="text-sm font-semibold text-ink">Discard this upload?</p>
            <p className="mt-1 text-sm text-gray-500">
              You've entered some details that haven't been saved yet.
            </p>
            <div className="mt-4 flex flex-wrap justify-end gap-2">
              <button
                onClick={() => setConfirmDiscard(false)}
                className="rounded-btn border border-bordergray px-3 py-1.5 text-sm text-gray-600 hover:bg-gray-50"
              >
                Keep editing
              </button>
              <button
                onClick={onCancel}
                className="rounded-btn border border-critical px-3 py-1.5 text-sm font-semibold text-critical hover:bg-red-50"
              >
                Discard
              </button>
              {canCreate && (
                <button
                  onClick={handleCreate}
                  className="rounded-btn bg-indigo px-3 py-1.5 text-sm font-semibold text-white hover:bg-indigo/90"
                >
                  Upload
                </button>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
