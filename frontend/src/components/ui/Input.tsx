type InputProps = {
  label: string;
  type: string;
  value: string;
};

export const Input = ({ label, type, value }: InputProps) => (
  <label className="block">
    <span className="text-sm font-semibold text-slate-700">{label}</span>
    <input
      className="mt-2 h-11 w-full rounded-lg border border-slate-200 bg-white px-3 text-sm outline-none transition focus:border-blue-500 focus:ring-4 focus:ring-blue-100"
      defaultValue={value}
      type={type}
    />
  </label>
);
