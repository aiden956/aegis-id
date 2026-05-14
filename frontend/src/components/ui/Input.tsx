type InputProps = {
  label: string;
  type: string;
  value: string;
  name?: string;
  placeholder?: string;
  autoComplete?: string;
  onChange?: (value: string) => void;
  onBlur?: () => void;
  error?: string;
};

export const Input = ({
  label,
  type,
  value,
  name,
  placeholder,
  autoComplete,
  onChange,
  onBlur,
  error,
}: InputProps) => (
  <label className="block">
    <span className="text-sm font-semibold text-slate-700">{label}</span>
    <input
      autoComplete={autoComplete}
      className={[
        "mt-2 h-11 w-full rounded-lg bg-white px-3 text-sm outline-none transition focus:ring-4",
        error
          ? "border border-red-300 focus:border-red-500 focus:ring-red-100"
          : "border border-slate-200 focus:border-blue-500 focus:ring-blue-100",
      ].join(" ")}
      name={name}
      onChange={(event) => onChange?.(event.target.value)}
      onBlur={onBlur}
      placeholder={placeholder}
      readOnly={!onChange}
      type={type}
      value={value}
    />
    {error ? <p className="mt-1 text-xs font-medium text-red-600">{error}</p> : null}
  </label>
);
