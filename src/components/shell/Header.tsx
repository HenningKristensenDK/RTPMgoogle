import { CheckSquare, Maximize2, Minimize2, LogOut } from "lucide-react";
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
      className="flex h-12 flex-shrink-0 items-center justify-between border-b px-4"
      style={{ background: "#ffffff", borderColor: "#e6e6f0" }}
    >
      <span
        className="text-sm font-semibold tracking-wide"
        style={{ color: "#15162b" }}
      >
        Viking Project
      </span>

      <div className="flex items-center gap-1">
        <button
          onClick={onTodosOpen}
          title="My Todos"
          className="flex items-center gap-1.5 rounded-btn px-2.5 py-1.5 text-xs font-medium transition hover:bg-fog"
          style={{ color: "#595b78" }}
        >
          <CheckSquare size={14} /> My Todos
        </button>

        {mode !== "landing" && (
          <button
            onClick={toggleFocus}
            title={mode === "focus" ? "Expand sidebar" : "Focus mode"}
            className="flex items-center gap-1.5 rounded-btn px-2.5 py-1.5 text-xs font-medium transition hover:bg-fog"
            style={{ color: "#595b78" }}
          >
            {mode === "focus" ? (
              <><Maximize2 size={14} /> Expand</>
            ) : (
              <><Minimize2 size={14} /> Focus</>
            )}
          </button>
        )}

        <div className="ml-2 flex items-center gap-2 border-l pl-3" style={{ borderColor: "#e6e6f0" }}>
          <div
            className="flex h-7 w-7 items-center justify-center rounded-full text-[11px] font-semibold text-white"
            style={{ background: "#0d08d2" }}
          >
            {initials(id.name)}
          </div>
          <span className="text-xs" style={{ color: "#595b78" }}>{id.name}</span>
          <button
            title="Sign out"
            onClick={async () => {
              await signOut();
              navigate("/");
            }}
            className="transition hover:text-ink"
            style={{ color: "#8a8ca6" }}
          >
            <LogOut size={14} />
          </button>
        </div>
      </div>
    </header>
  );
}
