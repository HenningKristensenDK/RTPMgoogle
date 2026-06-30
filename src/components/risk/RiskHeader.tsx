import { useState } from "react";
import type { Risk } from "../../types";
import { formatDateYMD } from "../../lib/format";

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

      {/* Audit line */}
      <div className="mt-1.5 text-[12px]" style={{ color: "#595b78" }}>
        Created {formatDateYMD(risk.createdAt)} · Last edited{" "}
        {formatDateYMD(risk.updatedAt)}
      </div>
    </div>
  );
}
