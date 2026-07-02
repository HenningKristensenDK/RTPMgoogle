import { useRef, useEffect, useState } from "react";
import ReactMarkdown from "react-markdown";
import { Bot, Send } from "lucide-react";
import { useRiskStore } from "../../store/riskStore";
import { askRiskManager } from "../../services/geminiService";

interface Msg {
  role: "user" | "bot";
  text: string;
}

const WELCOME: Msg = {
  role: "bot",
  text: "Hi! I'm your Project Manager Agent. Ask me anything about project risks, mitigation status, or next steps.",
};

export default function ProjectManagerPanel() {
  const risks = useRiskStore((s) => s.risks);
  const roles = useRiskStore((s) => s.roles);

  const [messages, setMessages] = useState<Msg[]>([WELCOME]);
  const [input, setInput] = useState("");
  const [typing, setTyping] = useState(false);
  const bottomRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);

  function resizeInput() {
    const el = inputRef.current;
    if (!el) return;
    el.style.height = "auto";
    el.style.height = `${Math.min(el.scrollHeight, 144)}px`;
  }

  useEffect(() => {
    if (!input && inputRef.current) {
      inputRef.current.style.height = "auto";
    }
  }, [input]);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, typing]);

  async function handleSend() {
    const text = input.trim();
    if (!text || typing) return;
    setInput("");
    const next: Msg[] = [...messages, { role: "user", text }];
    setMessages(next);
    setTyping(true);

    try {
      const history = next.map((m) => ({
        role: (m.role === "user" ? "user" : "assistant") as "user" | "assistant",
        content: m.text,
      }));

      const context: Record<string, unknown> = {
        totalRisks: risks.length,
        openRisks: risks.filter((r) => r.status !== "resolved").length,
        criticalRisks: risks.filter((r) => r.priority === "critical").length,
        risks: risks.map((r) => ({
          id: r.riskId,
          title: r.title,
          status: r.status,
          priority: r.priority,
        })),
        roles: roles.flatMap((r) =>
          (
            [
              ["Accountable", r.accountable],
              ["Consulted", r.consulted],
              ["Responsible (Customer)", r.responsibleCustomer],
              ["Responsible (Contractor)", r.responsibleContractor],
              ["Informed (Customer)", r.informedCustomer],
              ["Informed (Contractor)", r.informedContractor],
            ] as const
          )
            .filter(([, party]) => party !== null)
            .map(([raci, party]) => ({
              workstream: r.workstream,
              org: party!.organization,
              person: party!.name,
              raci,
            }))
        ),
      };

      const reply = await askRiskManager(history, context);
      setMessages((prev) => [
        ...prev,
        { role: "bot", text: reply || "Unable to generate a response." },
      ]);
    } catch {
      setMessages((prev) => [
        ...prev,
        { role: "bot", text: "AI unavailable right now. Please try again." },
      ]);
    } finally {
      setTyping(false);
    }
  }

  return (
    <div
      className="flex w-80 flex-shrink-0 flex-col border-l"
      style={{ borderColor: "#e6e6f0", background: "#f7f7fb" }}
    >
      {/* Panel header */}
      <div
        className="flex flex-shrink-0 items-center gap-2 px-4 py-3"
        style={{ background: "#0d08d2" }}
      >
        <Bot size={17} className="text-white" />
        <span className="text-sm font-semibold tracking-wide text-white">
          Project Manager Agent
        </span>
        <span className="ml-auto rounded-full bg-white/20 px-2 py-0.5 text-[10px] text-white/80">
          {risks.length} risks
        </span>
      </div>

      {/* Messages */}
      <div className="flex flex-1 flex-col gap-3 overflow-y-auto px-3 py-3">
        {messages.map((m, i) => (
          <div
            key={i}
            className={`flex ${m.role === "user" ? "justify-end" : "justify-start"}`}
          >
            {m.role === "bot" && (
              <div
                className="mr-2 mt-1 flex h-6 w-6 flex-shrink-0 items-center justify-center rounded-full"
                style={{ background: "#0d08d2" }}
              >
                <Bot size={12} className="text-white" />
              </div>
            )}
            <div
              className="max-w-[85%] rounded-lg px-3 py-2 text-sm leading-relaxed"
              style={{
                background: m.role === "user" ? "#0d08d2" : "#e7e6fa",
                color: m.role === "user" ? "white" : "#15162b",
              }}
            >
              {m.role === "bot" ? (
                <div className="prose prose-sm max-w-none">
                  <ReactMarkdown>{m.text}</ReactMarkdown>
                </div>
              ) : m.text}
            </div>
          </div>
        ))}
        {typing && (
          <div className="flex justify-start">
            <div
              className="mr-2 mt-1 flex h-6 w-6 flex-shrink-0 items-center justify-center rounded-full"
              style={{ background: "#0d08d2" }}
            >
              <Bot size={12} className="text-white" />
            </div>
            <div
              className="rounded-lg px-3 py-2 text-sm"
              style={{ background: "#e7e6fa", color: "#595b78" }}
            >
              Thinking…
            </div>
          </div>
        )}
        <div ref={bottomRef} />
      </div>

      {/* Input */}
      <div
        className="flex flex-shrink-0 items-end gap-2 border-t p-3"
        style={{ borderColor: "#e6e6f0" }}
      >
        <textarea
          ref={inputRef}
          value={input}
          onChange={(e) => { setInput(e.target.value); resizeInput(); }}
          onKeyDown={(e) => {
            if (e.key === "Enter" && !e.shiftKey) {
              e.preventDefault();
              handleSend();
            }
          }}
          placeholder="Ask about the project…"
          disabled={typing}
          rows={2}
          className="scroll-thin flex-1 resize-none rounded-input border px-3 py-1.5 text-sm outline-none focus:border-indigo disabled:opacity-50"
          style={{ borderColor: "#e6e6f0", minHeight: "2.5rem", maxHeight: "9rem" }}
        />
        <button
          onClick={handleSend}
          disabled={typing || !input.trim()}
          className="flex h-8 w-8 flex-shrink-0 items-center justify-center rounded-btn text-white transition disabled:opacity-40"
          style={{ background: "#0d08d2" }}
        >
          <Send size={14} />
        </button>
      </div>
    </div>
  );
}
