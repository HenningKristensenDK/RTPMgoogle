import { useState } from "react";
import { X, CheckCircle2, Circle, Plus, Trash2 } from "lucide-react";

interface Props {
  onClose: () => void;
}

interface Todo {
  id: number;
  text: string;
  done: boolean;
}

const DEFAULTS: Todo[] = [
  { id: 1, text: "Review open risks in Workstream 3", done: false },
  { id: 2, text: "Follow up on mitigation for RK-004", done: false },
  { id: 3, text: "Update risk register with new assessments", done: true },
];

export default function MyTodosOverlay({ onClose }: Props) {
  const [todos, setTodos] = useState<Todo[]>(DEFAULTS);
  const [newText, setNewText] = useState("");

  function toggle(id: number) {
    setTodos((prev) =>
      prev.map((t) => (t.id === id ? { ...t, done: !t.done } : t))
    );
  }

  function remove(id: number) {
    setTodos((prev) => prev.filter((t) => t.id !== id));
  }

  function addTodo() {
    const text = newText.trim();
    if (!text) return;
    setTodos((prev) => [...prev, { id: Date.now(), text, done: false }]);
    setNewText("");
  }

  const open = todos.filter((t) => !t.done);
  const done = todos.filter((t) => t.done);

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center"
      style={{ background: "rgba(7, 4, 116, 0.5)" }}
      onClick={(e) => e.target === e.currentTarget && onClose()}
    >
      <div
        className="flex flex-col overflow-hidden rounded-2xl shadow-2xl"
        style={{ width: 440, maxHeight: "72vh", background: "white" }}
      >
        {/* Header */}
        <div
          className="flex flex-shrink-0 items-center justify-between px-5 py-4"
          style={{ background: "#0d08d2" }}
        >
          <div>
            <span className="text-xl font-semibold tracking-wide text-white">
              My todos
            </span>
            <span className="ml-2 rounded-full bg-white/20 px-2 py-0.5 text-[11px] text-white/80">
              {open.length} open
            </span>
          </div>
          <button
            onClick={onClose}
            className="text-white/60 transition hover:text-white"
          >
            <X size={18} />
          </button>
        </div>

        {/* List */}
        <div className="flex-1 overflow-y-auto px-4 py-3">
          {open.length === 0 && done.length === 0 && (
            <p className="py-8 text-center text-sm text-gray-400">
              No todos yet. Add one below!
            </p>
          )}

          {open.map((t) => (
            <TodoRow key={t.id} todo={t} onToggle={toggle} onRemove={remove} />
          ))}

          {done.length > 0 && (
            <>
              <div className="my-3 flex items-center gap-2">
                <div className="h-px flex-1 bg-gray-100" />
                <span className="text-[11px] font-medium uppercase tracking-wide text-gray-400">
                  Completed · {done.length}
                </span>
                <div className="h-px flex-1 bg-gray-100" />
              </div>
              {done.map((t) => (
                <TodoRow key={t.id} todo={t} onToggle={toggle} onRemove={remove} />
              ))}
            </>
          )}
        </div>

        {/* Add */}
        <div
          className="flex flex-shrink-0 items-center gap-2 border-t p-4"
          style={{ borderColor: "#e6e6f0" }}
        >
          <input
            value={newText}
            onChange={(e) => setNewText(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && addTodo()}
            placeholder="Add a todo…"
            className="flex-1 rounded-input border px-3 py-2 text-sm outline-none focus:border-indigo"
            style={{ borderColor: "#e6e6f0" }}
          />
          <button
            onClick={addTodo}
            disabled={!newText.trim()}
            className="flex h-8 w-8 flex-shrink-0 items-center justify-center rounded-btn text-white transition disabled:opacity-40"
            style={{ background: "#0d08d2" }}
          >
            <Plus size={15} />
          </button>
        </div>
      </div>
    </div>
  );
}

function TodoRow({
  todo,
  onToggle,
  onRemove,
}: {
  todo: { id: number; text: string; done: boolean };
  onToggle: (id: number) => void;
  onRemove: (id: number) => void;
}) {
  return (
    <div className="group flex items-start gap-3 rounded-btn px-2 py-2.5 hover:bg-fog">
      <button
        onClick={() => onToggle(todo.id)}
        className="mt-0.5 flex-shrink-0 transition"
      >
        {todo.done ? (
          <CheckCircle2 size={18} style={{ color: "#28a745" }} />
        ) : (
          <Circle size={18} style={{ color: "#0d08d2" }} />
        )}
      </button>
      <span
        className={`flex-1 text-sm leading-relaxed ${
          todo.done ? "text-gray-400 line-through" : "text-gray-700"
        }`}
      >
        {todo.text}
      </span>
      <button
        onClick={() => onRemove(todo.id)}
        className="mt-0.5 flex-shrink-0 opacity-0 text-gray-300 transition hover:text-red-400 group-hover:opacity-100"
      >
        <Trash2 size={14} />
      </button>
    </div>
  );
}
