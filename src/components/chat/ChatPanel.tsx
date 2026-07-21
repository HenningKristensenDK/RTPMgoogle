import { useEffect, useState } from "react";
import { Bot, MessageSquare, X } from "lucide-react";
import type { Risk, RiskMessage, RoleResponsibility } from "../../types";
import { useChatStore } from "../../store/chatStore";
import { useAuthStore, currentIdentity } from "../../store/authStore";
import {
  watchMessages,
  sendMessage,
  toggleReaction,
} from "../../firebase/firestore";
import { uploadChatImage } from "../../firebase/storage";
import { askRiskManager, buildRiskContext, type AgentMessage } from "../../firebase/agent";
import { toast } from "../../lib/toast";
import ChatModeToggle from "./ChatModeToggle";
import ChatMessages from "./ChatMessages";
import ChatInput from "./ChatInput";

interface Props {
  risk: Risk;
  roles: RoleResponsibility[];
  onClose: () => void;
}

export default function ChatPanel({ risk, roles, onClose }: Props) {
  const { mode, setMode, canCallAgent, markAgentCall } = useChatStore();
  const user = useAuthStore((s) => s.user);
  const me = currentIdentity(user);

  const [messages, setMessages] = useState<RiskMessage[]>([]);
  const [typing, setTyping] = useState(false);

  // Live listener — re-subscribes whenever the mode or risk changes.
  useEffect(() => {
    setMessages([]);
    const unsub = watchMessages(risk.id, mode, setMessages);
    return unsub;
  }, [risk.id, mode]);

  const isAgent = mode === "agent";

  function switchMode() {
    const next = isAgent ? "chat" : "agent";
    setMode(next);
  }

  async function handleSend(text: string, images: File[]) {
    let imageUrls: string[] = [];
    if (images.length > 0) {
      try {
        imageUrls = await Promise.all(
          images.map((file) => uploadChatImage(risk.id, file))
        );
      } catch {
        toast.error("Could not upload image");
      }
    }

    // Persist the user's message in the active thread.
    await sendMessage({
      riskId: risk.id,
      mode,
      role: "user",
      content: text,
      authorUid: me.uid,
      authorName: me.name,
      authorAvatar: me.avatar ?? "",
      images: imageUrls,
    });

    if (!isAgent) return; // team chat is just multi-user persistence

    // Agent mode: rate limit, then call the Cloud Function.
    if (!canCallAgent()) {
      toast.info("Please wait a moment before asking again.");
      return;
    }
    markAgentCall();
    setTyping(true);
    try {
      const history: AgentMessage[] = [...messages, {
        id: "local",
        riskId: risk.id,
        mode,
        role: "user",
        content: text,
        authorUid: me.uid,
        authorName: me.name,
        timestamp: null,
      } as RiskMessage]
        .filter((m) => m.role === "user" || m.role === "assistant")
        .map((m) => ({
          role: m.role === "assistant" ? "assistant" : "user",
          content: m.content,
        }));

      const context = buildRiskContext(risk, roles);
      const reply = await askRiskManager(history, context);
      await sendMessage({
        riskId: risk.id,
        mode: "agent",
        role: "assistant",
        content: reply || "Risk Management Agent could not generate a response.",
        authorUid: "risk-manager-agent",
        authorName: "Risk Management Agent",
      });
    } catch (err) {
      console.error(err);
      toast.error("Risk Management Agent is unavailable right now.");
    } finally {
      setTyping(false);
    }
  }

  function handleReact(messageId: string, emoji: string) {
    const msg = messages.find((m) => m.id === messageId);
    void toggleReaction(messageId, emoji, me.uid, msg?.reactions);
  }

  return (
    <div className="flex h-full flex-col bg-white">
      {/* Header */}
      <div
        className="flex items-center justify-between border-b px-4 py-3"
        style={{
          borderColor: "#e6e6f0",
          borderTop: `3px solid ${isAgent ? "#ff8b00" : "#0d08d2"}`,
        }}
      >
        <div className="flex items-center gap-2">
          {isAgent ? (
            <Bot size={18} className="text-amber" />
          ) : (
            <MessageSquare size={18} className="text-indigo" />
          )}
          <span
            className="text-sm font-bold"
            style={{ color: isAgent ? "#cc5500" : "#0d08d2" }}
          >
            {isAgent ? "Risk Management Agent" : `${risk.riskId} Chat Log`}
          </span>
        </div>
        <div className="flex items-center gap-1">
          <ChatModeToggle mode={mode} onToggle={switchMode} />
          <button
            onClick={onClose}
            className="flex h-9 w-9 items-center justify-center rounded-full text-gray-400 hover:bg-gray-100 hover:text-gray-700"
          >
            <X size={18} />
          </button>
        </div>
      </div>

      {/* Messages */}
      <ChatMessages
        messages={messages}
        mode={mode}
        currentUid={me.uid}
        typing={typing}
        onReact={handleReact}
      />

      {/* Input */}
      <ChatInput
        mode={mode}
        members={roles}
        disabled={typing}
        onSend={handleSend}
      />

      {isAgent && (
        <div className="border-t border-bordergray py-1.5 text-center text-[10px] text-gray-400">
          Powered by AI · ISO 31000 framework
        </div>
      )}
    </div>
  );
}
