import type { ReactNode } from "react";

type PanelProps = {
  title: string;
  action?: ReactNode;
  children: ReactNode;
};

export const Panel = ({ title, action, children }: PanelProps) => (
  <section className="rounded-lg border border-slate-200 bg-white p-5 shadow-sm">
    <div className="mb-4 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
      <h2 className="text-lg font-semibold text-slate-950">{title}</h2>
      {action}
    </div>
    {children}
  </section>
);
