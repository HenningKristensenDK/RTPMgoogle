import { useEffect, useMemo, useState } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import { Upload, Trash2, FileText } from "lucide-react";
import {
  DOCUMENT_TYPES,
  type DocumentItem,
  type DocumentStatus,
  type DocumentType,
  type Organization,
} from "../types";
import { useDocumentStore } from "../store/documentStore";
import { useRiskStore } from "../store/riskStore";
import { useAuthStore, currentIdentity } from "../store/authStore";
import {
  createDocumentItem,
  deleteDocumentItem,
  updateDocumentItem,
  watchOrganizations,
} from "../firebase/firestore";
import { uploadDocumentFile } from "../firebase/storage";
import { DOCUMENT_STATUS_LABEL, formatDate, pickResponsible } from "../lib/format";
import { tierColor } from "../lib/tiers";
import { toast } from "../lib/toast";
import DocumentSummaryDashboard from "../components/document/DocumentSummaryDashboard";
import NewDocumentModal from "../components/document/NewDocumentModal";
import PersonAvatar from "../components/common/PersonAvatar";

function roleOrganizations(r: ReturnType<typeof useRiskStore.getState>["roles"][number]): string[] {
  return [
    r.accountable,
    ...r.consulted,
    r.responsibleCustomer,
    r.responsibleContractor,
    ...r.informedCustomer,
    ...r.informedContractor,
  ]
    .filter((p): p is NonNullable<typeof p> => p !== null)
    .map((p) => p.organization);
}

