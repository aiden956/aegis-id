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
import type { AuditLog, AuthStatus, DemoUser, Role } from "../types/iam";

type AppRoutesProps = {
  status: AuthStatus;
  currentUser: DemoUser | null;
  pendingUser: DemoUser | null;
  users: DemoUser[];
  logs: AuditLog[];
  onLogin: (role: Role) => string;
  onVerifyTwoFactor: () => string;
  onLogout: () => void;
  onRoleChange: (userId: string, role: Role) => void;
};

export const AppRoutes = ({
  status,
  currentUser,
  pendingUser,
  users,
  logs,
  onLogin,
  onVerifyTwoFactor,
  onLogout,
  onRoleChange,
}: AppRoutesProps) => (
  <Routes>
    <Route path="/login" element={<LoginPage onLogin={onLogin} status={status} />} />
    <Route path="/register" element={<RegisterPage />} />
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
      <Route path="/security" element={<SecurityPage user={currentUser} />} />
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
  user: DemoUser | null;
  role: Role;
  children: ReactNode;
}) => {
  if (user?.role !== role) {
    return <Navigate to="/unauthorized" replace />;
  }

  return children;
};
