import { useCallback, useEffect, useState } from "react";
import { BrowserRouter } from "react-router";
import { AppRoutes } from "./app/AppRoutes";
import { getAuditLogs, getAdminUsers, updateUserRole } from "./api/admin";
import {
  getCurrentUser,
  login,
  logout,
  refreshSession,
  register,
} from "./api/auth";
import type { AuditLog, AuthStatus, Role, User } from "./types/iam";

const App = () => {
  const [status, setStatus] = useState<AuthStatus>("loading");
  const [currentUser, setCurrentUser] = useState<User | null>(null);
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
      setStatus("authenticated");
      await syncAdminData(user);
      return;
    } catch {
      // Continue to refresh fallback.
    }

    try {
      const user = await refreshSession();
      setCurrentUser(user);
      setStatus("authenticated");
      await syncAdminData(user);
      return;
    } catch {
      setCurrentUser(null);
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
      const user = await login(email, password);
      setCurrentUser(user);
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
      setUsers([]);
      setLogs([]);
    }
  }, []);

  const handleRoleChange = useCallback(
    async (userId: string, role: Role) => {
      const updatedUser = await updateUserRole(userId, role);
      setUsers((existingUsers) =>
        existingUsers.map((user) => (user.id === updatedUser.id ? updatedUser : user)),
      );
      setLogs(await getAuditLogs());
    },
    [],
  );

  return (
    <BrowserRouter>
      <AppRoutes
        status={status}
        currentUser={currentUser}
        users={users}
        logs={logs}
        onLogin={handleLogin}
        onRegister={handleRegister}
        onLogout={handleLogout}
        onRoleChange={handleRoleChange}
      />
    </BrowserRouter>
  );
};

export default App;
