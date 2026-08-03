import { useState } from "react";
import { Plus, Check, Trash2 } from "lucide-react";
import type { ChecklistItem, CorrespondenceItem } from "../../types";

interface Props {
  item: CorrespondenceItem;
  onPatch: (patch: Partial<CorrespondenceItem>) => void;
}

export default function CorrespondenceChecklist({ item, onPatch }: Props) {
  const [adding, setAdding] = useState("");
  const items = item.checklist || [];
  const doneCount = items.filter((i) => i.completed).length;

  function update(next: ChecklistItem[]) {
    onPatch({ checklist: next });
  }

  function toggle(id: string) {
    update(
      items.map((i) => (i.id === id ? { ...i, completed: !i.completed } : i))
    );
  }

  function editText(id: string, text: string) {
    update(items.map((i) => (i.id === id ? { ...i, text } : i)));
  }

  function remove(id: string) {
    update(items.filter((i) => i.id !== id));
  }

  function add() {
    const text = adding.trim();
    if (!text) return;
    update([
      ...items,
      { id: `c-${Date.now()}`, text, completed: false },
    ]);
    setAdding("");
  }

  return (
    <div className="rounded-card bg-white p-5 shadow-card">
      <div className="mb-3 flex items-center justify-between">
        <h3 className="text-[13px] font-semibold text-gray-700">
          Checklist{" "}
          <span className="font-normal text-gray-400">
            ({doneCount}/{items.length})
          </span>
        </h3>
      </div>

      <div className="flex flex-col gap-1.5">
        {items.map((item) => (
          <div key={item.id} className="group flex items-center gap-2">
            <button
              onClick={() => toggle(item.id)}
              className={`flex h-5 w-5 shrink-0 items-center justify-center rounded-full border transition-colors ${
                item.completed
                  ? "border-emerald bg-emerald text-white"
                  : "border-gray-300 hover:border-emerald"
              }`}
            >
              {item.completed && <Check size={12} strokeWidth={3} />}
            </button>
            <input
              value={item.text}
              onChange={(e) => editText(item.id, e.target.value)}
              className={`flex-1 border-b border-transparent bg-transparent py-1 text-sm outline-none focus:border-bordergray ${
                item.completed ? "text-gray-400 line-through" : "text-ink"
              }`}
            />
            <button
              onClick={() => remove(item.id)}
              className="text-gray-300 opacity-0 transition-opacity hover:text-red-500 group-hover:opacity-100"
            >
              <Trash2 size={14} />
            </button>
          </div>
        ))}
      </div>

      <div className="mt-2 flex items-center gap-2">
        <Plus size={15} className="text-gray-400" />
        <input
          value={adding}
          onChange={(e) => setAdding(e.target.value)}
          onKeyDown={(e) => e.key === "Enter" && add()}
          onBlur={add}
          placeholder="Add item"
          className="flex-1 border-b border-transparent bg-transparent py-1 text-sm outline-none focus:border-bordergray"
        />
      </div>
    </div>
  );
}
