type PageHeaderProps = {
  eyebrow: string;
  title: string;
  description: string;
};

export const PageHeader = ({ eyebrow, title, description }: PageHeaderProps) => (
  <div className="mb-6">
    <p className="text-sm font-semibold uppercase tracking-wide text-blue-700">
      {eyebrow}
    </p>
    <h1 className="mt-1 text-3xl font-semibold text-slate-950">{title}</h1>
    <p className="mt-2 max-w-3xl text-sm leading-6 text-slate-600">
      {description}
    </p>
  </div>
);
