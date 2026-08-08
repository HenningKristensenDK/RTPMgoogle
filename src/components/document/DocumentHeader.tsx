import { useState } from "react";
import type { DocumentItem } from "../../types";
import { formatDateYMD } from "../../lib/format";

interface Props {
  item: DocumentItem;
  onTitleChange: (title: string) => void;
}

/** Compact document identity — sits inline in the detail top bar (no card of its own). */
export default function DocumentHeader({ item, onTitleChange }: Props) {
  const [title, setTitle] = useState(item.title);

  return (
    <div className="flex min-w-0 flex-col justify-center">
      <div className="flex items-center gap-2">
        <input
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          onBlur={() => title !== item.title && onTitleChange(title)}
          title={title}
          className="min-w-0 max-w-[220px] truncate border-b border-transparent bg-transparent text-[14px] font-semibold text-ink outline-none focus:border-indigo"
        />
        <span
          className="shrink-0 rounded-full px-2 py-0.5 text-[11px] font-bold"
          style={{ background: "#e7e6fa", color: "#0d08d2" }}
        >
          {item.docId}
        </span>
      </div>
      <div className="mt-0.5 flex items-center gap-1.5 text-[10.5px]" style={{ color: "#8a8ca6" }}>
        <span
          className="rounded-full px-1.5 py-px text-[10px] font-semibold"
          style={{ background: "#f0f0f5", color: "#595b78" }}
        >
          {item.type}
        </span>
        <span>· Edited {formatDateYMD(item.updatedAt)}</span>
      </div>
    </div>
  );
}
