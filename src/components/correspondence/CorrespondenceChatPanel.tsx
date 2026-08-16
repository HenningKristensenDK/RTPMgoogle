import { useEffect, useState } from "react";
import { MessageSquare, X } from "lucide-react";
import type { CorrespondenceItem, CorrespondenceMessage, RoleResponsibility } from "../../types";
import { useAuthStore, currentIdentity } from "../../store/authStore";
import {
  watchCorrespondenceMessages,
  sendCorrespondenceMessage,
  toggleCorrespondenceReaction,
} from "../../firebase/firestore";
import { uploadCorrespondenceChatImage } from "../../firebase/storage";
import { toast } from "../../lib/toast";
import ChatMessages from "../chat/ChatMessages";
import ChatInput from "../chat/ChatInput";

interface Props {
  item: CorrespondenceItem;
  roles: RoleResponsibility[];
  onClose: () => void;
}

export default function CorrespondenceChatPanel({ item, roles, onClose }: Props) {
  const user = useAuthStore((s) => s.user);
  const me = currentIdentity(user);

  const [messages, setMessages] = useState<CorrespondenceMessage[]>([]);

  useEffect(() => {
    setMessages([]);
    return watchCorrespondenceMessages(item.id, setMessages);
  }, [item.id]);

  async function handleSend(text: string, images: File[]) {
    let imageUrls: string[] = [];
    if (images.length > 0) {
      try {
        imageUrls = await Promise.all(
          images.map((file) => uploadCorrespondenceChatImage(item.id, file))
        );
      } catch {
        toast.error("Could not upload image");
      }
    }

    await sendCorrespondenceMessage({
      itemId: item.id,
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
    void toggleCorrespondenceReaction(messageId, emoji, me.uid, msg?.reactions);
  }

  return (
    <div className="flex h-full flex-col bg-white">
      {/* Header */}
      <div
        className="flex items-center justify-between border-b px-4 py-3"
        style={{ borderColor: "#e6e6f0", borderTop: "3px solid #0d08d2" }}
      >
        <div className="flex items-center gap-2">
          <MessageSquare size={18} className="text-indigo" />
          <span className="text-sm font-bold" style={{ color: "#0d08d2" }}>
            {item.itemId} Chat Log
          </span>
        </div>
        <button
          onClick={onClose}
          className="flex h-9 w-9 items-center justify-center rounded-full text-gray-400 hover:bg-gray-100 hover:text-gray-700"
        >
          <X size={18} />
        </button>
      </div>

      {/* Messages */}
      <ChatMessages
        messages={messages}
        mode="chat"
        currentUid={me.uid}
        onReact={handleReact}
      />

      {/* Input */}
      <ChatInput mode="chat" members={roles} onSend={handleSend} />
    </div>
  );
}
