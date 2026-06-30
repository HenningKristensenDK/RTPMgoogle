import { useEffect, useState } from "react";
import { Outlet } from "react-router-dom";
import { useShellStore } from "../store/shellStore";
import Header from "./shell/Header";
import Sidebar from "./shell/Sidebar";
import ProjectManagerPanel from "./shell/ProjectManagerPanel";
import LandingOverlay from "./shell/LandingOverlay";
import MyTodosOverlay from "./shell/MyTodosOverlay";

export default function AppShell() {
  const { mode, setMode } = useShellStore();
  const [todosOpen, setTodosOpen] = useState(false);

  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if (e.key !== "Escape") return;
      if (todosOpen) { setTodosOpen(false); return; }
      if (mode === "landing") setMode("active");
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [mode, todosOpen, setMode]);

  return (
    <div className="flex h-full flex-col">
      <Header onTodosOpen={() => setTodosOpen(true)} />

      <div className="flex min-h-0 flex-1">
        <Sidebar />

        <main className="scroll-thin flex-1 overflow-auto bg-fog">
          <Outlet />
        </main>

        {mode !== "landing" && <ProjectManagerPanel />}
      </div>

      {mode === "landing" && <LandingOverlay />}
      {todosOpen && <MyTodosOverlay onClose={() => setTodosOpen(false)} />}
    </div>
  );
}
