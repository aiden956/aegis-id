import { useState, type FormEvent } from "react";
import { Link, useNavigate } from "react-router";
import { Input } from "../../components/ui/Input";
import { AuthFrame } from "./AuthFrame";

type RegisterPageProps = {
  onRegister: (
    name: string,
    email: string,
    password: string,
  ) => Promise<string>;
};

export const RegisterPage = ({ onRegister }: RegisterPageProps) => {
  const navigate = useNavigate();
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleRegister = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setError(null);
    setSuccess(null);
    setIsSubmitting(true);

    try {
      const destination = await onRegister(name, email, password);
      setSuccess("Account created. Redirecting to your dashboard...");
      navigate(destination);
    } catch (registerError) {
      setError(
        registerError instanceof Error
          ? registerError.message
          : "Unable to register account",
      );
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <AuthFrame
      eyebrow="Account Setup"
      title="Create your AegisID account"
      subtitle="Start with secure credentials and configure protection controls after sign-in."
    >
      <form className="space-y-4" onSubmit={handleRegister}>
        <Input
          autoComplete="name"
          label="Full name"
          name="name"
          onChange={setName}
          placeholder="Your full name"
          type="text"
          value={name}
        />
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
          autoComplete="new-password"
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
        {success ? (
          <p className="text-sm font-medium text-green-700">{success}</p>
        ) : null}
        <button
          className="primary-button w-full"
          disabled={isSubmitting}
          type="submit"
        >
          {isSubmitting ? "Signing up..." : "Sign up"}
        </button>
      </form>
      <p className="text-center text-sm text-slate-600">
        Already have an account?{" "}
        <Link className="font-semibold text-blue-700" to="/login">
          Sign in
        </Link>
      </p>
    </AuthFrame>
  );
};
