import { useState, type FormEvent } from "react";
import { Link, Navigate, useNavigate, useSearchParams } from "react-router";
import { startOAuthLogin } from "../../api/auth";
import githubIcon from "../../assets/brands/github.svg";
import googleIcon from "../../assets/brands/google.svg";
import { Input } from "../../components/ui/Input";
import type { AuthStatus } from "../../types/iam";
import { AuthFrame } from "./AuthFrame";

type LoginPageProps = {
  onLogin: (email: string, password: string) => Promise<string>;
  status: AuthStatus;
};

export const LoginPage = ({ onLogin, status }: LoginPageProps) => {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const oauthError = searchParams.get("error");

  const oauthErrorMessage = (() => {
    if (!oauthError) return null;
    if (oauthError === "oauth_conflict") {
      return "This email already belongs to another sign-in method.";
    }
    if (oauthError === "oauth_not_configured") {
      return "OAuth provider is not configured on the server.";
    }
    if (oauthError === "oauth_invalid_state") {
      return "OAuth login failed state validation. Please try again.";
    }
    return "OAuth login failed. Please try again.";
  })();

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setError(null);
    setIsSubmitting(true);

    try {
      const destination = await onLogin(email, password);
      navigate(destination);
    } catch (submitError) {
      setError(
        submitError instanceof Error
          ? submitError.message
          : "Unable to sign in",
      );
    } finally {
      setIsSubmitting(false);
    }
  };

  if (status === "authenticated") {
    return <Navigate to="/dashboard" replace />;
  }
  if (status === "pending_2fa") {
    return <Navigate to="/verify-2fa" replace />;
  }
  if (status === "loading") {
    return (
      <main className="p-6 text-sm text-slate-600">Loading session...</main>
    );
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
          placeholder="your@email.com"
          type="email"
          value={email}
        />
        <Input
          autoComplete="current-password"
          label="Password"
          name="password"
          onChange={setPassword}
          placeholder="••••••••"
          type="password"
          value={password}
        />
        {error ? (
          <p className="text-sm font-medium text-red-700">{error}</p>
        ) : null}
        <button
          className="primary-button w-full"
          disabled={isSubmitting}
          type="submit"
        >
          {isSubmitting ? "Signing in..." : "Sign in"}
        </button>
      </form>

      <div className="grid gap-3 sm:grid-cols-2">
        <button
          className="secondary-button"
          type="button"
          onClick={() => startOAuthLogin("google")}
        >
          <GoogleMark />
          Google OAuth
        </button>
        <button
          className="secondary-button"
          type="button"
          onClick={() => startOAuthLogin("github")}
        >
          <GitHubMark />
          GitHub OAuth
        </button>
      </div>
      {oauthErrorMessage ? (
        <p className="text-sm font-medium text-red-700">{oauthErrorMessage}</p>
      ) : null}

      <p className="text-center text-sm text-slate-600">
        Don't have an account?{" "}
        <Link className="font-semibold text-blue-700" to="/register">
          Sign up
        </Link>
      </p>
    </AuthFrame>
  );
};

const GoogleMark = () => (
  <img alt="" className="size-7" src={googleIcon} aria-hidden="true" />
);

const GitHubMark = () => (
  <img alt="" className="size-4.5" src={githubIcon} aria-hidden="true" />
);
