import { useState } from "react";
import type { Risk, RiskStatus } from "../../types";
import { formatDateYMD } from "../../lib/format";

const NEXT_STEP_OWNER: Record<RiskStatus, string> = {
  identified: "Package PM",
  assessed: "Lead Scheduler",
  mitigated: "Quality Manager",
  resolved: "Commissioning Authority (CxA)",
};

interface Props {
  risk: Risk;
  onTitleChange: (title: string) => void;
}

export default function RiskHeader({ risk, onTitleChange }: Props) {
  const [title, setTitle] = useState(risk.title);

  return (
    <div
      className="rounded-card px-6 py-4 shadow-card"
      style={{ background: "#e7e6fa" }}
    >
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

      {/* Audit line + Next Step Owner */}
      <div className="mt-1.5 flex items-center justify-between gap-4">
        <div className="text-[12px]" style={{ color: "#595b78" }}>
          Created {formatDateYMD(risk.createdAt)} · Last edited{" "}
          {formatDateYMD(risk.updatedAt)}
        </div>
        <div
          className="shrink-0 text-[12px] font-semibold"
          style={{ color: "#0d08d2" }}
        >
          Next step: {NEXT_STEP_OWNER[risk.status]}
        </div>
      </div>
    </div>
  );
}
