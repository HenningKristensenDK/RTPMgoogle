import { useMemo, useState } from "react";
import type { RoleResponsibility } from "../../types";
import { pickResponsible } from "../../lib/format";

interface InitialValues {
  section?: string;
  page?: string;
  text?: string;
}

interface Props {
  roles: RoleResponsibility[];
  commenterName: string;
  /** Prefilled when the comment is raised from the PDF viewer (page + quoted text). */
  initial?: InitialValues;
  /** True when opened from the viewer — shows a hint that it's anchored to the page. */
  fromViewer?: boolean;
  onCreate: (data: {
    workstreamId: string;
    section: string;
    page: string;
    responderName: string;
    text: string;
  }) => void;
  onCancel: () => void;
}

const labelCls = "mb-1 block text-[12px] font-medium text-gray-500";
const fieldCls =
  "w-full rounded-input border border-bordergray bg-white px-2.5 py-2 text-sm text-ink outline-none focus:border-indigo focus:ring-1 focus:ring-indigo";

export default function NewCommentModal({ roles, commenterName, initial, fromViewer, onCreate, onCancel }: Props) {
  const [workstreamId, setWorkstreamId] = useState("");
  const [section, setSection] = useState(initial?.section ?? "");
  const [page, setPage] = useState(initial?.page ?? "");
  const [text, setText] = useState(initial?.text ?? "");

  // Responder defaults to the linked workstream's Responsible (contractor side).
  const responderName = useMemo(() => {
    const role = roles.find((r) => r.id === workstreamId);
    if (!role) return "";
    return role.responsibleContractor?.name ?? pickResponsible(role)?.name ?? "";
  }, [roles, workstreamId]);

  const canCreate = text.trim() !== "";

  function handleCreate() {
    if (!canCreate) return;
    onCreate({
      workstreamId,
      section: section.trim(),
      page: page.trim(),
      responderName,
      text: text.trim(),
    });
  }

  return (
    <div
      className="fixed inset-0 z-[60] flex items-center justify-center p-6"
      style={{ background: "rgba(7, 4, 116, 0.45)" }}
      onClick={(e) => e.target === e.currentTarget && onCancel()}
    >
      <div className="w-full max-w-md rounded-2xl bg-white p-6 shadow-2xl">
        <h2 className="text-[15px] font-semibold text-ink">New comment</h2>
        <p className="mt-1 text-[12px] text-gray-400">
          Raised by <span className="font-medium text-gray-600">{commenterName}</span>. The
          responder is set from the selected workstream.
        </p>
        {fromViewer && (
          <p className="mt-2 rounded-btn bg-indigo/5 px-2.5 py-1.5 text-[11px] font-medium text-indigo">
            📍 Anchored to page {page || "?"} — it will show as a marker on the document.
          </p>
        )}

        <div className="mt-4 flex flex-col gap-4">
          <div>
            <label className={labelCls}>Comment</label>
            <textarea
              autoFocus
              className={`${fieldCls} resize-none`}
              rows={4}
              value={text}
              onChange={(e) => setText(e.target.value)}
              placeholder="Describe the issue or question for the responder…"
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className={labelCls}>Section</label>
              <input
                className={fieldCls}
                value={section}
                onChange={(e) => setSection(e.target.value)}
                placeholder="e.g. 3.3"
              />
            </div>
            <div>
              <label className={labelCls}>Page</label>
              <input
                className={fieldCls}
                value={page}
                onChange={(e) => setPage(e.target.value)}
                placeholder="e.g. 6"
              />
            </div>
          </div>

          <div>
            <label className={labelCls}>Workstream</label>
            <select
              className={fieldCls}
              value={workstreamId}
              onChange={(e) => setWorkstreamId(e.target.value)}
            >
              <option value="">No workstream</option>
              {roles.map((r) => (
                <option key={r.id} value={r.id}>
                  {r.workstream}
                </option>
              ))}
            </select>
          </div>

          <div className="rounded-input border border-bordergray bg-fog px-3 py-2 text-[12px]">
            <span className="text-gray-500">Responder: </span>
            <span className="font-medium text-ink">
              {responderName || "— (pick a workstream)"}
            </span>
          </div>
        </div>

        <div className="mt-6 flex justify-end gap-2">
          <button
            onClick={onCancel}
            className="rounded-btn border border-bordergray px-4 py-1.5 text-sm text-gray-600 hover:bg-gray-50"
          >
            Cancel
          </button>
          <button
            onClick={handleCreate}
            disabled={!canCreate}
            className="rounded-btn bg-indigo px-4 py-1.5 text-sm font-semibold text-white hover:bg-indigo/90 disabled:cursor-not-allowed disabled:opacity-50"
          >
            Add comment
          </button>
        </div>
      </div>
    </div>
  );
}
