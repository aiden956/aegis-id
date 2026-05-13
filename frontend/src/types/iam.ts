export type Role = "USER" | "ADMIN";

export type AuthStatus = "loading" | "anonymous" | "pending_2fa" | "authenticated";

export type User = {
  id: string;
  name: string;
  email: string;
  role: Role;
  isTwoFactorEnabled: boolean;
  provider?: string;
  createdAt?: string;
  updatedAt?: string;
};

export type AuditLog = {
  id: string;
  event: string;
  actor: string;
  result: "success" | "warning" | "failed";
  time: string;
  ip: string;
};
