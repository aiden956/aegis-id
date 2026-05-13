import { LockKeyhole } from "lucide-react";
import { useState, type FormEvent } from "react";
import { Link, Navigate, useNavigate } from "react-router";
import { Input } from "../../components/ui/Input";
import type { AuthStatus } from "../../types/iam";
import { AuthFrame } from "./AuthFrame";

type LoginPageProps = {
  onLogin: (email: string, password: string) => Promise<string>;
  status: AuthStatus;
};

export const LoginPage = ({ onLogin, status }: LoginPageProps) => {
  const navigate = useNavigate();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setError(null);
    setIsSubmitting(true);

    try {
      const destination = await onLogin(email, password);
      navigate(destination);
    } catch (submitError) {
      setError(
        submitError instanceof Error ? submitError.message : "Unable to sign in",
      );
    } finally {
      setIsSubmitting(false);
    }
  };

  if (status === "authenticated") {
    return <Navigate to="/dashboard" replace />;
  }
  if (status === "loading") {
    return <main className="p-6 text-sm text-slate-600">Loading session...</main>;
  }

  return (
    <AuthFrame
      eyebrow="AegisID"
      title="Sign in to AegisID"
      subtitle="Manage access, account security, and privileged operations from a unified identity console."
    >
      <form className="space-y-4" onSubmit={handleSubmit}>
        <Input
          autoComplete="email"
          label="Email"
          name="email"
          onChange={setEmail}
          placeholder="admin@aegisid.test"
          type="email"
          value={email}
        />
        <Input
          autoComplete="current-password"
          label="Password"
          name="password"
          onChange={setPassword}
          placeholder="aegisid-demo-password"
          type="password"
          value={password}
        />
        {error ? (
          <p className="text-sm font-medium text-red-700">{error}</p>
        ) : null}
        <button className="primary-button w-full" disabled={isSubmitting} type="submit">
          <LockKeyhole size={18} />
          {isSubmitting ? "Signing in..." : "Sign in"}
        </button>
      </form>

      <div className="grid gap-3 sm:grid-cols-2">
        <button className="secondary-button" disabled type="button">
          <GoogleMark />
          Google OAuth
        </button>
        <button className="secondary-button" disabled type="button">
          <GitHubMark />
          GitHub OAuth
        </button>
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
