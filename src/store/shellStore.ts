import { create } from "zustand";

export type ShellMode = "landing" | "active" | "focus";

interface ShellState {
  mode: ShellMode;
  setMode: (mode: ShellMode) => void;
  toggleFocus: () => void;
}

export const useShellStore = create<ShellState>((set, get) => ({
  mode: "landing",
  setMode: (mode) => set({ mode }),
  toggleFocus: () =>
    set({ mode: get().mode === "focus" ? "active" : "focus" }),
}));
