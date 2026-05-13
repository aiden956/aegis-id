import { LockKeyhole } from "lucide-react";
import type { FormEvent } from "react";
import { Link, Navigate, useNavigate } from "react-router";
import { Input } from "../../components/ui/Input";
import type { AuthStatus, Role } from "../../types/iam";
import { AuthFrame } from "./AuthFrame";

type LoginPageProps = {
  onLogin: (role: Role) => string;
  status: AuthStatus;
};

export const LoginPage = ({ onLogin, status }: LoginPageProps) => {
  const navigate = useNavigate();

  const handleSubmit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    navigate(onLogin("USER"));
  };

  const handleDemoLogin = (role: Role) => {
    navigate(onLogin(role));
  };

  if (status === "authenticated") {
    return <Navigate to="/dashboard" replace />;
  }

  return (
    <AuthFrame
      eyebrow="AegisID"
      title="Sign in to AegisID"
      subtitle="Manage access, account security, and privileged operations from a unified identity console."
    >
      <form className="space-y-4" onSubmit={handleSubmit}>
        <Input label="Email" type="email" value="maya.user@secureiam.test" />
        <Input label="Password" type="password" value="argon2id-demo" />
        <button className="primary-button w-full" type="submit">
          <LockKeyhole size={18} />
          Sign in
        </button>
      </form>

      <div className="grid gap-3 sm:grid-cols-2">
        <button className="secondary-button" type="button">
          <GoogleMark />
          Google OAuth
        </button>
        <button className="secondary-button" type="button">
          <GitHubMark />
          GitHub OAuth
        </button>
      </div>

      <div className="rounded-lg border border-slate-200 bg-slate-50 p-3">
        <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">
          Sandbox access
        </p>
        <div className="mt-3 grid gap-3 sm:grid-cols-2">
          <button
            className="ghost-button"
            type="button"
            onClick={() => handleDemoLogin("USER")}
          >
            Continue as User
          </button>
          <button
            className="ghost-button"
            type="button"
            onClick={() => handleDemoLogin("ADMIN")}
          >
            Continue as Admin
          </button>
        </div>
      </div>

      <p className="text-center text-sm text-slate-600">
        New to the portal?{" "}
        <Link className="font-semibold text-blue-700" to="/register">
          Create an account
        </Link>
      </p>
    </AuthFrame>
  );
};

const GoogleMark = () => (
  <span className="flex size-[18px] items-center justify-center rounded-full bg-white text-xs font-black text-blue-700">
    G
  </span>
);

const GitHubMark = () => (
  <span className="flex size-[18px] items-center justify-center rounded-full bg-slate-950 text-xs font-black text-white">
    GH
  </span>
);
