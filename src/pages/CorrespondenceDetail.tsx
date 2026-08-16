import { useEffect, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { ArrowLeft, MessageSquare, X } from "lucide-react";
import { useChatStore } from "../store/chatStore";
import type { CorrespondenceItem, CorrespondenceStatus } from "../types";
import { watchCorrespondenceItem, changeCorrespondenceStatus } from "../firebase/firestore";
import { useCorrespondenceStore } from "../store/correspondenceStore";
import { useRiskStore } from "../store/riskStore";
import { useAuthStore, currentIdentity } from "../store/authStore";
import { CORRESPONDENCE_STATUS_LABEL } from "../lib/format";
import { toast } from "../lib/toast";
import CorrespondencePanel from "../components/correspondence/CorrespondencePanel";

export default function CorrespondenceDetail() {
  const { itemId } = useParams<{ itemId: string }>();
  const navigate = useNavigate();
  const roles = useRiskStore((s) => s.roles);
  const patchItem = useCorrespondenceStore((s) => s.patchItem);
  const user = useAuthStore((s) => s.user);
  const me = currentIdentity(user);
  const { setOpen } = useChatStore();

  const [item, setItem] = useState<CorrespondenceItem | null>(null);
  const [notFound, setNotFound] = useState(false);

  useEffect(() => {
    if (!itemId) return;
    const unsub = watchCorrespondenceItem(itemId, (i) => {
      setItem(i);
      setNotFound(i === null);
    });
    return unsub;
  }, [itemId]);

  function close() {
    navigate("/correspondence");
  }

  async function handleChangeStatus(to: CorrespondenceStatus) {
    if (!item) return;
    const from = item.status;
    try {
      await changeCorrespondenceStatus(item.id, from, to, me.name, "");
      toast.success(`Status set to ${CORRESPONDENCE_STATUS_LABEL[to]}`);
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
            Item not found.{" "}
            <button onClick={close} className="text-indigo underline">
              Back to Correspondence
            </button>
          </div>
        ) : !item ? (
          <div className="p-8 text-sm text-gray-400">Loading item…</div>
        ) : (
          <>
            <div className="flex items-center justify-between border-b border-bordergray bg-white px-6 py-3">
              <button
                onClick={close}
                className="flex items-center gap-1.5 text-sm text-gray-500 hover:text-gray-800"
              >
                <ArrowLeft size={16} /> Back
              </button>
              <div className="flex items-center gap-2">
                <button
                  onClick={() => setOpen(true)}
                  title="Open chat log"
                  className="flex h-8 w-8 items-center justify-center rounded border border-bordergray text-gray-500 hover:bg-gray-50 hover:text-indigo"
                >
                  <MessageSquare size={16} />
                </button>
                <button
                  onClick={close}
                  title="Close"
                  className="flex h-8 w-8 items-center justify-center rounded border border-bordergray text-gray-500 hover:bg-gray-50 hover:text-critical"
                >
                  <X size={16} />
                </button>
              </div>
            </div>
            <div className="flex-1 overflow-hidden">
              <CorrespondencePanel
                item={item}
                roles={roles}
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
