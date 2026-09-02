import { useEffect, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { ArrowLeft, MessageSquare, X } from "lucide-react";
import { useChatStore } from "../store/chatStore";
import type { Risk, RiskKind, RiskStatus } from "../types";
import { watchRisk, changeRiskStatus, nextRiskCode } from "../firebase/firestore";
import { useRiskStore } from "../store/riskStore";
import { useAuthStore, currentIdentity } from "../store/authStore";
import { STATUS_LABEL, riskKind } from "../lib/format";
import { toast } from "../lib/toast";
import RiskPanel from "../components/risk/RiskPanel";
import SendUpdateModal from "../components/risk/SendUpdateModal";

export default function RiskDetail() {
  const { riskId } = useParams<{ riskId: string }>();
  const navigate = useNavigate();
  const roles = useRiskStore((s) => s.roles);
  const projectId = useRiskStore((s) => s.projectId);
  const patchRisk = useRiskStore((s) => s.patchRisk);
  const user = useAuthStore((s) => s.user);
  const me = currentIdentity(user);
  const { setOpen } = useChatStore();

  const [risk, setRisk] = useState<Risk | null>(null);
  const [notFound, setNotFound] = useState(false);
  const [sendUpdateOpen, setSendUpdateOpen] = useState(false);

  useEffect(() => {
    if (!riskId) return;
    const unsub = watchRisk(riskId, (r) => {
      setRisk(r);
      setNotFound(r === null);
    });
    return unsub;
  }, [riskId]);

  function close() {
    navigate("/risks");
  }

  async function handleChangeStatus(to: RiskStatus) {
    if (!risk) return;
    const from = risk.status;
    try {
      await changeRiskStatus(risk.id, from, to, me.name, "");
      toast.success(`Status set to ${STATUS_LABEL[to]}`);
    } catch {
      toast.error("Failed to update status");
    }
  }

  // Re-issues the RK-/OP- code along with the kind so the badge never shows a
  // mismatched prefix (e.g. an Opportunity still labeled "RK-011").
  async function handleChangeKind(kind: RiskKind) {
    if (!risk || riskKind(risk) === kind) return;
    try {
      const newCode = await nextRiskCode(projectId, kind);
      await patchRisk(risk.id, { kind, riskId: newCode });
    } catch {
      toast.error("Could not change type");
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
            Risk not found.{" "}
            <button onClick={close} className="text-indigo underline">
              Back to Risk Register
            </button>
          </div>
        ) : !risk ? (
          <div className="p-8 text-sm text-gray-400">Loading risk…</div>
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
                  onClick={() => setSendUpdateOpen(true)}
                  className="rounded-btn px-4 py-1.5 text-sm font-semibold"
                  style={{ background: "#ffcc00", color: "#070474" }}
                >
                  Send Update
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
              <RiskPanel
                risk={risk}
                roles={roles}
                authorName={me.name}
                onPatch={(patch) => patchRisk(risk.id, patch)}
                onChangeStatus={handleChangeStatus}
                onChangeKind={handleChangeKind}
              />
            </div>
          </>
        )}
      </div>

      {sendUpdateOpen && risk && (
        <SendUpdateModal
          risk={risk}
          roles={roles}
          onClose={() => setSendUpdateOpen(false)}
        />
      )}
    </div>
  );
}
