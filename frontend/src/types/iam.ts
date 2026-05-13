export type Role = "USER" | "ADMIN";

export type AuthStatus = "anonymous" | "pending_2fa" | "authenticated";

export type DemoUser = {
  id: string;
  name: string;
  email: string;
  role: Role;
  isTwoFactorEnabled: boolean;
  providers: string[];
  lastLogin: string;
};

export type AuditLog = {
  id: string;
  event: string;
  actor: string;
  result: "success" | "warning" | "failed";
  time: string;
  ip: string;
};
