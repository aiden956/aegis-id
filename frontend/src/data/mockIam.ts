import type { AuditLog, DemoUser } from "../types/iam";

export const demoUsers: DemoUser[] = [
  {
    id: "usr_101",
    name: "Maya Tran",
    email: "maya.user@secureiam.test",
    role: "USER",
    isTwoFactorEnabled: true,
    providers: ["Password", "Google"],
    lastLogin: "Today, 09:42",
  },
  {
    id: "adm_001",
    name: "Aiden Admin",
    email: "admin@secureiam.test",
    role: "ADMIN",
    isTwoFactorEnabled: true,
    providers: ["Password", "GitHub"],
    lastLogin: "Today, 10:16",
  },
  {
    id: "usr_204",
    name: "Linh Nguyen",
    email: "linh@secureiam.test",
    role: "USER",
    isTwoFactorEnabled: false,
    providers: ["Password"],
    lastLogin: "Yesterday, 18:03",
  },
];

export const auditLogs: AuditLog[] = [
  {
    id: "evt_901",
    event: "TOTP verification success",
    actor: "maya.user@secureiam.test",
    result: "success",
    time: "2 min ago",
    ip: "192.168.1.24",
  },
  {
    id: "evt_902",
    event: "OAuth login via GitHub",
    actor: "admin@secureiam.test",
    result: "success",
    time: "14 min ago",
    ip: "192.168.1.12",
  },
  {
    id: "evt_903",
    event: "Failed password attempt",
    actor: "unknown@example.com",
    result: "failed",
    time: "41 min ago",
    ip: "203.0.113.52",
  },
  {
    id: "evt_904",
    event: "Role changed USER to ADMIN",
    actor: "admin@secureiam.test",
    result: "warning",
    time: "1 hr ago",
    ip: "192.168.1.12",
  },
  {
    id: "evt_905",
    event: "Refresh token rotated",
    actor: "linh@secureiam.test",
    result: "success",
    time: "3 hrs ago",
    ip: "192.168.1.33",
  },
];

export const permissions = {
  USER: ["READ_PROFILE", "UPDATE_PROFILE", "MANAGE_OWN_2FA"],
  ADMIN: [
    "READ_PROFILE",
    "UPDATE_PROFILE",
    "MANAGE_OWN_2FA",
    "VIEW_ADMIN_DASHBOARD",
    "MANAGE_USERS",
    "VIEW_AUDIT_LOGS",
  ],
} as const;
