import { useState } from "react";
import { ClipboardList, Paperclip } from "lucide-react";
import type { CorrespondenceItem, CorrespondenceStatus, RoleResponsibility } from "../../types";
import { useChatStore } from "../../store/chatStore";
import CorrespondenceHeader from "./CorrespondenceHeader";
import CorrespondenceStatusBar from "./CorrespondenceStatusBar";
import CorrespondenceMetadata from "./CorrespondenceMetadata";
import CorrespondenceChecklist from "./CorrespondenceChecklist";
import CorrespondenceNotes from "./CorrespondenceNotes";
import CorrespondenceAttachments from "./CorrespondenceAttachments";
import InvolvedPartiesCard from "../risk/InvolvedPartiesCard";
import CorrespondenceChatPanel from "./CorrespondenceChatPanel";

interface Props {
  item: CorrespondenceItem;
  roles: RoleResponsibility[];
  authorName: string;
  onPatch: (patch: Partial<CorrespondenceItem>) => void;
  onChangeStatus: (to: CorrespondenceStatus) => void;
}

type Tab = "details" | "attachments";

export default function CorrespondencePanel({
  item,
  roles,
  authorName,
  onPatch,
  onChangeStatus,
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
          <CorrespondenceHeader
            item={item}
            onTitleChange={(title) => onPatch({ title })}
          />

          <CorrespondenceStatusBar
            item={item}
            roles={roles}
            onChangeStatus={onChangeStatus}
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
              <ClipboardList size={15} /> Item details
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
              {item.attachments?.length || 0})
            </button>
          </div>

          {tab === "details" ? (
            <>
              <CorrespondenceMetadata item={item} roles={roles} onPatch={onPatch} />
              <InvolvedPartiesCard roles={roles} selectedIds={item.workstreamIds} />
              <CorrespondenceChecklist item={item} onPatch={onPatch} />
              <CorrespondenceNotes item={item} onPatch={onPatch} />
            </>
          ) : (
            <CorrespondenceAttachments
              item={item}
              authorName={authorName}
              onPatch={onPatch}
            />
          )}
        </div>
      </div>

      {/* RIGHT COLUMN — chat */}
      {open && (
        <div className="h-full w-[40%] border-l border-bordergray">
          <CorrespondenceChatPanel
            item={item}
            roles={roles}
            onClose={() => toggleOpen()}
          />
        </div>
      )}
    </div>
  );
}
