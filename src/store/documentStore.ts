import { create } from "zustand";
import type { DocumentItem } from "../types";
import { watchDocuments, updateDocumentItem } from "../firebase/firestore";

interface DocumentState {
  projectId: string;
  items: DocumentItem[];
  loading: boolean;
  setProject: (projectId: string) => void;
  subscribe: () => () => void;
  /** Optimistic local patch — updates UI immediately, then syncs to Firestore. */
  patchItem: (documentId: string, patch: Partial<DocumentItem>) => void;
}

export const useDocumentStore = create<DocumentState>((set, get) => ({
  projectId: "datacenter-vejle-phase-1",
  items: [],
  loading: true,
  setProject: (projectId) => set({ projectId, loading: true }),
  subscribe: () => {
    const { projectId } = get();
    if (!projectId) return () => {};
    return watchDocuments(projectId, (items) => set({ items, loading: false }));
  },
  patchItem: (documentId, patch) => {
    set({
      items: get().items.map((i) => (i.id === documentId ? { ...i, ...patch } : i)),
    });
    void updateDocumentItem(documentId, patch).catch((err) => {
      console.error("Failed to sync document update", err);
    });
  },
}));
