import { zodResolver } from "@hookform/resolvers/zod";
import { useEffect, useState } from "react";
import { Controller, useForm } from "react-hook-form";
import { Link, Navigate, useNavigate, useSearchParams } from "react-router";
import { toast } from "sonner";
import { startOAuthLogin } from "../../api/auth";
import githubIcon from "../../assets/brands/github.svg";
import googleIcon from "../../assets/brands/google.svg";
import { Input } from "../../components/ui/Input";
import type { AuthStatus } from "../../types/iam";
import { loginFormSchema, type LoginFormValues } from "../../validation/forms";
import { AuthFrame } from "./AuthFrame";

type LoginPageProps = {
  onLogin: (email: string, password: string) => Promise<string>;
  onLoginWithPasskey: (email?: string) => Promise<string>;
  status: AuthStatus;
};

export const LoginPage = ({ onLogin, onLoginWithPasskey, status }: LoginPageProps) => {
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();
  const [isPasskeySubmitting, setIsPasskeySubmitting] = useState(false);
  const oauthError = searchParams.get("error");
  const {
    control,
    handleSubmit,
    formState: { errors, isSubmitting },
    getValues,
  } = useForm<LoginFormValues>({
    resolver: zodResolver(loginFormSchema),
    defaultValues: {
      email: "",
      password: "",
    },
  });

  const toFriendlyError = (value: unknown) => {
    const rawMessage =
      value instanceof Error ? value.message : "We couldn't complete your sign-in request.";
    const normalized = rawMessage.toLowerCase();

    if (normalized.includes("timed out") || normalized.includes("not allowed")) {
      return "Passkey sign-in was canceled or took too long. Please try again and approve the passkey prompt.";
    }
    if (normalized.includes("not supported")) {
      return "This browser or device doesn't support passkey sign-in.";
    }
    if (normalized.includes("no passkey registered")) {
      return "No passkey is registered for this account yet. Sign in with password and add one in Security settings.";
    }

    return rawMessage;
  };

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

  useEffect(() => {
    if (!oauthErrorMessage) {
      return;
    }

    toast.error(oauthErrorMessage);
    setSearchParams((currentParams) => {
      currentParams.delete("error");
      return currentParams;
    });
  }, [oauthErrorMessage, setSearchParams]);

  const handleLoginSubmit = async ({ email, password }: LoginFormValues) => {
    try {
      const destination = await onLogin(email, password);
      navigate(destination);
    } catch (submitError) {
      toast.error(toFriendlyError(submitError));
    }
  };

  const handlePasskeyLogin = async () => {
    setIsPasskeySubmitting(true);
    try {
      const destination = await onLoginWithPasskey(getValues("email").trim());
      navigate(destination);
    } catch (passkeyError) {
      toast.error(toFriendlyError(passkeyError));
    } finally {
      setIsPasskeySubmitting(false);
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
      <form className="space-y-4" onSubmit={handleSubmit(handleLoginSubmit)} noValidate>
        <Controller
          control={control}
          name="email"
          render={({ field }) => (
            <Input
              autoComplete="email"
              label="Email"
              name="email"
              placeholder="your@email.com"
              type="email"
              value={field.value}
              onChange={field.onChange}
              onBlur={field.onBlur}
              error={errors.email?.message}
            />
          )}
        />
        <Controller
          control={control}
          name="password"
          render={({ field }) => (
            <Input
              autoComplete="current-password"
              label="Password"
              name="password"
              placeholder="••••••••"
              type="password"
              value={field.value}
              onChange={field.onChange}
              onBlur={field.onBlur}
              error={errors.password?.message}
            />
          )}
        />
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
          className="secondary-button sm:col-span-2"
          type="button"
          disabled={isPasskeySubmitting}
          onClick={handlePasskeyLogin}
        >
          {isPasskeySubmitting ? "Checking passkey..." : "Sign in with passkey"}
        </button>
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
