import { Shield } from "lucide-react";
import type { ReactNode } from "react";

type AuthFrameProps = {
  eyebrow: string;
  title: string;
  subtitle: string;
  children: ReactNode;
};

export const AuthFrame = ({
  eyebrow,
  title,
  subtitle,
  children,
}: AuthFrameProps) => (
  <main className="min-h-screen bg-slate-100 px-4 py-8 text-slate-950">
    <div className="mx-auto grid min-h-[calc(100vh-4rem)] max-w-6xl items-center gap-8 lg:grid-cols-[1fr_440px]">
      <section className="hidden lg:block">
        <div className="inline-flex items-center gap-2 rounded-full border border-blue-200 bg-white px-3 py-1 text-sm font-semibold text-blue-800 shadow-sm">
          <Shield size={16} />
          AegisID Identity Platform
        </div>
        <h1 className="mt-6 max-w-2xl text-5xl font-semibold leading-tight text-slate-950">
          Secure every identity, session, and permission in one place.
        </h1>
        <div className="mt-8 grid max-w-2xl gap-4 sm:grid-cols-2">
          {[
            ["Single Sign-On", "Google and GitHub provider access"],
            ["Session Security", "Managed token lifecycle and rotation"],
            ["MFA Coverage", "Authenticator app and recovery controls"],
            ["Access Governance", "Role-based privilege boundaries"],
          ].map(([label, description]) => (
            <div
              className="rounded-lg border border-slate-200 bg-white p-4 shadow-sm"
              key={label}
            >
              <p className="font-semibold text-slate-950">{label}</p>
              <p className="mt-1 text-sm text-slate-600">{description}</p>
            </div>
          ))}
        </div>
      </section>

      <section className="rounded-lg border border-slate-200 bg-white p-6 shadow-xl shadow-slate-200/70">
        <p className="text-sm font-semibold uppercase tracking-wide text-blue-700">
          {eyebrow}
        </p>
        <h2 className="mt-2 text-2xl font-semibold text-slate-950">{title}</h2>
        <p className="mt-2 text-sm leading-6 text-slate-600">{subtitle}</p>
        <div className="mt-6 space-y-5">{children}</div>
      </section>
    </div>
  </main>
);
