import { useState } from "react";
import type { Risk, RiskKind } from "../../types";
import { formatDateYMD, riskKind } from "../../lib/format";

interface Props {
  risk: Risk;
  onTitleChange: (title: string) => void;
  onChangeKind: (kind: RiskKind) => void;
}

export default function RiskHeader({ risk, onTitleChange, onChangeKind }: Props) {
  const [title, setTitle] = useState(risk.title);
  const kind = riskKind(risk);

  return (
    <div
      className="rounded-card px-6 py-4 shadow-card"
      style={{ background: "#e7e6fa" }}
    >
      {/* Risk / Opportunity toggle — same control as when creating one, so it's
          immediately familiar. Changing it re-issues the RK-/OP- id so the
          badge below never shows a mismatched prefix. */}
      <div className="mb-2 flex overflow-hidden rounded-full bg-white/50" style={{ width: "fit-content" }}>
        {(["risk", "opportunity"] as RiskKind[]).map((k) => (
          <button
            key={k}
            onClick={() => onChangeKind(k)}
            className={`px-3 py-1 text-[11px] font-semibold transition-colors ${
              kind === k ? "bg-indigo text-white" : "text-indigo/60 hover:bg-white"
            }`}
          >
            {k === "risk" ? "Risk" : "Opportunity"}
          </button>
        ))}
      </div>

      {/* Title row with ID badge */}
      <div className="flex items-start justify-between gap-4">
        <input
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          onBlur={() => title !== risk.title && onTitleChange(title)}
          className="min-w-0 flex-1 border-b border-transparent bg-transparent text-[22px] font-semibold text-ink outline-none focus:border-indigo"
        />
        <span
          className="mt-1 shrink-0 rounded-full px-2.5 py-0.5 text-[12px] font-bold"
          style={{ background: "#fff", color: "#0d08d2" }}
        >
          {risk.riskId}
        </span>
      </div>

      {/* Audit line */}
      <div className="mt-1.5 text-[12px]" style={{ color: "#595b78" }}>
        Created {formatDateYMD(risk.createdAt)} · Last edited{" "}
        {formatDateYMD(risk.updatedAt)}
      </div>
    </div>
  );
}
