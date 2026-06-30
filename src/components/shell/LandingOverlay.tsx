import { Bot, ArrowRight, ShieldAlert } from "lucide-react";
import { useShellStore } from "../../store/shellStore";

export default function LandingOverlay() {
  const setMode = useShellStore((s) => s.setMode);

  function enter() {
    setMode("active");
  }

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center"
      style={{ background: "rgba(7, 4, 116, 0.65)" }}
    >
      <div
        className="flex flex-col items-center rounded-2xl p-10 shadow-2xl"
        style={{ width: 480, background: "white" }}
      >
        {/* Icon cluster */}
        <div className="relative mb-6 flex items-center justify-center">
          <div
            className="flex h-20 w-20 items-center justify-center rounded-full"
            style={{ background: "#e7e6fa" }}
          >
            <Bot size={42} style={{ color: "#0d08d2" }} />
          </div>
          <div
            className="absolute -right-2 -top-2 flex h-8 w-8 items-center justify-center rounded-full shadow"
            style={{ background: "#0d08d2" }}
          >
            <ShieldAlert size={16} className="text-white" />
          </div>
        </div>

        <h1
          className="mb-1 text-3xl font-bold tracking-wide"
          style={{
            fontFamily: "'Barlow Semi Condensed', sans-serif",
            color: "#070474",
          }}
        >
          Project Manager Agent
        </h1>
        <p className="mb-2 text-sm font-medium tracking-wide" style={{ color: "#0d08d2" }}>
          Construction Risk Management
        </p>
        <p className="mb-8 text-center text-sm leading-relaxed text-gray-500">
          AI-powered risk tracking, mitigation management, and project insights
          — built on the ISO 31000 framework.
        </p>

        {/* Stats strip */}
        <div
          className="mb-8 flex w-full divide-x rounded-xl px-6 py-4"
          style={{ background: "#e7e6fa" }}
        >
          {[
            { label: "Risk Board", desc: "Track & triage" },
            { label: "AI Chat", desc: "Ask anything" },
            { label: "RACI Matrix", desc: "Roles clarity" },
          ].map((item) => (
            <div key={item.label} className="flex flex-1 flex-col items-center px-2">
              <span className="text-sm font-semibold" style={{ color: "#0d08d2" }}>
                {item.label}
              </span>
              <span className="text-[11px] text-gray-500">{item.desc}</span>
            </div>
          ))}
        </div>

        <button
          onClick={enter}
          className="flex items-center gap-2 rounded-xl px-8 py-3 text-sm font-semibold text-white shadow-lg transition hover:opacity-90 active:scale-95"
          style={{ background: "#0d08d2" }}
        >
          Open dashboard <ArrowRight size={17} />
        </button>

        <p className="mt-5 text-[11px] text-gray-400">
          Press{" "}
          <kbd className="rounded bg-gray-100 px-1.5 py-0.5 font-mono text-[10px]">
            Esc
          </kbd>{" "}
          to dismiss
        </p>
      </div>
    </div>
  );
}
