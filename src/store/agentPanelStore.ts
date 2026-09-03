import { create } from "zustand";

interface AgentPanelState {
  pendingPrompt: string | null;
  askAgent: (prompt: string) => void;
  clearPendingPrompt: () => void;
}

/** Lets other pages (e.g. the Dashboard's AI Insights card) drop a prefilled
 * question into the persistent Project Manager Agent panel without sending it
 * automatically — the panel picks this up, fills its input, and focuses it. */
export const useAgentPanelStore = create<AgentPanelState>((set) => ({
  pendingPrompt: null,
  askAgent: (prompt) => set({ pendingPrompt: prompt }),
  clearPendingPrompt: () => set({ pendingPrompt: null }),
}));
