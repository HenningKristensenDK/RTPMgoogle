import { NavLink } from "react-router-dom";
import { LayoutGrid, Users, ShieldAlert } from "lucide-react";
import { useShellStore } from "../../store/shellStore";

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
      {/* Logo */}
      <div
        className={`flex items-center gap-2.5 px-3 py-4 ${collapsed ? "justify-center" : ""}`}
      >
        <div className="flex h-8 w-8 flex-shrink-0 items-center justify-center rounded bg-white/15">
          <ShieldAlert size={16} className="text-white" />
        </div>
        {!collapsed && (
          <div>
            <div
              className="text-sm font-bold leading-tight text-white"
              style={{ fontFamily: "'Barlow Condensed', sans-serif" }}
            >
              Risk Manager
            </div>
            <div className="text-[10px] text-white/50">Construction risks</div>
          </div>
        )}
      </div>

      <nav className="flex flex-1 flex-col gap-0.5 px-2">
        <SideLink
          to="/"
          end
          icon={<LayoutGrid size={17} />}
          label="Dashboard"
          collapsed={collapsed}
        />
        <SideLink
          to="/roles"
          icon={<Users size={17} />}
          label="Roles & Responsibility"
          collapsed={collapsed}
        />
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
      {!collapsed && <span>{label}</span>}
    </NavLink>
  );
}
