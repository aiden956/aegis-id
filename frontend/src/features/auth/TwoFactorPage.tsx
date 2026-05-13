import { BadgeCheck, Smartphone } from "lucide-react";
import { Link, Navigate, useNavigate } from "react-router";
import { Input } from "../../components/ui/Input";
import type { DemoUser } from "../../types/iam";
import { AuthFrame } from "./AuthFrame";

type TwoFactorPageProps = {
  pendingUser: DemoUser | null;
  onVerify: () => string;
};

export const TwoFactorPage = ({ pendingUser, onVerify }: TwoFactorPageProps) => {
  const navigate = useNavigate();

  if (!pendingUser) {
    return <Navigate to="/login" replace />;
  }

  return (
    <AuthFrame
      eyebrow="Two-Factor Authentication"
      title="Enter your authenticator code"
      subtitle={`A 6-digit TOTP code is required for ${pendingUser.email}.`}
    >
      <div className="flex items-center gap-3 rounded-lg border border-blue-100 bg-blue-50 p-4 text-blue-900">
        <Smartphone size={22} />
        <div>
          <p className="font-semibold">Authenticator app challenge</p>
          <p className="text-sm text-blue-800">
            Use Google Authenticator, Microsoft Authenticator, or Authy.
          </p>
        </div>
      </div>
      <Input label="6-digit code" type="text" value="123456" />
      <button
        className="primary-button w-full"
        type="button"
        onClick={() => navigate(onVerify())}
      >
        <BadgeCheck size={18} />
        Verify and continue
      </button>
      <Link className="text-center text-sm font-semibold text-blue-700" to="/login">
        Use another account
      </Link>
    </AuthFrame>
  );
};
