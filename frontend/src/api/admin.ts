import type { AuditLog, Role, User } from "../types/iam";
import { apiRequest } from "./client";

type UsersResponse = {
  users: User[];
};

type UserResponse = {
  user: User;
};

type AuditActor = {
  email: string;
};

type ApiAuditLog = {
  id: string;
  eventType: string;
  success: boolean;
  ipAddress: string | null;
  createdAt: string;
  details: string | null;
  actor: AuditActor | null;
};

type AuditLogsResponse = {
  logs: ApiAuditLog[];
};

const formatTimeAgo = (isoDate: string) => {
  const timestamp = new Date(isoDate).getTime();
  if (Number.isNaN(timestamp)) {
    return "just now";
  }

  const seconds = Math.max(1, Math.floor((Date.now() - timestamp) / 1000));
  if (seconds < 60) return `${seconds}s ago`;
  const minutes = Math.floor(seconds / 60);
  if (minutes < 60) return `${minutes}m ago`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours}h ago`;
  const days = Math.floor(hours / 24);
  return `${days}d ago`;
};

const titleCase = (value: string) =>
  value
    .toLowerCase()
    .split("_")
    .map((segment) => segment.charAt(0).toUpperCase() + segment.slice(1))
    .join(" ");

const mapAuditLog = (log: ApiAuditLog): AuditLog => ({
  id: log.id,
  event: titleCase(log.eventType),
  actor: log.actor?.email ?? "system",
  result: log.success
    ? log.eventType === "ROLE_CHANGED"
      ? "warning"
      : "success"
    : "failed",
  time: formatTimeAgo(log.createdAt),
  ip: log.ipAddress ?? "-",
});

export const getAdminUsers = async () => {
  const response = await apiRequest<UsersResponse>("/admin/users");
  return response.users;
};

export const updateUserRole = async (userId: string, role: Role) => {
  const response = await apiRequest<UserResponse>(`/admin/users/${userId}/role`, {
    method: "PATCH",
    body: JSON.stringify({ role }),
  });
  return response.user;
};

export const getAuditLogs = async () => {
  const response = await apiRequest<AuditLogsResponse>("/admin/audit-logs");
  return response.logs.map(mapAuditLog);
};
