import { create } from "zustand";
import type { Risk, RoleResponsibility } from "../types";
import { watchRisks, watchRoles, updateRisk } from "../firebase/firestore";

interface RiskState {
  projectId: string;
  risks: Risk[];
  roles: RoleResponsibility[];
  loading: boolean;
  setProject: (projectId: string) => void;
  subscribe: () => () => void;
  /** Optimistic local patch — updates UI immediately, then syncs to Firestore. */
  patchRisk: (riskId: string, patch: Partial<Risk>) => void;
}

export const useRiskStore = create<RiskState>((set, get) => ({
  projectId: "datacenter-vejle-phase-1",
  risks: [],
  roles: [],
  loading: true,
  setProject: (projectId) => set({ projectId, loading: true }),
  subscribe: () => {
    const { projectId } = get();
    if (!projectId) return () => {};
    const unsubRisks = watchRisks(projectId, (risks) =>
      set({ risks, loading: false })
    );
    const unsubRoles = watchRoles(projectId, (roles) => set({ roles }));
    return () => {
      unsubRisks();
      unsubRoles();
    };
  },
  patchRisk: (riskId, patch) => {
    // Optimistic local update.
    set({
      risks: get().risks.map((r) =>
        r.id === riskId ? { ...r, ...patch } : r
      ),
    });
    // Background sync (fire and forget — onSnapshot will reconcile).
    void updateRisk(riskId, patch).catch((err) => {
      console.error("Failed to sync risk update", err);
    });
  },
}));
