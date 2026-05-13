import { ShieldCheck } from "lucide-react";
import { Link } from "react-router";
import { Input } from "../../components/ui/Input";
import { AuthFrame } from "./AuthFrame";

export const RegisterPage = () => (
  <AuthFrame
    eyebrow="Account Setup"
    title="Create your AegisID account"
    subtitle="Start with secure credentials and configure protection controls after sign-in."
  >
    <form className="space-y-4">
      <Input label="Full name" type="text" value="New AegisID User" />
      <Input label="Email" type="email" value="student@secureiam.test" />
      <Input label="Password" type="password" value="choose-a-strong-password" />
      <button className="primary-button w-full" type="button">
        <ShieldCheck size={18} />
        Create account
      </button>
    </form>
    <p className="text-center text-sm text-slate-600">
      Already registered?{" "}
      <Link className="font-semibold text-blue-700" to="/login">
        Sign in
      </Link>
    </p>
  </AuthFrame>
);
