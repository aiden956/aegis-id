import { useCallback, useEffect, useState } from "react";
import { BrowserRouter } from "react-router";
import { getAuditLogs, getAdminUsers, updateUserRole } from "./api/admin";
import {
  beginTwoFactorSetup,
  disableTwoFactor,
  enableTwoFactor,
  getCurrentUser,
  login,
  logout,
  refreshSession,
  register,
  verifyTwoFactorLogin,
} from "./api/auth";
import { AppRoutes } from "./app/AppRoutes";
import type { AuditLog, AuthStatus, Role, User } from "./types/iam";

const App = () => {
  const [status, setStatus] = useState<AuthStatus>("loading");
  const [currentUser, setCurrentUser] = useState<User | null>(null);
  const [pendingUser, setPendingUser] = useState<User | null>(null);
  const [users, setUsers] = useState<User[]>([]);
  const [logs, setLogs] = useState<AuditLog[]>([]);

  const syncAdminData = useCallback(async (user: User | null) => {
    if (!user || user.role !== "ADMIN") {
      setUsers([]);
      setLogs([]);
      return;
    }

    const [adminUsers, auditLogs] = await Promise.all([
      getAdminUsers(),
      getAuditLogs(),
    ]);
    setUsers(adminUsers);
    setLogs(auditLogs);
  }, []);

  const bootSession = useCallback(async () => {
    try {
      const user = await getCurrentUser();
      setCurrentUser(user);
      setPendingUser(null);
      setStatus("authenticated");
      await syncAdminData(user);
      return;
    } catch {
      // Continue to refresh fallback.
    }

    try {
      const user = await refreshSession();
      setCurrentUser(user);
      setPendingUser(null);
      setStatus("authenticated");
      await syncAdminData(user);
      return;
    } catch {
      setCurrentUser(null);
      setPendingUser(null);
      setStatus("anonymous");
    }
  }, [syncAdminData]);

  useEffect(() => {
    const timer = window.setTimeout(() => {
      void bootSession();
    }, 0);
    return () => {
      window.clearTimeout(timer);
    };
  }, [bootSession]);

  const handleLogin = useCallback(
    async (email: string, password: string) => {
      const result = await login(email, password);
      if (result.twoFactorRequired) {
        setCurrentUser(null);
        setPendingUser(result.user);
        setStatus("pending_2fa");
        return "/verify-2fa";
      }

      setCurrentUser(result.user);
      setPendingUser(null);
      setStatus("authenticated");
      await syncAdminData(result.user);
      return result.user.role === "ADMIN" ? "/admin" : "/dashboard";
    },
    [syncAdminData],
  );

  const handleVerifyTwoFactor = useCallback(
    async (code: string) => {
      const user = await verifyTwoFactorLogin(code);
      setCurrentUser(user);
      setPendingUser(null);
      setStatus("authenticated");
      await syncAdminData(user);
      return user.role === "ADMIN" ? "/admin" : "/dashboard";
    },
    [syncAdminData],
  );

  const handleRegister = useCallback(
    async (name: string, email: string, password: string) => {
      const user = await register(name, email, password);
      setCurrentUser(user);
      setPendingUser(null);
      setStatus("authenticated");
      await syncAdminData(user);
      return "/dashboard";
    },
    [syncAdminData],
  );

  const handleLogout = useCallback(async () => {
    try {
      await logout();
    } finally {
      setStatus("anonymous");
      setCurrentUser(null);
      setPendingUser(null);
      setUsers([]);
      setLogs([]);
    }
  }, []);

  const handleRoleChange = useCallback(async (userId: string, role: Role) => {
    const updatedUser = await updateUserRole(userId, role);
    setUsers((existingUsers) =>
      existingUsers.map((user) => (user.id === updatedUser.id ? updatedUser : user)),
    );
    setLogs(await getAuditLogs());
  }, []);

  const handleEnableTwoFactor = useCallback(async (code: string) => {
    const user = await enableTwoFactor(code);
    setCurrentUser(user);
  }, []);

  const handleDisableTwoFactor = useCallback(async (code: string) => {
    const user = await disableTwoFactor(code);
    setCurrentUser(user);
  }, []);

  return (
    <BrowserRouter>
      <AppRoutes
        status={status}
        currentUser={currentUser}
        pendingUser={pendingUser}
        users={users}
        logs={logs}
        onLogin={handleLogin}
        onRegister={handleRegister}
        onVerifyTwoFactor={handleVerifyTwoFactor}
        onLogout={handleLogout}
        onRoleChange={handleRoleChange}
        onStartTwoFactorSetup={beginTwoFactorSetup}
        onEnableTwoFactor={handleEnableTwoFactor}
        onDisableTwoFactor={handleDisableTwoFactor}
      />
    </BrowserRouter>
  );
};

export default App;
