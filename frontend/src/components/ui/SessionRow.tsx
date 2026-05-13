export const SessionRow = ({ label, value }: { label: string; value: string }) => (
  <div className="flex items-center justify-between gap-4 rounded-lg bg-slate-50 px-3 py-3">
    <span className="text-sm font-medium text-slate-600">{label}</span>
    <span className="text-right text-sm font-semibold text-slate-950">
      {value}
    </span>
  </div>
);
