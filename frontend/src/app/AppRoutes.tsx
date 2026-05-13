import type { ReactNode } from "react";
import { Navigate, Route, Routes } from "react-router";
import { AppShell } from "../layouts/AppShell";
import { AuditLogsPage } from "../features/admin/AuditLogsPage";
import { AdminOverviewPage } from "../features/admin/AdminOverviewPage";
import { AdminUsersPage } from "../features/admin/AdminUsersPage";
import { LoginPage } from "../features/auth/LoginPage";
import { RegisterPage } from "../features/auth/RegisterPage";
import { TwoFactorPage } from "../features/auth/TwoFactorPage";
import { UnauthorizedPage } from "../features/auth/UnauthorizedPage";
import { DashboardPage } from "../features/dashboard/DashboardPage";
import { ProfilePage } from "../features/profile/ProfilePage";
import { SecurityPage } from "../features/security/SecurityPage";
import type { AuditLog, AuthStatus, Role, User } from "../types/iam";

type AppRoutesProps = {
  status: AuthStatus;
  currentUser: User | null;
  pendingUser: User | null;
  users: User[];
  logs: AuditLog[];
  onLogin: (email: string, password: string) => Promise<string>;
  onRegister: (name: string, email: string, password: string) => Promise<string>;
  onVerifyTwoFactor: (code: string) => Promise<string>;
  onLoginWithPasskey: (email?: string) => Promise<string>;
  onLogout: () => Promise<void>;
  onRoleChange: (userId: string, role: Role) => Promise<void>;
  onStartTwoFactorSetup: () => Promise<{ qrCodeDataUrl: string; manualEntryKey: string }>;
  onEnableTwoFactor: (code: string) => Promise<void>;
  onDisableTwoFactor: (code: string) => Promise<void>;
  onRegisterPasskey: () => Promise<void>;
};

export const AppRoutes = ({
  status,
  currentUser,
  pendingUser,
  users,
  logs,
  onLogin,
  onRegister,
  onVerifyTwoFactor,
  onLoginWithPasskey,
  onLogout,
  onRoleChange,
  onStartTwoFactorSetup,
  onEnableTwoFactor,
  onDisableTwoFactor,
  onRegisterPasskey,
}: AppRoutesProps) => (
  <Routes>
    <Route
      path="/login"
      element={
        <LoginPage
          onLogin={onLogin}
          onLoginWithPasskey={onLoginWithPasskey}
          status={status}
        />
      }
    />
    <Route
      path="/register"
      element={
        status === "authenticated" ? (
          <Navigate to="/dashboard" replace />
        ) : (
          <RegisterPage onRegister={onRegister} />
        )
      }
    />
    <Route
      path="/verify-2fa"
      element={<TwoFactorPage pendingUser={pendingUser} onVerify={onVerifyTwoFactor} />}
    />
    <Route
      path="/unauthorized"
      element={<UnauthorizedPage user={currentUser} onLogout={onLogout} />}
    />
    <Route
      element={
        <ProtectedRoute status={status}>
          <AppShell user={currentUser} onLogout={onLogout} />
        </ProtectedRoute>
      }
    >
      <Route index element={<Navigate to="/dashboard" replace />} />
      <Route path="/dashboard" element={<DashboardPage user={currentUser} />} />
      <Route
        path="/security"
        element={
          <SecurityPage
            user={currentUser}
            onStartSetup={onStartTwoFactorSetup}
            onEnable={onEnableTwoFactor}
            onDisable={onDisableTwoFactor}
            onRegisterPasskey={onRegisterPasskey}
          />
        }
      />
      <Route path="/profile" element={<ProfilePage user={currentUser} />} />
      <Route
        path="/admin"
        element={
          <RequireRole user={currentUser} role="ADMIN">
            <AdminOverviewPage users={users} logs={logs} />
          </RequireRole>
        }
      />
      <Route
        path="/admin/users"
        element={
          <RequireRole user={currentUser} role="ADMIN">
            <AdminUsersPage users={users} onRoleChange={onRoleChange} />
          </RequireRole>
        }
      />
      <Route
        path="/admin/audit-logs"
        element={
          <RequireRole user={currentUser} role="ADMIN">
            <AuditLogsPage logs={logs} />
          </RequireRole>
        }
      />
    </Route>
    <Route path="*" element={<Navigate to="/login" replace />} />
  </Routes>
);

const ProtectedRoute = ({
  status,
  children,
}: {
  status: AuthStatus;
  children: ReactNode;
}) => {
  if (status === "loading") {
    return <main className="p-6 text-sm text-slate-600">Loading session...</main>;
  }

  if (status === "pending_2fa") {
    return <Navigate to="/verify-2fa" replace />;
  }

  if (status !== "authenticated") {
    return <Navigate to="/login" replace />;
  }

  return children;
};

const RequireRole = ({
  user,
  role,
  children,
}: {
  user: User | null;
  role: Role;
  children: ReactNode;
}) => {
  if (user?.role !== role) {
    return <Navigate to="/unauthorized" replace />;
  }

  return children;
};
