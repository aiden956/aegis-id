import { Activity, AlertTriangle, BarChart3, LayoutDashboard, LogOut, Settings, Shield, ShieldCheck, Users } from "lucide-react";
import type { ReactNode } from "react";
import { Link, NavLink, Outlet, useNavigate } from "react-router";
import { RoleBadge } from "../components/ui/RoleBadge";
import type { User } from "../types/iam";

type AppShellProps = {
  user: User | null;
  recoveryCodeStatus: { total: number; remaining: number } | null;
  onLogout: () => Promise<void>;
};

export const AppShell = ({ user, recoveryCodeStatus, onLogout }: AppShellProps) => {
  const navigate = useNavigate();
  const hasLowRecoveryCodes =
    Boolean(user?.isTwoFactorEnabled) &&
    Boolean(recoveryCodeStatus) &&
    recoveryCodeStatus!.remaining <= 2;

  return (
    <div className="min-h-screen bg-slate-100 text-slate-950">
      <aside className="fixed inset-y-0 left-0 hidden w-72 border-r border-slate-800 bg-slate-950 p-5 text-white lg:block">
        <Link className="flex items-center gap-3" to="/dashboard">
          <span className="flex size-10 items-center justify-center rounded-lg bg-blue-600">
            <ShieldCheck size={22} />
          </span>
          <span>
            <span className="block text-lg font-semibold">AegisID</span>
            <span className="block text-xs text-slate-400">Access Console</span>
          </span>
        </Link>

        <nav className="mt-8 space-y-1">
          <SidebarLink icon={<LayoutDashboard size={18} />} to="/dashboard">
            Dashboard
          </SidebarLink>
          <SidebarLink icon={<Shield size={18} />} to="/security">
            Security
          </SidebarLink>
          <SidebarLink icon={<Settings size={18} />} to="/profile">
            Profile
          </SidebarLink>
          {user?.role === "ADMIN" ? (
            <>
              <div className="px-3 pb-1 pt-5 text-xs font-semibold uppercase tracking-wide text-slate-500">
                Admin
              </div>
              <SidebarLink icon={<BarChart3 size={18} />} to="/admin" end>
                Overview
              </SidebarLink>
              <SidebarLink icon={<Users size={18} />} to="/admin/users">
                Users
              </SidebarLink>
              <SidebarLink icon={<Activity size={18} />} to="/admin/audit-logs">
                Audit Logs
              </SidebarLink>
            </>
          ) : null}
        </nav>
      </aside>

      <div className="lg:pl-72">
        <header className="sticky top-0 z-10 border-b border-slate-200 bg-white/95 px-4 py-4 backdrop-blur sm:px-6">
          <div className="flex items-center justify-between gap-4">
            <div>
              <p className="text-sm text-slate-500">Identity console</p>
              <p className="font-semibold text-slate-950">
                {user?.name ?? "AegisID User"}
              </p>
            </div>
            <div className="flex items-center gap-3">
              <RoleBadge role={user?.role ?? "USER"} />
              <button
                className="icon-button"
                type="button"
                aria-label="Logout"
                onClick={async () => {
                  await onLogout();
                  navigate("/login");
                }}
              >
                <LogOut size={18} />
              </button>
            </div>
          </div>
        </header>

        <main className="px-4 py-6 sm:px-6">
          <MobileNav user={user} />
          {hasLowRecoveryCodes ? (
            <div className="mx-auto mb-5 flex max-w-7xl items-start gap-3 rounded-lg border border-amber-200 bg-amber-50 p-4 text-amber-900">
              <AlertTriangle className="mt-0.5 shrink-0" size={18} />
              <div className="min-w-0 flex-1">
                <p className="text-sm font-semibold">Recovery codes are running low</p>
                <p className="mt-1 text-sm text-amber-800">
                  You have {recoveryCodeStatus?.remaining ?? 0} unused recovery
                  codes left. Generate a new set from Security settings.
                </p>
              </div>
              <Link className="text-sm font-semibold text-amber-950" to="/security">
                Security
              </Link>
            </div>
          ) : null}
          <div className="mx-auto max-w-7xl">
            <Outlet />
          </div>
        </main>
      </div>
    </div>
  );
};

type SidebarLinkProps = {
  icon: ReactNode;
  to: string;
  end?: boolean;
  children: ReactNode;
};

const SidebarLink = ({ icon, to, end = false, children }: SidebarLinkProps) => (
  <NavLink
    className={({ isActive }) =>
      [
        "flex items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium transition",
        isActive
          ? "bg-blue-600 text-white"
          : "text-slate-300 hover:bg-slate-900 hover:text-white",
      ].join(" ")
    }
    end={end}
    to={to}
  >
    {icon}
    {children}
  </NavLink>
);

const MobileNav = ({ user }: { user: User | null }) => (
  <div className="mb-5 flex gap-2 overflow-x-auto lg:hidden">
    {[
      ["/dashboard", "Dashboard"],
      ["/security", "Security"],
      ["/profile", "Profile"],
      ...(user?.role === "ADMIN"
        ? [
            ["/admin", "Admin"],
            ["/admin/users", "Users"],
            ["/admin/audit-logs", "Logs"],
          ]
        : []),
    ].map(([to, label]) => (
      <NavLink
        className={({ isActive }) =>
          [
            "whitespace-nowrap rounded-lg border px-3 py-2 text-sm font-semibold",
            isActive
              ? "border-blue-600 bg-blue-600 text-white"
              : "border-slate-200 bg-white text-slate-700",
          ].join(" ")
        }
        end={to === "/admin"}
        key={to}
        to={to}
      >
        {label}
      </NavLink>
    ))}
  </div>
);
