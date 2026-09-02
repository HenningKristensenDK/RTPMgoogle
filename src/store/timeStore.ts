import { create } from "zustand";
import type { TimeEntry } from "../types";
import { watchTimeEntries, updateTimeEntry } from "../firebase/firestore";

interface TimeState {
  projectId: string;
  entries: TimeEntry[];
  loading: boolean;
  setProject: (projectId: string) => void;
  subscribe: () => () => void;
  /** Optimistic local patch — updates UI immediately, then syncs to Firestore. */
  patchEntry: (entryId: string, patch: Partial<TimeEntry>) => void;
}

export const useTimeStore = create<TimeState>((set, get) => ({
  projectId: "datacenter-vejle-phase-1",
  entries: [],
  loading: true,
  setProject: (projectId) => set({ projectId, loading: true }),
  subscribe: () => {
    const { projectId } = get();
    if (!projectId) return () => {};
    return watchTimeEntries(projectId, (entries) => set({ entries, loading: false }));
  },
  patchEntry: (entryId, patch) => {
    set({
      entries: get().entries.map((e) => (e.id === entryId ? { ...e, ...patch } : e)),
    });
    void updateTimeEntry(entryId, patch).catch((err) => {
      console.error("Failed to sync time entry update", err);
    });
  },
}));
