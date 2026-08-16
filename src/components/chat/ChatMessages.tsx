import { useEffect, useRef, useState } from "react";
import ReactMarkdown from "react-markdown";
import { Bot, SmilePlus, X } from "lucide-react";
import type { BaseMessage, ChatMode } from "../../types";
import { formatTime, initials } from "../../lib/format";

interface Props {
  messages: BaseMessage[];
  mode: ChatMode;
  currentUid: string;
  typing?: boolean;
  onReact?: (messageId: string, emoji: string) => void;
}

const QUICK_EMOJI = ["👍", "✅", "⚠️", "🎯"];

export default function ChatMessages({
  messages,
  mode,
  currentUid,
  typing,
  onReact,
}: Props) {
  const endRef = useRef<HTMLDivElement>(null);
  const [lightbox, setLightbox] = useState<string | null>(null);

  useEffect(() => {
    endRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages.length, typing]);

  return (
    <div className="scroll-thin flex-1 overflow-auto px-4 py-3">
      {messages.length === 0 && !typing && (
        <div className="mt-8 text-center text-xs text-gray-400">
          {mode === "agent"
            ? "Ask Risk Management Agent to analyze this risk, suggest mitigations, or score probability and impact."
            : "No messages yet. Start the conversation with your team."}
        </div>
      )}

      <div className="flex flex-col gap-3">
        {messages.map((m) => {
          if (m.role === "system") {
            return (
              <div key={m.id} className="my-1 text-center">
                <span className="rounded-full bg-gray-100 px-2.5 py-1 text-[11px] text-gray-400">
                  {m.content}
                </span>
              </div>
            );
          }

          const isAgent = m.role === "assistant" && mode === "agent";
          const isMine = m.authorUid === currentUid && m.role === "user";

          return (
            <div
              key={m.id}
              className={`flex gap-2 ${isMine ? "flex-row-reverse" : ""}`}
            >
              {/* Avatar */}
              {isAgent ? (
                <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-amber/20 text-amber">
                  <Bot size={15} />
                </div>
              ) : (
                <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-indigo/15 text-[10px] font-semibold text-indigo">
                  {initials(m.authorName)}
                </div>
              )}

              <div className={`max-w-[78%] ${isMine ? "items-end" : ""}`}>
                <div
                  className={`flex items-baseline gap-2 ${
                    isMine ? "flex-row-reverse" : ""
                  }`}
                >
                  <span className="text-[11px] font-semibold text-gray-700">
                    {isAgent ? "Risk Management Agent" : m.authorName}
                  </span>
                  <span className="text-[10px] text-gray-400">
                    {formatTime(m.timestamp)}
                  </span>
                </div>
                <div
                  className="mt-0.5 rounded-lg px-3 py-2 text-[13px] leading-relaxed"
                  style={
                    isAgent
                      ? {
                          background: "#fff8f0",
                          color: "#15162b",
                          borderLeft: "3px solid #ff8b00",
                        }
                      : isMine
                      ? { background: "#5b56e8", color: "#fff" }
                      : { background: "#f7f7fb", color: "#15162b" }
                  }
                >
                  {m.images && m.images.length > 0 && (
                    <div className={`flex flex-wrap gap-1.5 ${m.content ? "mb-2" : ""}`}>
                      {m.images.map((src, i) => (
                        <button
                          key={i}
                          type="button"
                          onClick={() => setLightbox(src)}
                          className="block h-24 w-24 shrink-0 overflow-hidden rounded-btn border border-black/10"
                        >
                          <img src={src} alt="" className="h-full w-full object-cover" />
                        </button>
                      ))}
                    </div>
                  )}
                  {m.content && (
                    <div
                      className={`prose prose-sm max-w-none${isMine ? " prose-invert" : ""}`}
                    >
                      <ReactMarkdown>{m.content}</ReactMarkdown>
                    </div>
                  )}
                </div>

                {/* Reactions (team chat only) */}
                {mode === "chat" && onReact && (
                  <div
                    className={`mt-1 flex items-center gap-1 ${
                      isMine ? "justify-end" : ""
                    }`}
                  >
                    {Object.entries(m.reactions || {}).map(([emoji, uids]) => (
                      <button
                        key={emoji}
                        onClick={() => onReact(m.id, emoji)}
                        className={`rounded-full border px-1.5 py-0.5 text-[11px] ${
                          uids.includes(currentUid)
                            ? "border-indigo bg-indigo/10"
                            : "border-bordergray bg-white"
                        }`}
                      >
                        {emoji} {uids.length}
                      </button>
                    ))}
                    <div className="group relative">
                      <button className="text-gray-300 hover:text-gray-500">
                        <SmilePlus size={14} />
                      </button>
                      <div className="absolute bottom-full z-10 mb-1 hidden gap-1 rounded-full border border-bordergray bg-white px-2 py-1 shadow-card group-hover:flex">
                        {QUICK_EMOJI.map((e) => (
                          <button
                            key={e}
                            onClick={() => onReact(m.id, e)}
                            className="text-sm hover:scale-125"
                          >
                            {e}
                          </button>
                        ))}
                      </div>
                    </div>
                  </div>
                )}
              </div>
            </div>
          );
        })}

        {/* Typing indicator */}
        {typing && (
          <div className="flex gap-2">
            <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-amber/20 text-amber">
              <Bot size={15} />
            </div>
            <div className="flex items-center gap-1 rounded-lg bg-[#FFFBEB] px-3 py-2.5">
              <span className="typing-dot h-1.5 w-1.5 rounded-full bg-amber" />
              <span
                className="typing-dot h-1.5 w-1.5 rounded-full bg-amber"
                style={{ animationDelay: "0.2s" }}
              />
              <span
                className="typing-dot h-1.5 w-1.5 rounded-full bg-amber"
                style={{ animationDelay: "0.4s" }}
              />
            </div>
          </div>
        )}
      </div>
      <div ref={endRef} />

      {lightbox && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-8"
          onClick={() => setLightbox(null)}
        >
          <button
            onClick={() => setLightbox(null)}
            className="absolute right-5 top-5 flex h-9 w-9 items-center justify-center rounded-full bg-white/10 text-white hover:bg-white/20"
          >
            <X size={18} />
          </button>
          <img
            src={lightbox}
            alt=""
            className="max-h-full max-w-full rounded-card object-contain"
            onClick={(e) => e.stopPropagation()}
          />
        </div>
      )}
    </div>
  );
}
