import type { ReactNode } from "react";

export const Page = ({ children }: { children: ReactNode }) => (
  <div className="space-y-5">{children}</div>
);
