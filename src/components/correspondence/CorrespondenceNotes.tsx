import { useEffect, useRef, useState } from "react";
import type { CorrespondenceItem } from "../../types";

interface Props {
  item: CorrespondenceItem;
  onPatch: (patch: Partial<CorrespondenceItem>) => void;
}

export default function CorrespondenceNotes({ item, onPatch }: Props) {
  const [value, setValue] = useState(item.notes || "");
  const ref = useRef<HTMLTextAreaElement>(null);

  // Keep local value in sync if the underlying item changes externally.
  useEffect(() => setValue(item.notes || ""), [item.id]);

  // Auto-expand to fit content.
  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    el.style.height = "auto";
    el.style.height = `${el.scrollHeight}px`;
  }, [value]);

  return (
    <div className="rounded-card bg-white p-5 shadow-card">
      <h3 className="mb-2 text-[13px] font-semibold text-gray-700">Notes</h3>
      <textarea
        ref={ref}
        value={value}
        onChange={(e) => setValue(e.target.value)}
        onBlur={() => value !== item.notes && onPatch({ notes: value })}
        placeholder="Write a description or add notes here"
        className="w-full resize-none border-none bg-transparent text-sm text-ink outline-none placeholder:text-gray-400"
        rows={3}
      />
    </div>
  );
}
