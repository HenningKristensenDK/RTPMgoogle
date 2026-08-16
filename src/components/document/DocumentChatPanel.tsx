import { useEffect, useState } from "react";
import { MessageSquare } from "lucide-react";
import type { DocumentItem, DocumentMessage, RoleResponsibility } from "../../types";
import { useAuthStore, currentIdentity } from "../../store/authStore";
import {
  watchDocumentMessages,
  sendDocumentMessage,
  toggleDocumentMessageReaction,
} from "../../firebase/firestore";
import { uploadDocumentChatImage } from "../../firebase/storage";
import { toast } from "../../lib/toast";
import ChatMessages from "../chat/ChatMessages";
import ChatInput from "../chat/ChatInput";

interface Props {
  item: DocumentItem;
  roles: RoleResponsibility[];
}

export default function DocumentChatPanel({ item, roles }: Props) {
  const user = useAuthStore((s) => s.user);
  const me = currentIdentity(user);

  const [messages, setMessages] = useState<DocumentMessage[]>([]);

  useEffect(() => {
    setMessages([]);
    return watchDocumentMessages(item.id, setMessages);
  }, [item.id]);

  async function handleSend(text: string, images: File[]) {
    let imageUrls: string[] = [];
    if (images.length > 0) {
      try {
        imageUrls = await Promise.all(
          images.map((file) => uploadDocumentChatImage(item.id, file))
        );
      } catch {
        toast.error("Could not upload image");
      }
    }

    await sendDocumentMessage({
      documentId: item.id,
      role: "user",
      content: text,
      authorUid: me.uid,
      authorName: me.name,
      authorAvatar: me.avatar ?? "",
      images: imageUrls,
    });
  }

  function handleReact(messageId: string, emoji: string) {
    const msg = messages.find((m) => m.id === messageId);
    void toggleDocumentMessageReaction(messageId, emoji, me.uid, msg?.reactions);
  }

  return (
    <div className="flex h-full flex-col bg-white">
      <div
        className="flex items-center gap-2 border-b px-4 py-3"
        style={{ borderColor: "#e6e6f0", borderTop: "3px solid #0d08d2" }}
      >
        <MessageSquare size={18} className="text-indigo" />
        <span className="text-sm font-bold" style={{ color: "#0d08d2" }}>
          {item.docId} Chat Log
        </span>
      </div>

      <ChatMessages messages={messages} mode="chat" currentUid={me.uid} onReact={handleReact} />

      <ChatInput mode="chat" members={roles} onSend={handleSend} />
    </div>
  );
}
