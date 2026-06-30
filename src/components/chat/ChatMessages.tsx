import { useEffect, useRef } from "react";
import ReactMarkdown from "react-markdown";
import { Bot, SmilePlus } from "lucide-react";
import type { ChatMode, RiskMessage } from "../../types";
import { formatTime, initials } from "../../lib/format";

interface Props {
  messages: RiskMessage[];
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
                  className={`mt-0.5 rounded-lg px-3 py-2 text-[13px] leading-relaxed${!isAgent ? " whitespace-pre-wrap" : ""}`}
                  style={
                    isAgent
                      ? {
                          background: "#FFFBEB",
                          color: "#1F2937",
                          borderLeft: "3px solid #F59E0B",
                        }
                      : isMine
                      ? { background: "#4F46E5", color: "#fff" }
                      : { background: "#F3F4F6", color: "#1F2937" }
                  }
                >
                  {isAgent ? (
                    <div className="prose prose-sm max-w-none">
                      <ReactMarkdown>{m.content}</ReactMarkdown>
                    </div>
                  ) : m.content}
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
    </div>
  );
}
