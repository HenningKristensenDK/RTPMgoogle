import { useEffect, useRef, useState } from "react";
import { Bot, Search, FileText, AlertTriangle, MessageSquare, Paperclip, Send, ArrowRight } from "lucide-react";
import { useShellStore } from "../../store/shellStore";
import { useAuthStore, currentIdentity } from "../../store/authStore";
import { useRiskStore } from "../../store/riskStore";
import { agentReply } from "../../lib/agentIntents";

interface Message {
  fromUser: boolean;
  text: string;
}

const SUGGESTIONS = [
  { text: "Find my urgent tasks", icon: Search },
  { text: "Review the latest site report", icon: FileText },
  { text: "Analyze open project risks", icon: AlertTriangle },
  { text: "Draft a message to a contractor", icon: MessageSquare },
];

export default function LandingOverlay() {
  const setMode = useShellStore((s) => s.setMode);
  const user = useAuthStore((s) => s.user);
  const risks = useRiskStore((s) => s.risks);
  const me = currentIdentity(user);

  const [started, setStarted] = useState(false);
  const [draft, setDraft] = useState("");
  const [messages, setMessages] = useState<Message[]>([]);
  const [thinking, setThinking] = useState(false);
  const threadEndRef = useRef<HTMLDivElement>(null);

  function openDashboard() {
    setMode("active");
  }

  // Esc only dismisses before a conversation has started — never discards an
  // active thread by accident.
  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape" && !started) openDashboard();
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [started]);

  useEffect(() => {
    threadEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, thinking]);

  function send(textOverride?: string) {
    const text = (textOverride ?? draft).trim();
    if (!text) return;
    setMessages((prev) => [...prev, { fromUser: true, text }]);
    setStarted(true);
    setDraft("");
    setThinking(true);
    // Real Firestore-backed reply (risks are already live via useRiskStore) —
    // this is a keyword dispatcher over real data, not a model call yet.
    // Group E replaces this with a real Gemini call behind a Cloud Function.
    window.setTimeout(() => {
      setThinking(false);
      setMessages((prev) => [...prev, { fromUser: false, text: agentReply(text, risks) }]);
    }, 500);
  }

  function reset() {
    setStarted(false);
    setDraft("");
    setMessages([]);
    setThinking(false);
  }

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-6 animate-[aiScrimIn_260ms_ease-out]"
      style={{ background: "linear-gradient(160deg, rgba(13,8,210,0.82), rgba(2,2,20,0.90))" }}
    >
      <div
        className="flex w-full flex-col overflow-hidden rounded-card bg-white shadow-panel transition-[max-width] duration-300 ease-out"
        style={{ maxWidth: started ? 760 : 620, maxHeight: "82vh" }}
      >
        {!started ? (
          <div className="animate-[aiFadeUp_220ms_ease-out] px-10 pb-7 pt-11 text-center">
            <div
              className="mx-auto mb-4 flex items-center justify-center rounded-full"
              style={{ background: "#e7e6fa", width: 52, height: 52 }}
            >
              <Bot size={26} style={{ color: "#0d08d2" }} />
            </div>
            <h1
              style={{
                fontFamily: "'Barlow Semi Condensed', sans-serif",
                fontWeight: 600,
                fontSize: "28px",
                color: "#070474",
                marginBottom: "6px",
              }}
            >
              Hi {me.name}. What are we tackling today?
            </h1>
            <p className="mb-1 text-sm font-semibold" style={{ color: "#070474" }}>
              Your Project Manager Agent
            </p>
            <p className="mx-auto max-w-[40ch] text-sm" style={{ color: "#8a8ca6" }}>
              I have full context on Viking Project: tasks, documents, risks, and every workstream. Ask me
              anything.
            </p>
          </div>
        ) : (
          <div className="flex shrink-0 items-center gap-2.5 border-b border-bordergray px-6 py-4">
            <div
              className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full"
              style={{ background: "#0d08d2" }}
            >
              <Bot size={17} className="text-white" />
            </div>
            <span className="text-sm font-bold text-ink">Project Manager Agent</span>
            <button
              onClick={reset}
              className="ml-auto text-xs text-gray-400 transition-colors hover:text-indigo"
            >
              New conversation
            </button>
          </div>
        )}

        {started && (
          <div className="scroll-thin flex min-h-[280px] flex-1 flex-col gap-4 overflow-y-auto p-6">
            {messages.map((m, i) => (
              <div
                key={i}
                className={`flex animate-[aiFadeUp_220ms_ease-out] ${m.fromUser ? "justify-end" : "justify-start"}`}
              >
                <div
                  className="max-w-[78%] whitespace-pre-line rounded-card px-4 py-3 text-sm leading-relaxed"
                  style={{
                    background: m.fromUser ? "#0d08d2" : "#e7e6fa",
                    color: m.fromUser ? "#ffffff" : "#15162b",
                  }}
                >
                  {m.text}
                </div>
              </div>
            ))}
            {thinking && (
              <div className="flex animate-[aiFadeUp_220ms_ease-out] justify-start">
                <div
                  className="rounded-card px-4 py-3 text-sm"
                  style={{ background: "#e7e6fa", color: "#8a8ca6" }}
                >
                  Thinking…
                </div>
              </div>
            )}
            <div ref={threadEndRef} />
          </div>
        )}

        {!started && (
          <div className="flex flex-wrap justify-center gap-2 px-8 pb-7">
            {SUGGESTIONS.map((s) => (
              <button
                key={s.text}
                onClick={() => send(s.text)}
                className="flex items-center gap-1.5 rounded-full border border-bordergray bg-fog px-4 py-2 text-sm font-medium text-ink transition-colors hover:border-indigo/40 hover:bg-indigo/5 hover:text-indigo"
              >
                <s.icon size={14} style={{ color: "#0d08d2" }} />
                {s.text}
              </button>
            ))}
          </div>
        )}

        <div className={`shrink-0 px-6 pb-5 pt-4 ${started ? "border-t border-bordergray" : ""}`}>
          <div className="flex items-center gap-2.5 rounded-card border border-bordergray bg-fog py-1.5 pl-4 pr-1.5">
            <button
              title="Attach a document"
              className="flex h-[30px] w-[30px] shrink-0 items-center justify-center rounded-btn text-gray-400 transition-colors hover:bg-white hover:text-indigo"
            >
              <Paperclip size={18} />
            </button>
            <input
              value={draft}
              onChange={(e) => setDraft(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter") send();
              }}
              placeholder="Ask anything about Viking Project…"
              className="flex-1 bg-transparent py-2 text-sm text-ink outline-none placeholder:text-gray-400"
            />
            <button
              onClick={() => send()}
              title="Send"
              disabled={!draft.trim()}
              className="flex h-[34px] w-[34px] shrink-0 items-center justify-center rounded-btn text-white transition-colors disabled:cursor-default"
              style={{ background: draft.trim() ? "#0d08d2" : "#e6e6f0" }}
            >
              <Send size={16} />
            </button>
          </div>
          {!started && (
            <div className="mt-3 text-center">
              <button
                onClick={openDashboard}
                className="inline-flex items-center gap-1 text-xs text-gray-400 transition-colors hover:text-indigo"
              >
                Skip, open dashboard <ArrowRight size={13} />
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
