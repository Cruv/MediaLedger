import { NavLink, useLocation } from "react-router-dom";
import type { LucideIcon } from "lucide-react";
import {
  LayoutDashboard,
  MonitorPlay,
  BarChart3,
  Library,
  Sparkles,
  Users,
  Server,
  ListChecks,
  Bell,
  ShieldAlert,
  Zap,
  Globe,
  FileText,
  ScrollText,
  Settings,
  Lightbulb,
  HeartPulse,
  TicketCheck,
  CreditCard,
} from "lucide-react";
import { useUnresolvedCount } from "../../hooks/useAlerts";

interface NavItem {
  to: string;
  label: string;
  icon: LucideIcon;
  badge?: boolean;
}

interface NavSection {
  title?: string;
  items: NavItem[];
}

const sections: NavSection[] = [
  {
    items: [
      { to: "/", label: "Dashboard", icon: LayoutDashboard },
      { to: "/sessions", label: "Sessions", icon: MonitorPlay },
      { to: "/graphs", label: "Graphs", icon: BarChart3 },
    ],
  },
  {
    title: "Content",
    items: [
      { to: "/libraries", label: "Libraries", icon: Library },
      { to: "/recently-added", label: "Recently Added", icon: Sparkles },
      { to: "/insights", label: "Insights", icon: Lightbulb },
      { to: "/requests", label: "Requests", icon: ListChecks },
    ],
  },
  {
    title: "Users & Access",
    items: [
      { to: "/users", label: "Users", icon: Users },
      { to: "/invites", label: "Invites", icon: TicketCheck },
      { to: "/stripe", label: "Stripe", icon: CreditCard },
    ],
  },
  {
    title: "Security",
    items: [
      { to: "/alerts", label: "Alerts", icon: Bell, badge: true },
      { to: "/automation", label: "Automation", icon: Zap },
      { to: "/sharing", label: "Sharing", icon: ShieldAlert },
      { to: "/geo-map", label: "GeoIP Map", icon: Globe },
    ],
  },
  {
    title: "Admin",
    items: [
      { to: "/server-health", label: "Server Health", icon: HeartPulse },
      { to: "/digest", label: "Admin Digest", icon: FileText },
      { to: "/audit-log", label: "Audit Log", icon: ScrollText },
      { to: "/servers", label: "Servers", icon: Server },
      { to: "/settings", label: "Settings", icon: Settings },
    ],
  },
];

interface SidebarProps {
  open: boolean;
  onClose: () => void;
}

export default function Sidebar({ open, onClose }: SidebarProps) {
  const { data: unresolvedCount } = useUnresolvedCount();
  const location = useLocation();

  // Close sidebar on route change (mobile)
  const handleNavClick = () => {
    if (window.innerWidth < 1024) onClose();
  };

  return (
    <>
      {/* Mobile overlay */}
      {open && (
        <div
          className="fixed inset-0 z-40 bg-black/60 backdrop-blur-sm lg:hidden"
          onClick={onClose}
          aria-hidden="true"
        />
      )}

      <aside
        className={`fixed inset-y-0 left-0 z-50 flex w-56 flex-col border-r border-gray-800/80 bg-gray-900/95 transition-transform duration-200 lg:static lg:translate-x-0 ${
          open ? "translate-x-0" : "-translate-x-full"
        }`}
        aria-label="Main navigation"
      >
        {/* Logo */}
        <div className="flex h-14 shrink-0 items-center gap-2.5 border-b border-gray-800/80 px-4">
          <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-gradient-to-br from-brand-500 to-brand-700 text-sm font-bold shadow-lg shadow-brand-900/30">
            ML
          </div>
          <span className="text-lg font-semibold tracking-tight">MediaLedger</span>
        </div>

        {/* Scrollable nav */}
        <nav className="flex-1 overflow-y-auto overflow-x-hidden px-3 py-2" aria-label="Sidebar navigation">
          {sections.map((section, si) => (
            <div key={si} className={si > 0 ? "mt-4" : ""} role="group" aria-label={section.title ?? "Main"}>
              {section.title && (
                <p className="mb-1 px-3 text-[10px] font-semibold uppercase tracking-wider text-gray-600" aria-hidden="true">
                  {section.title}
                </p>
              )}
              <div className="space-y-0.5">
                {section.items.map(({ to, label, icon: Icon, badge }) => (
                  <NavLink
                    key={to}
                    to={to}
                    end={to === "/"}
                    onClick={handleNavClick}
                    aria-current={location.pathname === to ? "page" : undefined}
                    className={({ isActive }) =>
                      `flex items-center gap-3 rounded-lg px-3 py-1.5 text-[13px] font-medium transition-all ${
                        isActive
                          ? "bg-brand-600/15 text-brand-400 shadow-sm shadow-brand-900/10"
                          : "text-gray-400 hover:bg-gray-800/70 hover:text-gray-200"
                      }`
                    }
                  >
                    <Icon size={16} strokeWidth={1.75} aria-hidden="true" />
                    {label}
                    {badge && unresolvedCount && unresolvedCount > 0 ? (
                      <span className="ml-auto flex h-4 min-w-[16px] items-center justify-center rounded-full bg-red-600 px-1 text-[9px] font-bold leading-none text-white" aria-label={`${unresolvedCount} unresolved alerts`}>
                        {unresolvedCount}
                      </span>
                    ) : null}
                  </NavLink>
                ))}
              </div>
            </div>
          ))}
        </nav>

        {/* Footer */}
        <div className="shrink-0 border-t border-gray-800/80 px-4 py-2.5">
          <p className="text-[10px] text-gray-600">MediaLedger v0.1.0</p>
        </div>
      </aside>
    </>
  );
}
