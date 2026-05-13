import { Shield } from "lucide-react";
import type { Role } from "../../types/iam";

export const RoleBadge = ({ role }: { role: Role }) => (
  <span
    className={[
      "inline-flex items-center gap-1 rounded-full px-3 py-1 text-xs font-bold",
      role === "ADMIN"
        ? "bg-yellow-100 text-yellow-800"
        : "bg-blue-100 text-blue-800",
    ].join(" ")}
  >
    <Shield size={13} />
    {role}
  </span>
);
