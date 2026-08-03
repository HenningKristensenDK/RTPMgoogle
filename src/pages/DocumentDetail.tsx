import { useEffect, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { ArrowLeft, X } from "lucide-react";
import type { DocumentItem, DocumentStatus } from "../types";
import { watchDocumentItem, changeDocumentStatus } from "../firebase/firestore";
import { useDocumentStore } from "../store/documentStore";
import { useRiskStore } from "../store/riskStore";
import { useAuthStore, currentIdentity } from "../store/authStore";
import { DOCUMENT_STATUS_LABEL } from "../lib/format";
import { toast } from "../lib/toast";
import DocumentPanel from "../components/document/DocumentPanel";

export default function DocumentDetail() {
  const { docId } = useParams<{ docId: string }>();
  const navigate = useNavigate();
  const roles = useRiskStore((s) => s.roles);
  const patchItem = useDocumentStore((s) => s.patchItem);
  const user = useAuthStore((s) => s.user);
  const me = currentIdentity(user);

  const [item, setItem] = useState<DocumentItem | null>(null);
  const [notFound, setNotFound] = useState(false);

  useEffect(() => {
    if (!docId) return;
    const unsub = watchDocumentItem(docId, (i) => {
      setItem(i);
      setNotFound(i === null);
    });
    return unsub;
  }, [docId]);

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

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-6"
      style={{ background: "rgba(7, 4, 116, 0.45)" }}
      onClick={(e) => e.target === e.currentTarget && close()}
    >
      <div className="flex h-[88vh] w-full max-w-6xl flex-col overflow-hidden rounded-2xl bg-white shadow-2xl">
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
              <button
                onClick={close}
                title="Close"
                className="flex h-8 w-8 items-center justify-center rounded border border-bordergray text-gray-500 hover:bg-gray-50 hover:text-critical"
              >
                <X size={16} />
              </button>
            </div>
            <div className="flex-1 overflow-hidden">
              <DocumentPanel
                item={item}
                roles={roles}
                authorUid={me.uid}
                authorName={me.name}
                onPatch={(patch) => patchItem(item.id, patch)}
                onChangeStatus={handleChangeStatus}
              />
            </div>
          </>
        )}
      </div>
    </div>
  );
}
