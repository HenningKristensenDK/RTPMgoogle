import { useState } from "react";
import { ClipboardList, Paperclip } from "lucide-react";
import type { Risk, RiskKind, RiskStatus, RoleResponsibility } from "../../types";
import { useChatStore } from "../../store/chatStore";
import RiskHeader from "./RiskHeader";
import RiskStatusBar from "./RiskStatusBar";
import RiskMetadata from "./RiskMetadata";
import RiskMitigationPlan from "./RiskMitigationPlan";
import RelatedChangeCard from "./RelatedChangeCard";
import InvolvedPartiesCard from "./InvolvedPartiesCard";
import RiskChecklist from "./RiskChecklist";
import RiskNotes from "./RiskNotes";
import RiskAttachments from "./RiskAttachments";
import ChatPanel from "../chat/ChatPanel";

interface Props {
  risk: Risk;
  roles: RoleResponsibility[];
  authorName: string;
  onPatch: (patch: Partial<Risk>) => void;
  onChangeStatus: (to: RiskStatus) => void;
  onChangeKind: (kind: RiskKind) => void;
}

type Tab = "details" | "attachments";

export default function RiskPanel({
  risk,
  roles,
  authorName,
  onPatch,
  onChangeStatus,
  onChangeKind,
}: Props) {
  const [tab, setTab] = useState<Tab>("details");
  const { open, toggleOpen } = useChatStore();

  const tabBase =
    "flex items-center gap-2 rounded-btn px-3 py-1.5 text-sm font-medium transition-colors";

  return (
    <div className="flex h-full">
      {/* LEFT COLUMN */}
      <div
        className={`scroll-thin h-full overflow-auto px-6 py-5 ${
          open ? "w-[60%]" : "w-full"
        }`}
      >
        <div className="mx-auto flex max-w-3xl flex-col gap-3">
          <RiskHeader
            risk={risk}
            onTitleChange={(title) => onPatch({ title })}
            onChangeKind={onChangeKind}
          />

          <RiskStatusBar
            risk={risk}
            onChangeStatus={onChangeStatus}
            onCycleTrend={(trend) => onPatch({ trend })}
          />

          {/* Tabs */}
          <div className="flex gap-2">
            <button
              onClick={() => setTab("details")}
              className={`${tabBase} ${
                tab === "details"
                  ? "bg-indigo text-white"
                  : "border border-bordergray bg-white text-gray-600 hover:bg-gray-50"
              }`}
            >
              <ClipboardList size={15} /> Task details
            </button>
            <button
              onClick={() => setTab("attachments")}
              className={`${tabBase} ${
                tab === "attachments"
                  ? "bg-indigo text-white"
                  : "border border-bordergray bg-white text-gray-600 hover:bg-gray-50"
              }`}
            >
              <Paperclip size={15} /> Attachments (
              {risk.attachments?.length || 0})
            </button>
          </div>

          {tab === "details" ? (
            <>
              <RiskMetadata risk={risk} roles={roles} onPatch={onPatch} />
              <RiskMitigationPlan risk={risk} onPatch={onPatch} />
              <RelatedChangeCard riskId={risk.riskId} />
              <InvolvedPartiesCard
                roles={roles}
                selectedIds={risk.workstreamIds}
              />
              <RiskChecklist risk={risk} onPatch={onPatch} />
              <RiskNotes risk={risk} onPatch={onPatch} />
            </>
          ) : (
            <RiskAttachments
              risk={risk}
              authorName={authorName}
              onPatch={onPatch}
            />
          )}
        </div>
      </div>

      {/* RIGHT COLUMN — chat */}
      {open && (
        <div className="h-full w-[40%] border-l border-bordergray">
          <ChatPanel
            risk={risk}
            roles={roles}
            onClose={() => toggleOpen()}
          />
        </div>
      )}
    </div>
  );
}
