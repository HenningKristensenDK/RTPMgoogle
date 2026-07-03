import { create } from "zustand";

export type ShellMode = "landing" | "active" | "focus";

const LANDING_SEEN_KEY = "rtpm_landing_seen";

function hasSeenLanding(): boolean {
  try {
    return localStorage.getItem(LANDING_SEEN_KEY) === "1";
  } catch {
    return false;
  }
}

interface ShellState {
  mode: ShellMode;
  setMode: (mode: ShellMode) => void;
  toggleFocus: () => void;
}

export const useShellStore = create<ShellState>((set, get) => ({
  mode: hasSeenLanding() ? "active" : "landing",
  setMode: (mode) => {
    if (mode !== "landing") {
      try {
        localStorage.setItem(LANDING_SEEN_KEY, "1");
      } catch {
        /* ignore */
      }
    }
    set({ mode });
  },
  toggleFocus: () =>
    set({ mode: get().mode === "focus" ? "active" : "focus" }),
}));
