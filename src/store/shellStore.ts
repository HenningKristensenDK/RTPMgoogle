import { create } from "zustand";

export type ShellMode = "landing" | "active" | "focus";

interface ShellState {
  mode: ShellMode;
  setMode: (mode: ShellMode) => void;
  toggleFocus: () => void;
}

// Always opens on the landing popup — on every fresh page load/refresh, and on
// every login (since the store re-initializes when the app mounts). No
// "seen it once" gating: the popup is meant to greet you back every time.
export const useShellStore = create<ShellState>((set, get) => ({
  mode: "landing",
  setMode: (mode) => set({ mode }),
  toggleFocus: () =>
    set({ mode: get().mode === "focus" ? "active" : "focus" }),
}));
