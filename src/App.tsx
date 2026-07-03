import { useEffect, useState } from "react";
import { Routes, Route, Navigate, useLocation, type Location } from "react-router-dom";
import type { LucideIcon } from "lucide-react";
import {
  Clock,
  FileText,
  Mail,
  ClipboardCheck,
  AlertTriangle,
  BadgeCheck,
  GitPullRequest,
  Wallet,
} from "lucide-react";
import { useAuthStore, currentIdentity } from "./store/authStore";
import { useRiskStore } from "./store/riskStore";
import { seedIfEmpty } from "./lib/seed";
import { SEED_PROJECT } from "./lib/seedData";
import Login from "./pages/Login";
import Dashboard from "./pages/Dashboard";
import RiskBoard from "./pages/RiskBoard";
import RiskDetail from "./pages/RiskDetail";
import RolesResponsibility from "./pages/RolesResponsibility";
import ModulePlaceholder from "./pages/ModulePlaceholder";
import AppShell from "./components/AppShell";

type PlaceholderDef = {
  path: string;
  moduleName: string;
  Icon: LucideIcon;
  isCorrespondence?: boolean;
};

// True only for the actual browser reload that just happened — react-router persists
// navigate()'s `state` (including our modal `background` location) across a hard
// refresh via the History API, so without this a refreshed page would still think
// it arrived via in-app navigation and re-open the risk-detail popup.
const IS_HARD_RELOAD =
  typeof performance !== "undefined" &&
  (performance.getEntriesByType("navigation")[0] as PerformanceNavigationTiming | undefined)
    ?.type === "reload";

const PLACEHOLDERS: PlaceholderDef[] = [
  { path: "/time-log",          moduleName: "Time Log",             Icon: Clock },
  { path: "/documents",         moduleName: "Documents",            Icon: FileText },
  { path: "/correspondence",    moduleName: "Correspondence",       Icon: Mail,           isCorrespondence: true },
  { path: "/site-inspection",   moduleName: "Site Inspection",      Icon: ClipboardCheck },
  { path: "/ncr",               moduleName: "Nonconformance (NCR)", Icon: AlertTriangle },
  { path: "/permit-compliance", moduleName: "Permit & Compliance",  Icon: BadgeCheck },
  { path: "/change-management", moduleName: "Change Management",    Icon: GitPullRequest },
  { path: "/project-economics", moduleName: "Project Economics",    Icon: Wallet },
];

export default function App() {
  const { user, loading, init } = useAuthStore();
  const setProject = useRiskStore((s) => s.setProject);
  const subscribe = useRiskStore((s) => s.subscribe);
  const location = useLocation();
  // Only the history entry that was already active when this reload happened should
  // have its stale background state ignored — any navigation after that is a fresh
  // in-app click and should behave normally.
  const [initialLocationKey] = useState(() => location.key);
  const backgroundLocation =
    IS_HARD_RELOAD && location.key === initialLocationKey
      ? undefined
      : (location.state as { background?: Location } | null)?.background;

  useEffect(() => init(), [init]);

  useEffect(() => {
    if (!user) return;
    const id = currentIdentity(user);
    void seedIfEmpty(id.uid).then(() => {
      setProject(SEED_PROJECT.id);
    });
  }, [user, setProject]);

  useEffect(() => {
    if (!user) return;
    const unsub = subscribe();
    return unsub;
  }, [user, subscribe]);

  if (loading) {
    return (
      <div className="flex h-full items-center justify-center text-gray-400">
        Loading…
      </div>
    );
  }

  if (!user) {
    return (
      <Routes>
        <Route path="*" element={<Login />} />
      </Routes>
    );
  }

  return (
    <>
      <Routes location={backgroundLocation ?? location}>
        <Route element={<AppShell />}>
          <Route path="/" element={<Dashboard />} />
          <Route path="/risks" element={<RiskBoard />} />
          {/* Direct load / refresh on a risk URL (no background state) — send back to the table. */}
          <Route path="/risks/:riskId" element={<Navigate to="/risks" replace />} />
          <Route path="/roles" element={<RolesResponsibility />} />
          {PLACEHOLDERS.map(({ path, moduleName, Icon, isCorrespondence }) => (
            <Route
              key={path}
              path={path}
              element={
                <ModulePlaceholder
                  moduleName={moduleName}
                  icon={Icon}
                  isCorrespondence={isCorrespondence}
                />
              }
            />
          ))}
          <Route path="*" element={<Navigate to="/" replace />} />
        </Route>
      </Routes>
      {backgroundLocation && (
        <Routes>
          <Route path="/risks/:riskId" element={<RiskDetail />} />
        </Routes>
      )}
    </>
  );
}
