import { useState, useRef, useEffect } from "react";
import { Send } from "lucide-react";
import type { ChatMode, RoleResponsibility } from "../../types";

interface Props {
  mode: ChatMode;
  disabled?: boolean;
  members: RoleResponsibility[];
  onSend: (text: string) => void;
}

export default function ChatInput({ mode, disabled, members, onSend }: Props) {
  const [text, setText] = useState("");
  const [mentionOpen, setMentionOpen] = useState(false);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  function resize() {
    const el = textareaRef.current;
    if (!el) return;
    el.style.height = "auto";
    el.style.height = `${Math.min(el.scrollHeight, 144)}px`;
  }

  useEffect(() => {
    if (!text && textareaRef.current) {
      textareaRef.current.style.height = "auto";
    }
  }, [text]);

  // Distinct mention candidates by person name.
  const mentionNames = [...new Set(members.map((m) => m.person.name))];

  function submit() {
    const value = text.trim();
    if (!value || disabled) return;
    onSend(value);
    setText("");
    setMentionOpen(false);
  }

  function handleChange(value: string) {
    setText(value);
    // Open the mention picker when the last token starts with '@' (team chat).
    if (mode === "chat") {
      const lastToken = value.split(/\s/).pop() || "";
      setMentionOpen(lastToken.startsWith("@") && mentionNames.length > 0);
    }
  }

  function applyMention(name: string) {
    const tokens = text.split(/\s/);
    tokens[tokens.length - 1] = `@${name}`;
    setText(tokens.join(" ") + " ");
    setMentionOpen(false);
  }

  const accent = mode === "agent" ? "#F59E0B" : "#4F46E5";

  return (
    <div className="relative border-t border-bordergray p-3">
      {mentionOpen && (
        <div className="absolute bottom-full left-3 mb-1 w-56 rounded-card border border-bordergray bg-white py-1 shadow-panel">
          {mentionNames.map((name) => (
            <button
              key={name}
              onClick={() => applyMention(name)}
              className="block w-full px-3 py-1.5 text-left text-xs text-ink hover:bg-gray-50"
            >
              @{name}
            </button>
          ))}
        </div>
      )}
      <div className="flex items-end gap-2">
        <textarea
          ref={textareaRef}
          value={text}
          disabled={disabled}
          onChange={(e) => { handleChange(e.target.value); resize(); }}
          onKeyDown={(e) => {
            if (e.key === "Enter" && !e.shiftKey) {
              e.preventDefault();
              submit();
            }
          }}
          placeholder={
            mode === "agent"
              ? "Ask Risk Management Agent…"
              : "Message the team…  (@ to mention)"
          }
          rows={2}
          className="scroll-thin flex-1 resize-none rounded-input border border-bordergray px-3 py-2 text-sm outline-none focus:border-indigo focus:ring-1 focus:ring-indigo disabled:bg-gray-50"
          style={{ minHeight: "2.5rem", maxHeight: "9rem" }}
        />
        <button
          onClick={submit}
          disabled={disabled || !text.trim()}
          className="flex h-9 w-9 shrink-0 items-center justify-center rounded-btn text-white disabled:opacity-40"
          style={{ background: accent }}
        >
          <Send size={16} />
        </button>
      </div>
    </div>
  );
}
