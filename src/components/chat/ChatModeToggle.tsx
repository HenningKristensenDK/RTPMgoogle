import { MessageSquare, Bot } from "lucide-react";
import type { ChatMode } from "../../types";

interface Props {
  mode: ChatMode;
  onToggle: () => void;
}

export default function ChatModeToggle({ mode, onToggle }: Props) {
  const isAgent = mode === "agent";
  return (
    <button
      onClick={onToggle}
      title={isAgent ? "Switch to team chat" : "Switch to AI agent"}
      className="flex h-9 w-9 items-center justify-center rounded-full transition-colors"
      style={{
        background: isAgent ? "rgba(255,139,0,0.15)" : "rgba(13,8,210,0.12)",
        color: isAgent ? "#ff8b00" : "#0d08d2",
      }}
    >
      {isAgent ? <Bot size={18} /> : <MessageSquare size={18} />}
    </button>
  );
}
