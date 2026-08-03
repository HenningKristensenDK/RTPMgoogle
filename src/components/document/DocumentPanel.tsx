import { lazy, Suspense, useState } from "react";
import { FileText, MessageSquare } from "lucide-react";
import type { DocumentItem, DocumentStatus, RoleResponsibility } from "../../types";
import DocumentHeader from "./DocumentHeader";
import DocumentStatusBar from "./DocumentStatusBar";
import DocumentMetadata from "./DocumentMetadata";
import DocumentNotes from "./DocumentNotes";
import InvolvedPartiesCard from "../risk/InvolvedPartiesCard";
import DocumentChatPanel from "./DocumentChatPanel";

// Lazy-loaded so react-pdf/pdfjs-dist only load when a document is actually opened.
const DocumentViewer = lazy(() => import("./DocumentViewer"));

interface Props {
  item: DocumentItem;
  roles: RoleResponsibility[];
  authorUid: string;
  authorName: string;
  onPatch: (patch: Partial<DocumentItem>) => void;
  onChangeStatus: (to: DocumentStatus) => void;
}

type SidebarTab = "details" | "chat";

export default function DocumentPanel({
  item,
  roles,
  authorUid,
  authorName,
  onPatch,
  onChangeStatus,
}: Props) {
  const [tab, setTab] = useState<SidebarTab>("details");

  const tabBase =
    "flex flex-1 items-center justify-center gap-1.5 rounded-btn py-1.5 text-xs font-semibold transition-colors";

  return (
    <div className="flex h-full gap-4 p-5">
      {/* Viewer — dominant column */}
      <div className="min-w-0 flex-[1.6]">
        <Suspense
          fallback={
            <div className="flex h-full items-center justify-center text-sm text-gray-400">
              Loading viewer…
            </div>
          }
        >
          <DocumentViewer item={item} authorUid={authorUid} authorName={authorName} />
        </Suspense>
      </div>

      {/* Sidebar — Details / Chat */}
      <div className="scroll-thin flex w-[380px] shrink-0 flex-col gap-3 overflow-auto">
        <div className="flex gap-1 rounded-btn border border-bordergray bg-white p-1">
          <button
            onClick={() => setTab("details")}
            className={`${tabBase} ${
              tab === "details" ? "bg-indigo text-white" : "text-gray-500 hover:bg-gray-50"
            }`}
          >
            <FileText size={13} /> Details
          </button>
          <button
            onClick={() => setTab("chat")}
            className={`${tabBase} ${
              tab === "chat" ? "bg-indigo text-white" : "text-gray-500 hover:bg-gray-50"
            }`}
          >
            <MessageSquare size={13} /> Chat
          </button>
        </div>

        {tab === "details" ? (
          <>
            <DocumentHeader item={item} onTitleChange={(title) => onPatch({ title })} />
            <DocumentStatusBar item={item} roles={roles} onChangeStatus={onChangeStatus} />
            <DocumentMetadata item={item} roles={roles} onPatch={onPatch} />
            <InvolvedPartiesCard roles={roles} selectedIds={item.workstreamIds} />
            <DocumentNotes item={item} onPatch={onPatch} />
          </>
        ) : (
          <div className="h-full min-h-[500px] overflow-hidden rounded-card border border-bordergray">
            <DocumentChatPanel item={item} roles={roles} />
          </div>
        )}
      </div>
    </div>
  );
}
