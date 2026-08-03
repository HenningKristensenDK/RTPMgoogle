import { create } from "zustand";
import type { CorrespondenceItem } from "../types";
import { watchCorrespondence, updateCorrespondence } from "../firebase/firestore";

interface CorrespondenceState {
  projectId: string;
  items: CorrespondenceItem[];
  loading: boolean;
  setProject: (projectId: string) => void;
  subscribe: () => () => void;
  /** Optimistic local patch — updates UI immediately, then syncs to Firestore. */
  patchItem: (itemId: string, patch: Partial<CorrespondenceItem>) => void;
}

export const useCorrespondenceStore = create<CorrespondenceState>((set, get) => ({
  projectId: "datacenter-vejle-phase-1",
  items: [],
  loading: true,
  setProject: (projectId) => set({ projectId, loading: true }),
  subscribe: () => {
    const { projectId } = get();
    if (!projectId) return () => {};
    return watchCorrespondence(projectId, (items) => set({ items, loading: false }));
  },
  patchItem: (itemId, patch) => {
    set({
      items: get().items.map((i) => (i.id === itemId ? { ...i, ...patch } : i)),
    });
    void updateCorrespondence(itemId, patch).catch((err) => {
      console.error("Failed to sync correspondence update", err);
    });
  },
}));
