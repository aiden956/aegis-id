export const InfoBlock = ({ label, value }: { label: string; value: string }) => (
  <div className="rounded-lg border border-slate-200 p-4">
    <p className="text-sm font-medium text-slate-500">{label}</p>
    <p className="mt-1 font-semibold text-slate-950">{value}</p>
  </div>
);