export default function DocumentBoard() {
  const navigate = useNavigate();
  const location = useLocation();
  const { items, loading } = useDocumentStore();
  const roles = useRiskStore((s) => s.roles);
  const projectId = useRiskStore((s) => s.projectId);
  const user = useAuthStore((s) => s.user);
  const me = currentIdentity(user);

  const [fType, setFType] = useState<DocumentType | "">("");
  const [fWorkstream, setFWorkstream] = useState("");
  const [fOrg, setFOrg] = useState("");
  const [fStatus, setFStatus] = useState<DocumentStatus | "">("");
  const [barWorkstream, setBarWorkstream] = useState<string | null>(null);
  const [barTodo, setBarTodo] = useState<string | null>(null);
  const [uploadOpen, setUploadOpen] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [orgs, setOrgs] = useState<Organization[]>([]);

  useEffect(() => {
    if (!projectId) return;
    return watchOrganizations(projectId, setOrgs);
  }, [projectId]);

  const workstreams = [...new Set(roles.map((r) => r.workstream))];
  const orgNames = [...new Set(roles.flatMap(roleOrganizations))];

  const filtered = useMemo(() => {
    return items.filter((item) => {
      const itemRoles = roles.filter((r) => item.workstreamIds.includes(r.id));
      if (fType && item.type !== fType) return false;
      if (fWorkstream && !itemRoles.some((r) => r.workstream === fWorkstream)) return false;
      if (fOrg && !itemRoles.some((r) => roleOrganizations(r).includes(fOrg))) return false;
      if (fStatus && item.status !== fStatus) return false;
      return true;
    });
  }, [items, roles, fType, fWorkstream, fOrg, fStatus]);

  const tableItems = useMemo(() => {
    return filtered.filter((item) => {
      const itemRoles = roles.filter((r) => item.workstreamIds.includes(r.id));
      if (barWorkstream && !itemRoles.some((r) => r.workstream === barWorkstream)) return false;
      if (
        barTodo &&
        !itemRoles.some(
          (r) => r.accountable.organization === barTodo || pickResponsible(r)?.organization === barTodo
        )
      )
        return false;
      return true;
    });
  }, [filtered, roles, barWorkstream, barTodo]);

  async function handleCreateItem(data: {
    title: string;
    type: DocumentType;
    workstreamIds: string[];
    file: File;
  }) {
    if (!projectId) return;
    setUploading(true);
    try {
      const id = await createDocumentItem(projectId, me.uid, {
        title: data.title,
        type: data.type,
        workstreamIds: data.workstreamIds,
      });
      const fileUrl = await uploadDocumentFile(id, data.file);
      await updateDocumentItem(id, {
        fileUrl,
        fileName: data.file.name,
        fileType: data.file.type,
      });
      setUploadOpen(false);
      navigate(`/documents/${id}`, { state: { background: location } });
    } catch {
      toast.error("Could not upload document");
    } finally {
      setUploading(false);
    }
  }

  const selectCls =
    "rounded-input border border-bordergray bg-white px-2.5 py-1.5 text-xs text-gray-600 outline-none focus:border-indigo";

  return (
    <div className="flex h-full flex-col">
      {/* Header */}
      <div className="flex items-center justify-between border-b border-bordergray bg-white px-6 py-4">
        <div>
          <h1 className="text-lg font-bold text-ink">Documents</h1>
          <p className="text-xs text-gray-400">
            {filtered.length} of {items.length} items
          </p>
        </div>
        <button
          onClick={() => setUploadOpen(true)}
          disabled={uploading}
          className="flex items-center gap-1.5 rounded-btn bg-indigo px-3 py-1.5 text-sm font-semibold text-white hover:bg-indigo/90 disabled:opacity-60"
        >
          <Upload size={16} /> {uploading ? "Uploading…" : "Upload"}
        </button>
      </div>

      {/* Filters */}
      <div className="flex flex-wrap items-center gap-2 border-b border-bordergray bg-white px-6 py-2.5">
        <select className={selectCls} value={fType} onChange={(e) => setFType(e.target.value as DocumentType | "")}>
          <option value="">All types</option>
          {DOCUMENT_TYPES.map((t) => (
            <option key={t} value={t}>
              {t}
            </option>
          ))}
        </select>
        <select className={selectCls} value={fWorkstream} onChange={(e) => setFWorkstream(e.target.value)}>
          <option value="">All workstreams</option>
          {workstreams.map((w) => (
            <option key={w}>{w}</option>
          ))}
        </select>
        <select className={selectCls} value={fOrg} onChange={(e) => setFOrg(e.target.value)}>
          <option value="">All organizations</option>
          {orgNames.map((o) => (
            <option key={o}>{o}</option>
          ))}
        </select>
        <select
          className={selectCls}
          value={fStatus}
          onChange={(e) => setFStatus(e.target.value as DocumentStatus | "")}
        >
          <option value="">All statuses</option>
          {(["registered", "sent_accountable", "sent_responsible", "completed", "obsolete"] as DocumentStatus[]).map(
            (s) => (
              <option key={s} value={s}>
                {DOCUMENT_STATUS_LABEL[s]}
              </option>
            )
          )}
        </select>
      </div>

      {/* Content */}
      <div className="scroll-thin flex-1 overflow-auto p-6">
        {loading ? (
          <div className="text-sm text-gray-400">Loading documents…</div>
        ) : (
          <>
            <DocumentSummaryDashboard
              items={filtered}
              roles={roles}
              orgs={orgs}
              selectedWorkstream={barWorkstream}
              onSelectWorkstream={setBarWorkstream}
              selectedTodo={barTodo}
              onSelectTodo={setBarTodo}
            />
            <TableView
              items={tableItems}
              roles={roles}
              orgs={orgs}
              onOpen={(id) => navigate(`/documents/${id}`, { state: { background: location } })}
            />
          </>
        )}
      </div>

      {uploadOpen && (
        <NewDocumentModal
          roles={roles}
          onCreate={handleCreateItem}
          onCancel={() => setUploadOpen(false)}
        />
      )}
    </div>
  );
}

