import { NavLink } from "react-router-dom";
import type { LucideIcon } from "lucide-react";
import {
  LayoutDashboard,
  Clock,
  FileText,
  Mail,
  ClipboardCheck,
  AlertTriangle,
  ShieldAlert,
  BadgeCheck,
  GitPullRequest,
  Wallet,
  Users,
} from "lucide-react";
import { useShellStore } from "../../store/shellStore";

const NAV: { to: string; end?: boolean; Icon: LucideIcon; label: string }[] = [
  { to: "/",                  end: true, Icon: LayoutDashboard, label: "Dashboard" },
  { to: "/time-log",                     Icon: Clock,           label: "Time Log" },
  { to: "/documents",                    Icon: FileText,        label: "Documents" },
  { to: "/correspondence",               Icon: Mail,            label: "Correspondence" },
  { to: "/site-inspection",              Icon: ClipboardCheck,  label: "Site Inspection" },
  { to: "/ncr",                          Icon: AlertTriangle,   label: "Nonconformance" },
  { to: "/risks",                        Icon: ShieldAlert,     label: "Risk & Opportunities" },
  { to: "/permit-compliance",            Icon: BadgeCheck,      label: "Permit & Compliance" },
  { to: "/change-management",            Icon: GitPullRequest,  label: "Change Management" },
  { to: "/project-economics",            Icon: Wallet,          label: "Project Economics" },
  { to: "/roles",                        Icon: Users,           label: "Roles & Responsibility" },
];

export default function Sidebar() {
  const mode = useShellStore((s) => s.mode);
  const collapsed = mode === "focus";

  return (
    <aside
      className="flex flex-shrink-0 flex-col transition-all duration-200"
      style={{
        width: collapsed ? 0 : 220,
        background: "#070474",
        minHeight: 0,
        overflow: "hidden",
      }}
    >
      {/* Navigation */}
      <nav className="scroll-thin flex flex-1 flex-col gap-0.5 overflow-y-auto px-2 py-2">
        {NAV.map(({ to, end, Icon, label }) => (
          <SideLink
            key={to}
            to={to}
            end={end}
            icon={<Icon size={17} />}
            label={label}
            collapsed={collapsed}
          />
        ))}
      </nav>

      {/* Footer */}
      {!collapsed && (
        <div style={{ padding: "0 0 16px 16px", fontSize: "11px", fontWeight: 400, color: "#8a8ca6" }}>
          © 2026 RTPM · v0.1
        </div>
      )}
    </aside>
  );
}

function SideLink({
  to,
  end,
  icon,
  label,
  collapsed,
}: {
  to: string;
  end?: boolean;
  icon: React.ReactNode;
  label: string;
  collapsed: boolean;
}) {
  return (
    <NavLink
      to={to}
      end={end}
      title={collapsed ? label : undefined}
      className={({ isActive }) =>
        `flex items-center gap-3 rounded-btn py-2 text-sm font-medium transition-colors ${
          collapsed ? "justify-center px-0" : "px-2"
        } ${
          isActive
            ? "bg-white/20 text-white"
            : "text-white/60 hover:bg-white/10 hover:text-white"
        }`
      }
    >
      {icon}
      {!collapsed && <span className="truncate">{label}</span>}
    </NavLink>
  );
}
