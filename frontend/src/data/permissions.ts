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
