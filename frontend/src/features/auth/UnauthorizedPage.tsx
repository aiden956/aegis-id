import { AlertTriangle } from "lucide-react";
import { useNavigate } from "react-router";
import type { DemoUser } from "../../types/iam";

type UnauthorizedPageProps = {
  user: DemoUser | null;
  onLogout: () => void;
};

export const UnauthorizedPage = ({ user, onLogout }: UnauthorizedPageProps) => {
  const navigate = useNavigate();

  return (
    <main className="flex min-h-screen items-center justify-center bg-slate-100 px-4">
      <section className="max-w-md rounded-lg border border-slate-200 bg-white p-6 text-center shadow-xl shadow-slate-200/70">
        <div className="mx-auto flex size-14 items-center justify-center rounded-lg bg-red-50 text-red-700">
          <AlertTriangle size={28} />
        </div>
        <h1 className="mt-5 text-2xl font-semibold text-slate-950">
          Access denied
        </h1>
        <p className="mt-2 text-sm leading-6 text-slate-600">
          {user?.email ?? "This account"} does not have the ADMIN role required
          for this route.
        </p>
        <div className="mt-6 grid gap-3 sm:grid-cols-2">
          <button
            className="secondary-button"
            type="button"
            onClick={() => navigate("/dashboard")}
          >
            Dashboard
          </button>
          <button
            className="primary-button"
            type="button"
            onClick={() => {
              onLogout();
              navigate("/login");
            }}
          >
            Logout
          </button>
        </div>
      </section>
    </main>
  );
};
