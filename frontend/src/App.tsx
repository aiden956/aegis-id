import { useCallback, useEffect, useState } from "react";
import { BrowserRouter } from "react-router";
import { getAuditLogs, getAdminUsers, updateUserRole } from "./api/admin";
import {
  beginTwoFactorSetup,
  cancelTwoFactorChallenge,
  consumePendingRecoveryCodes,
  disableTwoFactor,
  enableTwoFactor,
  getCurrentUser,
  getPendingTwoFactorChallenge,
  getRecoveryCodeStatus,
  getWebAuthnLoginOptions,
  getWebAuthnRegistrationOptions,
  login,
  regenerateRecoveryCodes,
  logout,
  refreshSession,
  register,
  startOAuthRecoveryCodeRegeneration,
  type RegenerateRecoveryCodesPayload,
  verifyWebAuthnLogin,
  verifyWebAuthnRegistration,
  verifyTwoFactorLogin,
} from "./api/auth";
import { startAuthentication, startRegistration } from "@simplewebauthn/browser";
import { AppRoutes } from "./app/AppRoutes";
import type { AuditLog, AuthStatus, Role, User } from "./types/iam";

const App = () => {
  const [status, setStatus] = useState<AuthStatus>("loading");
  const [currentUser, setCurrentUser] = useState<User | null>(null);
  const [pendingUser, setPendingUser] = useState<User | null>(null);
  const [users, setUsers] = useState<User[]>([]);
  const [logs, setLogs] = useState<AuditLog[]>([]);
  const [recoveryCodeStatus, setRecoveryCodeStatus] = useState<{
    total: number;
    remaining: number;
  } | null>(null);

  const syncRecoveryCodeStatus = useCallback(async (user: User | null) => {
    if (!user?.isTwoFactorEnabled) {
      setRecoveryCodeStatus(null);
      return null;
    }

    const nextStatus = await getRecoveryCodeStatus();
    setRecoveryCodeStatus(nextStatus);
    return nextStatus;
  }, []);

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
      await syncRecoveryCodeStatus(user);
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
      await syncRecoveryCodeStatus(user);
      await syncAdminData(user);
      return;
    } catch {
      // Continue to pending 2FA fallback.
    }

    try {
      const user = await getPendingTwoFactorChallenge();
      setCurrentUser(null);
      setPendingUser(user);
      setRecoveryCodeStatus(null);
      setStatus("pending_2fa");
      return;
    } catch {
      setCurrentUser(null);
      setPendingUser(null);
      setRecoveryCodeStatus(null);
      setStatus("anonymous");
    }
  }, [syncAdminData, syncRecoveryCodeStatus]);

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
      await syncRecoveryCodeStatus(result.user);
      await syncAdminData(result.user);
      return result.user.role === "ADMIN" ? "/admin" : "/dashboard";
    },
    [syncAdminData, syncRecoveryCodeStatus],
  );

  const handleVerifyTwoFactor = useCallback(
    async (code: string) => {
      const user = await verifyTwoFactorLogin(code, "totp");
      setCurrentUser(user);
      setPendingUser(null);
      setStatus("authenticated");
      await syncRecoveryCodeStatus(user);
      await syncAdminData(user);
      return user.role === "ADMIN" ? "/admin" : "/dashboard";
    },
    [syncAdminData, syncRecoveryCodeStatus],
  );

  const handleVerifyRecoveryCode = useCallback(
    async (code: string) => {
      const user = await verifyTwoFactorLogin(code, "recovery");
      setCurrentUser(user);
      setPendingUser(null);
      setStatus("authenticated");
      await syncRecoveryCodeStatus(user);
      await syncAdminData(user);
      return user.role === "ADMIN" ? "/admin" : "/dashboard";
    },
    [syncAdminData, syncRecoveryCodeStatus],
  );

  const handleCancelTwoFactorChallenge = useCallback(async () => {
    try {
      await cancelTwoFactorChallenge();
    } finally {
      setCurrentUser(null);
      setPendingUser(null);
      setRecoveryCodeStatus(null);
      setUsers([]);
      setLogs([]);
      setStatus("anonymous");
    }
  }, []);

  const handleRegister = useCallback(
    async (name: string, email: string, password: string) => {
      const user = await register(name, email, password);
      setCurrentUser(user);
      setPendingUser(null);
      setStatus("authenticated");
      await syncRecoveryCodeStatus(user);
      await syncAdminData(user);
      return "/dashboard";
    },
    [syncAdminData, syncRecoveryCodeStatus],
  );

  const handleLogout = useCallback(async () => {
    try {
      await logout();
    } finally {
      setStatus("anonymous");
      setCurrentUser(null);
      setPendingUser(null);
      setRecoveryCodeStatus(null);
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
    const result = await enableTwoFactor(code);
    setCurrentUser(result.user);
    setRecoveryCodeStatus({
      total: result.recoveryCodes.length,
      remaining: result.recoveryCodes.length,
    });
    return result.recoveryCodes;
  }, []);

  const handleDisableTwoFactor = useCallback(async (code: string) => {
    const user = await disableTwoFactor(code);
    setCurrentUser(user);
    setRecoveryCodeStatus(null);
  }, []);

  const handleGetRecoveryCodeStatus = useCallback(async () => {
    const nextStatus = await getRecoveryCodeStatus();
    setRecoveryCodeStatus(nextStatus);
    return nextStatus;
  }, []);

  const handleRegenerateRecoveryCodes = useCallback(
    async (payload: RegenerateRecoveryCodesPayload) => {
      const recoveryCodes = await regenerateRecoveryCodes(payload);
      setRecoveryCodeStatus({
        total: recoveryCodes.length,
        remaining: recoveryCodes.length,
      });
      return recoveryCodes;
    },
    [],
  );

  const handleStartOAuthRecoveryCodeRegeneration = useCallback(
    async (payload: Omit<RegenerateRecoveryCodesPayload, "password">) => {
      await startOAuthRecoveryCodeRegeneration(payload);
    },
    [],
  );

  const handleConsumePendingRecoveryCodes = useCallback(async () => {
    const recoveryCodes = await consumePendingRecoveryCodes();
    if (recoveryCodes) {
      setRecoveryCodeStatus({
        total: recoveryCodes.length,
        remaining: recoveryCodes.length,
      });
    }
    return recoveryCodes;
  }, []);

  const handleRegisterPasskey = useCallback(async () => {
    const options = await getWebAuthnRegistrationOptions();
    const credential = await startRegistration({ optionsJSON: options });
    await verifyWebAuthnRegistration(credential);
    const user = await getCurrentUser();
    setCurrentUser(user);
    await syncRecoveryCodeStatus(user);
  }, [syncRecoveryCodeStatus]);

  const handleLoginWithPasskey = useCallback(
    async (email?: string) => {
      const options = await getWebAuthnLoginOptions(email);
      const assertion = await startAuthentication({ optionsJSON: options });
      await verifyWebAuthnLogin(assertion);
      const user = await getCurrentUser();
      setCurrentUser(user);
      setPendingUser(null);
      setStatus("authenticated");
      await syncRecoveryCodeStatus(user);
      await syncAdminData(user);
      return user.role === "ADMIN" ? "/admin" : "/dashboard";
    },
    [syncAdminData, syncRecoveryCodeStatus],
  );

  return (
    <BrowserRouter>
      <AppRoutes
        status={status}
        currentUser={currentUser}
        recoveryCodeStatus={recoveryCodeStatus}
        pendingUser={pendingUser}
        users={users}
        logs={logs}
        onLogin={handleLogin}
        onRegister={handleRegister}
        onVerifyTwoFactor={handleVerifyTwoFactor}
        onVerifyRecoveryCode={handleVerifyRecoveryCode}
        onCancelTwoFactorChallenge={handleCancelTwoFactorChallenge}
        onLoginWithPasskey={handleLoginWithPasskey}
        onLogout={handleLogout}
        onRoleChange={handleRoleChange}
        onStartTwoFactorSetup={beginTwoFactorSetup}
        onEnableTwoFactor={handleEnableTwoFactor}
        onDisableTwoFactor={handleDisableTwoFactor}
        onGetRecoveryCodeStatus={handleGetRecoveryCodeStatus}
        onRegenerateRecoveryCodes={handleRegenerateRecoveryCodes}
        onStartOAuthRecoveryCodeRegeneration={handleStartOAuthRecoveryCodeRegeneration}
        onConsumePendingRecoveryCodes={handleConsumePendingRecoveryCodes}
        onRegisterPasskey={handleRegisterPasskey}
      />
    </BrowserRouter>
  );
};

export default App;
