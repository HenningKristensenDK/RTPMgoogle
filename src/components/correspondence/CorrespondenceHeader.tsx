import { useState } from "react";
import type { CorrespondenceItem } from "../../types";
import { formatDateYMD } from "../../lib/format";

interface Props {
  item: CorrespondenceItem;
  onTitleChange: (title: string) => void;
}

export default function CorrespondenceHeader({ item, onTitleChange }: Props) {
  const [title, setTitle] = useState(item.title);

  return (
    <div
      className="rounded-card px-6 py-4 shadow-card"
      style={{ background: "#e7e6fa" }}
    >
      <div className="flex items-start justify-between gap-4">
        <input
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          onBlur={() => title !== item.title && onTitleChange(title)}
          className="min-w-0 flex-1 border-b border-transparent bg-transparent text-[22px] font-semibold text-ink outline-none focus:border-indigo"
        />
        <span
          className="mt-1 shrink-0 rounded-full px-2.5 py-0.5 text-[12px] font-bold"
          style={{ background: "#fff", color: "#0d08d2" }}
        >
          {item.itemId}
        </span>
      </div>

      <div className="mt-1.5 flex items-center gap-2 text-[12px]" style={{ color: "#595b78" }}>
        <span
          className="rounded-full px-2 py-0.5 text-[11px] font-semibold"
          style={{ background: "#fff", color: "#0d08d2" }}
        >
          {item.type}
        </span>
        <span>
          Created {formatDateYMD(item.createdAt)} · Last edited{" "}
          {formatDateYMD(item.updatedAt)}
        </span>
      </div>
    </div>
  );
}
