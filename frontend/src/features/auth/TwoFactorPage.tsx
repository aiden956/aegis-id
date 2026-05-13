import { BadgeCheck, Smartphone } from "lucide-react";
import { useState } from "react";
import { Link, Navigate, useNavigate } from "react-router";
import { Input } from "../../components/ui/Input";
import type { User } from "../../types/iam";
import { AuthFrame } from "./AuthFrame";

type TwoFactorPageProps = {
  pendingUser: User | null;
  onVerify: (code: string) => Promise<string>;
};

export const TwoFactorPage = ({ pendingUser, onVerify }: TwoFactorPageProps) => {
  const navigate = useNavigate();
  const [code, setCode] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  if (!pendingUser) {
    return <Navigate to="/login" replace />;
  }

  const handleVerify = async () => {
    setError(null);
    setIsSubmitting(true);
    try {
      const destination = await onVerify(code);
      navigate(destination);
    } catch (verifyError) {
      setError(
        verifyError instanceof Error
          ? verifyError.message
          : "Unable to verify authenticator code",
      );
    } finally {
      setIsSubmitting(false);
    }
  };

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
      <Input
        autoComplete="one-time-code"
        label="6-digit code"
        name="totp_code"
        onChange={setCode}
        placeholder="123456"
        type="text"
        value={code}
      />
      {error ? <p className="text-sm font-medium text-red-700">{error}</p> : null}
      <button
        className="primary-button w-full"
        type="button"
        disabled={isSubmitting}
        onClick={handleVerify}
      >
        <BadgeCheck size={18} />
        {isSubmitting ? "Verifying..." : "Verify and continue"}
      </button>
      <Link className="text-center text-sm font-semibold text-blue-700" to="/login">
        Use another account
      </Link>
    </AuthFrame>
  );
};
