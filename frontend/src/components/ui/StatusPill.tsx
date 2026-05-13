import type { ReactNode } from "react";

type StatusPillProps = {
  status: "success" | "warning" | "failed";
  children: ReactNode;
};

export const StatusPill = ({ status, children }: StatusPillProps) => {
  const classes = {
    success: "bg-green-100 text-green-800",
    warning: "bg-yellow-100 text-yellow-800",
    failed: "bg-red-100 text-red-800",
  };

  return (
    <span
      className={`inline-flex rounded-full px-2.5 py-1 text-xs font-bold ${classes[status]}`}
    >
      {children}
    </span>
  );
};
