import { useEffect, useRef, useState } from "react";
import type { Risk } from "../../types";

interface Props {
  risk: Risk;
  onPatch: (patch: Partial<Risk>) => void;
}

export default function RiskMitigationPlan({ risk, onPatch }: Props) {
  const [value, setValue] = useState(risk.mitigationPlan || "");
  const ref = useRef<HTMLTextAreaElement>(null);

  // Keep local value in sync if the underlying risk changes externally.
  useEffect(() => setValue(risk.mitigationPlan || ""), [risk.id]);

  // Auto-expand to fit content.
  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    el.style.height = "auto";
    el.style.height = `${el.scrollHeight}px`;
  }, [value]);

  return (
    <div className="rounded-card bg-white p-5 shadow-card">
      <h3 className="mb-2 text-[13px] font-semibold text-gray-700">Mitigation plan</h3>
      <textarea
        ref={ref}
        value={value}
        onChange={(e) => setValue(e.target.value)}
        onBlur={() => value !== risk.mitigationPlan && onPatch({ mitigationPlan: value })}
        placeholder="What's the plan to address this risk, and who's driving it?"
        className="w-full resize-none border-none bg-transparent text-sm text-ink outline-none placeholder:text-gray-400"
        rows={3}
      />
    </div>
  );
}
