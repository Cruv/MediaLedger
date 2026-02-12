import { NavLink } from "react-router-dom";
import {
  LayoutDashboard,
  MonitorPlay,
  BarChart3,
  Library,
  Users,
  Server,
  ListChecks,
  Bell,
  ShieldAlert,
  Settings,
} from "lucide-react";
import { useUnresolvedCount } from "../../hooks/useAlerts";

const links = [
  { to: "/", label: "Dashboard", icon: LayoutDashboard },
  { to: "/sessions", label: "Sessions", icon: MonitorPlay },
  { to: "/graphs", label: "Graphs", icon: BarChart3 },
  { to: "/libraries", label: "Libraries", icon: Library },
  { to: "/users", label: "Users", icon: Users },
  { to: "/requests", label: "Requests", icon: ListChecks },
  { to: "/alerts", label: "Alerts", icon: Bell, badge: true },
  { to: "/sharing", label: "Sharing", icon: ShieldAlert },
  { to: "/servers", label: "Servers", icon: Server },
  { to: "/settings", label: "Settings", icon: Settings },
];

export default function Sidebar() {
  const { data: unresolvedCount } = useUnresolvedCount();

  return (
    <aside className="flex w-56 flex-col border-r border-gray-800 bg-gray-900">
      <div className="flex h-14 items-center gap-2 border-b border-gray-800 px-4">
        <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-brand-600 text-sm font-bold">
          ML
        </div>
        <span className="text-lg font-semibold">MediaLedger</span>
      </div>

      <nav className="flex-1 space-y-1 p-3">
        {links.map(({ to, label, icon: Icon, badge }) => (
          <NavLink
            key={to}
            to={to}
            end={to === "/"}
            className={({ isActive }) =>
              `flex items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium transition-colors ${
                isActive
                  ? "bg-brand-600/20 text-brand-400"
                  : "text-gray-400 hover:bg-gray-800 hover:text-gray-200"
              }`
            }
          >
            <Icon size={18} />
            {label}
            {badge && unresolvedCount && unresolvedCount > 0 ? (
              <span className="ml-auto rounded-full bg-red-600 px-1.5 py-0.5 text-[10px] font-bold leading-none text-white">
                {unresolvedCount}
              </span>
            ) : null}
          </NavLink>
        ))}
      </nav>
    </aside>
  );
}
