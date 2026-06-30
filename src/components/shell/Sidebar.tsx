import { NavLink } from "react-router-dom";
import type { LucideIcon } from "lucide-react";
import {
  ShieldAlert,
  Plus,
  LayoutDashboard,
  Clock,
  FileText,
  Mail,
  ClipboardCheck,
  AlertTriangle,
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
  { to: "/ncr",                          Icon: AlertTriangle,   label: "Nonconformance (NCR)" },
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
        width: collapsed ? 60 : 220,
        background: "#070474",
        minHeight: 0,
      }}
    >
      {/* Brand mark */}
      <div
        className={`flex flex-shrink-0 items-center gap-2.5 border-b border-white/10 px-3 py-3.5 ${
          collapsed ? "justify-center" : ""
        }`}
      >
        <div
          className="flex h-8 w-8 flex-shrink-0 items-center justify-center"
          style={{
            border: "2px solid rgba(255,255,255,0.85)",
            borderRadius: 4,
          }}
        >
          <Plus size={15} className="text-white" strokeWidth={2.5} />
        </div>
        {!collapsed && (
          <div>
            <div
              className="text-sm font-bold leading-tight text-white"
              style={{ fontFamily: "'Barlow Condensed', sans-serif" }}
            >
              Viking Project
            </div>
            <div className="text-[10px] text-white/50">RTPM Platform</div>
          </div>
        )}
      </div>

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
        `flex items-center gap-3 rounded py-2 text-sm font-medium transition-colors ${
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
