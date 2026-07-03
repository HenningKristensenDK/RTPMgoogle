import { useEffect, useState } from "react";
import { Outlet } from "react-router-dom";
import { useShellStore } from "../store/shellStore";
import Header from "./shell/Header";
import Sidebar from "./shell/Sidebar";
import ProjectManagerPanel from "./shell/ProjectManagerPanel";
import LandingOverlay from "./shell/LandingOverlay";
import MyTodosOverlay from "./shell/MyTodosOverlay";

export default function AppShell() {
  const { mode } = useShellStore();
  const [todosOpen, setTodosOpen] = useState(false);

  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if (e.key !== "Escape") return;
      if (todosOpen) setTodosOpen(false);
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [todosOpen]);

  return (
    <div className="flex h-full flex-col">
      {/* The real dashboard, dimmed/blurred (not faked) behind the AI landing
          overlay — purely visual context, non-interactive while it's up. */}
      <div
        className={`flex h-full flex-col ${mode === "landing" ? "pointer-events-none select-none" : ""}`}
        style={mode === "landing" ? { filter: "blur(1px)" } : undefined}
      >
        <Header onTodosOpen={() => setTodosOpen(true)} />

        <div className="flex min-h-0 flex-1">
          <Sidebar />

          <main className="scroll-thin flex-1 overflow-auto bg-fog">
            <Outlet />
          </main>

          {mode === "active" && <ProjectManagerPanel />}
        </div>
      </div>

      {mode === "landing" && <LandingOverlay />}
      {todosOpen && <MyTodosOverlay onClose={() => setTodosOpen(false)} />}
    </div>
  );
}
