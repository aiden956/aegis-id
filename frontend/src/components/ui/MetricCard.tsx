import type { ReactNode } from "react";

type MetricCardProps = {
  icon: ReactNode;
  label: string;
  value: string;
  tone: "blue" | "green" | "yellow" | "slate";
};

export const MetricCard = ({ icon, label, value, tone }: MetricCardProps) => {
  const toneClasses = {
    blue: "bg-blue-50 text-blue-700",
    green: "bg-green-50 text-green-700",
    yellow: "bg-yellow-50 text-yellow-700",
    slate: "bg-slate-100 text-slate-700",
  };

  return (
    <section className="rounded-lg border border-slate-200 bg-white p-5 shadow-sm">
      <div
        className={`flex size-11 items-center justify-center rounded-lg ${toneClasses[tone]}`}
      >
        {icon}
      </div>
      <p className="mt-4 text-sm font-medium text-slate-500">{label}</p>
      <p className="mt-1 text-2xl font-semibold text-slate-950">{value}</p>
    </section>
  );
};
