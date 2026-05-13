import { BrowserRouter } from "react-router";
import { useMemo, useState } from "react";
import { AppRoutes } from "./app/AppRoutes";
import { auditLogs, demoUsers } from "./data/mockIam";
import type { AuthStatus, DemoUser, Role } from "./types/iam";

const App = () => {
  const [status, setStatus] = useState<AuthStatus>("anonymous");
  const [currentUser, setCurrentUser] = useState<DemoUser | null>(null);
  const [pendingUser, setPendingUser] = useState<DemoUser | null>(null);
  const [users, setUsers] = useState(demoUsers);

  const auth = useMemo(
    () => ({
      login: (role: Role) => {
        const selected = users.find((user) => user.role === role) ?? users[0];

        if (selected.isTwoFactorEnabled) {
          setPendingUser(selected);
          setStatus("pending_2fa");
          return "/verify-2fa";
        }

        setCurrentUser(selected);
        setStatus("authenticated");
        return selected.role === "ADMIN" ? "/admin" : "/dashboard";
      },
      verifyTwoFactor: () => {
        if (!pendingUser) {
          return "/login";
        }

        setCurrentUser(pendingUser);
        setPendingUser(null);
        setStatus("authenticated");
        return pendingUser.role === "ADMIN" ? "/admin" : "/dashboard";
      },
      logout: () => {
        setStatus("anonymous");
        setCurrentUser(null);
        setPendingUser(null);
      },
      updateRole: (userId: string, role: Role) => {
        setUsers((existingUsers) =>
          existingUsers.map((user) =>
            user.id === userId ? { ...user, role } : user,
          ),
        );
      },
    }),
    [pendingUser, users],
  );

  return (
    <BrowserRouter>
      <AppRoutes
        status={status}
        currentUser={currentUser}
        pendingUser={pendingUser}
        users={users}
        logs={auditLogs}
        onLogin={auth.login}
        onVerifyTwoFactor={auth.verifyTwoFactor}
        onLogout={auth.logout}
        onRoleChange={auth.updateRole}
      />
    </BrowserRouter>
  );
};

export default App;
