import { zodResolver } from "@hookform/resolvers/zod";
import { Controller, useForm } from "react-hook-form";
import { Link, useNavigate } from "react-router";
import { toast } from "sonner";
import { Input } from "../../components/ui/Input";
import { registerFormSchema, type RegisterFormValues } from "../../validation/forms";
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
  const {
    control,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<RegisterFormValues>({
    resolver: zodResolver(registerFormSchema),
    defaultValues: {
      name: "",
      email: "",
      password: "",
    },
  });

  const handleRegister = async ({ name, email, password }: RegisterFormValues) => {
    try {
      const destination = await onRegister(name, email, password);
      toast.success("Account created. Redirecting to your dashboard...");
      navigate(destination);
    } catch (registerError) {
      toast.error(
        registerError instanceof Error
          ? registerError.message
          : "Unable to register account",
      );
    }
  };

  return (
    <AuthFrame
      eyebrow="Account Setup"
      title="Create your AegisID account"
      subtitle="Start with secure credentials and configure protection controls after sign-in."
    >
      <form className="space-y-4" onSubmit={handleSubmit(handleRegister)} noValidate>
        <Controller
          control={control}
          name="name"
          render={({ field }) => (
            <Input
              autoComplete="name"
              label="Full name"
              name="name"
              onChange={field.onChange}
              onBlur={field.onBlur}
              placeholder="Your full name"
              type="text"
              value={field.value}
              error={errors.name?.message}
            />
          )}
        />
        <Controller
          control={control}
          name="email"
          render={({ field }) => (
            <Input
              autoComplete="email"
              label="Email"
              name="email"
              onChange={field.onChange}
              onBlur={field.onBlur}
              placeholder="your@email.com"
              type="email"
              value={field.value}
              error={errors.email?.message}
            />
          )}
        />
        <Controller
          control={control}
          name="password"
          render={({ field }) => (
            <Input
              autoComplete="new-password"
              label="Password"
              name="password"
              onChange={field.onChange}
              onBlur={field.onBlur}
              placeholder="••••••••"
              type="password"
              value={field.value}
              error={errors.password?.message}
            />
          )}
        />
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