function TableView({
  items,
  roles,
  orgs,
  onOpen,
}: {
  items: DocumentItem[];
  roles: ReturnType<typeof useRiskStore.getState>["roles"];
  orgs: Organization[];
  onOpen: (id: string) => void;
}) {
  const [deleteTarget, setDeleteTarget] = useState<DocumentItem | null>(null);
  const [deleting, setDeleting] = useState(false);

  async function handleDelete() {
    if (!deleteTarget) return;
    setDeleting(true);
    try {
      await deleteDocumentItem(deleteTarget.id);
      setDeleteTarget(null);
    } catch {
      toast.error("Could not delete document");
    } finally {
      setDeleting(false);
    }
  }

  return (
    <div className="overflow-hidden rounded-card border border-bordergray bg-white shadow-card">
      <table className="w-full text-left text-sm">
        <thead className="bg-gray-50 text-[11px] uppercase tracking-wide text-gray-400">
          <tr>
            <th className="px-4 py-2.5">ID</th>
            <th className="px-4 py-2.5">Document Name</th>
            <th className="px-4 py-2.5">Type</th>
            <th className="px-4 py-2.5">Status</th>
            <th className="px-4 py-2.5">Workstream</th>
            <th className="px-4 py-2.5">Current owner</th>
            <th className="px-4 py-2.5">Updated</th>
            <th className="px-4 py-2.5"></th>
          </tr>
        </thead>
        <tbody>
          {items.map((item) => {
            const itemRoles = roles.filter((r) => item.workstreamIds.includes(r.id));
            const owner =
              item.status === "sent_accountable"
                ? itemRoles[0]?.accountable
                : item.status === "sent_responsible"
                ? itemRoles.map(pickResponsible).find((p) => p !== null)
                : null;
            const workstreams = [...new Set(itemRoles.map((r) => r.workstream))];
            const isObsolete = item.status === "obsolete";
            return (
              <tr
                key={item.id}
                onClick={() => onOpen(item.id)}
                className={`cursor-pointer border-t border-bordergray hover:bg-gray-50 ${
                  isObsolete ? "opacity-50" : ""
                }`}
              >
                <td className="px-4 py-2.5 font-mono text-[12px] text-gray-500">{item.docId}</td>
                <td className="px-4 py-2.5 font-medium text-ink">
                  <span className="flex items-center gap-2">
                    <FileText size={14} className="shrink-0 text-gray-400" />
                    {item.title}
                  </span>
                </td>
                <td className="px-4 py-2.5 text-gray-500">{item.type}</td>
                <td className="px-4 py-2.5 text-gray-600">{DOCUMENT_STATUS_LABEL[item.status]}</td>
                <td className="px-4 py-2.5 text-gray-500">{workstreams.join(", ") || "—"}</td>
                <td className="px-4 py-2.5">
                  {owner ? (
                    <span className="flex items-center gap-2">
                      <PersonAvatar
                        name={owner.name}
                        ringColor={tierColor(orgs, owner.organization)}
                        size={24}
                      />
                      <span className="text-xs text-gray-600">{owner.name}</span>
                    </span>
                  ) : (
                    "—"
                  )}
                </td>
                <td className="px-4 py-2.5 text-gray-500">{formatDate(item.updatedAt)}</td>
                <td className="px-4 py-2.5 text-right">
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      setDeleteTarget(item);
                    }}
                    title="Delete document"
                    className="rounded-btn p-1.5 text-gray-400 hover:bg-red-50 hover:text-critical"
                  >
                    <Trash2 size={15} />
                  </button>
                </td>
              </tr>
            );
          })}
          {items.length === 0 && (
            <tr>
              <td colSpan={8} className="px-4 py-8 text-center text-gray-300">
                No documents match the current filters.
              </td>
            </tr>
          )}
        </tbody>
      </table>

      {deleteTarget && (
        <div className="fixed inset-0 z-40 flex items-center justify-center bg-black/30">
          <div className="w-[320px] rounded-card bg-white p-5 shadow-panel">
            <p className="text-sm font-semibold text-ink">Delete document?</p>
            <p className="mt-1 text-sm text-gray-500">
              <span className="font-medium text-ink">
                {deleteTarget.docId} — {deleteTarget.title}
              </span>{" "}
              will be permanently deleted. This can't be undone.
            </p>
            <div className="mt-4 flex justify-end gap-2">
              <button
                onClick={() => setDeleteTarget(null)}
                disabled={deleting}
                className="rounded-btn border border-bordergray px-3 py-1.5 text-sm text-gray-600 hover:bg-gray-50 disabled:opacity-50"
              >
                Cancel
              </button>
              <button
                onClick={handleDelete}
                disabled={deleting}
                className="rounded-btn bg-critical px-3 py-1.5 text-sm font-semibold text-white hover:opacity-90 disabled:opacity-50"
              >
                {deleting ? "Deleting…" : "Delete"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
