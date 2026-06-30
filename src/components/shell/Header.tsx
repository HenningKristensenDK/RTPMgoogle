import { Plus, CheckSquare, Maximize2, Minimize2, LogOut } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { useShellStore } from "../../store/shellStore";
import { useAuthStore, currentIdentity } from "../../store/authStore";
import { signOut } from "../../firebase/auth";
import { initials } from "../../lib/format";

interface Props {
  onTodosOpen: () => void;
}

export default function Header({ onTodosOpen }: Props) {
  const { mode, toggleFocus } = useShellStore();
  const user = useAuthStore((s) => s.user);
  const navigate = useNavigate();
  const id = currentIdentity(user);

  return (
    <header
      className="flex h-12 flex-shrink-0 items-center justify-between px-4"
      style={{ background: "#090693" }}
    >
      <div className="flex items-center gap-2.5">
        <div
          className="flex h-7 w-7 flex-shrink-0 items-center justify-center"
          style={{
            border: "2px solid rgba(255,255,255,0.85)",
            borderRadius: 4,
          }}
        >
          <Plus size={13} className="text-white" strokeWidth={2.5} />
        </div>
        <span
          className="text-base font-semibold tracking-wide text-white"
          style={{ fontFamily: "'Barlow Condensed', sans-serif" }}
        >
          Viking Project
        </span>
      </div>

      <div className="flex items-center gap-1">
        <button
          onClick={onTodosOpen}
          title="My Todos"
          className="flex items-center gap-1.5 rounded px-2.5 py-1.5 text-xs font-medium text-white/80 transition hover:bg-white/10 hover:text-white"
        >
          <CheckSquare size={14} /> My Todos
        </button>

        {mode !== "landing" && (
          <button
            onClick={toggleFocus}
            title={mode === "focus" ? "Expand sidebar" : "Focus mode"}
            className="flex items-center gap-1.5 rounded px-2.5 py-1.5 text-xs font-medium text-white/80 transition hover:bg-white/10 hover:text-white"
          >
            {mode === "focus" ? (
              <><Maximize2 size={14} /> Expand</>
            ) : (
              <><Minimize2 size={14} /> Focus</>
            )}
          </button>
        )}

        <div className="ml-2 flex items-center gap-2 border-l border-white/20 pl-3">
          <div className="flex h-7 w-7 items-center justify-center rounded-full bg-white/20 text-[11px] font-semibold text-white">
            {initials(id.name)}
          </div>
          <span className="text-xs text-white/70">{id.name}</span>
          <button
            title="Sign out"
            onClick={async () => {
              await signOut();
              navigate("/");
            }}
            className="text-white/50 transition hover:text-white"
          >
            <LogOut size={14} />
          </button>
        </div>
      </div>
    </header>
  );
}
