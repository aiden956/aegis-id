import { BadgeCheck, Smartphone } from "lucide-react";
import { useState } from "react";
import { Navigate, useNavigate } from "react-router";
import { Input } from "../../components/ui/Input";
import type { User } from "../../types/iam";
import { AuthFrame } from "./AuthFrame";

type TwoFactorPageProps = {
  pendingUser: User | null;
  onVerify: (code: string) => Promise<string>;
  onVerifyRecoveryCode: (code: string) => Promise<string>;
  onCancelChallenge: () => Promise<void>;
};

export const TwoFactorPage = ({
  pendingUser,
  onVerify,
  onVerifyRecoveryCode,
  onCancelChallenge,
}: TwoFactorPageProps) => {
  const navigate = useNavigate();
  const [code, setCode] = useState("");
  const [method, setMethod] = useState<"totp" | "recovery">("totp");
  const [error, setError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isCancelling, setIsCancelling] = useState(false);

  if (!pendingUser) {
    return <Navigate to="/login" replace />;
  }

  const handleVerify = async () => {
    setError(null);
    setIsSubmitting(true);
    try {
      const destination =
        method === "totp"
          ? await onVerify(code)
          : await onVerifyRecoveryCode(code);
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

  const handleUseAnotherAccount = async () => {
    setError(null);
    setIsCancelling(true);
    try {
      await onCancelChallenge();
      navigate("/login", { replace: true });
    } catch (cancelError) {
      setError(
        cancelError instanceof Error
          ? cancelError.message
          : "Unable to return to sign in. Please try again.",
      );
    } finally {
      setIsCancelling(false);
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
        autoComplete={method === "totp" ? "one-time-code" : "off"}
        label={method === "totp" ? "6-digit code" : "Recovery code"}
        name={method === "totp" ? "totp_code" : "recovery_code"}
        onChange={setCode}
        placeholder={method === "totp" ? "123456" : "ABCD-1234-EFGH"}
        type="text"
        value={code}
      />
      <button
        className="text-left text-sm font-semibold text-blue-700"
        type="button"
        onClick={() => {
          setError(null);
          setCode("");
          setMethod((existingMethod) =>
            existingMethod === "totp" ? "recovery" : "totp",
          );
        }}
      >
        {method === "totp" ? "Use recovery code instead" : "Use authenticator code instead"}
      </button>
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
      <button
        className="text-center text-sm font-semibold text-blue-700 disabled:text-slate-400"
        type="button"
        disabled={isCancelling}
        onClick={handleUseAnotherAccount}
      >
        {isCancelling ? "Returning to sign in..." : "Use another account"}
      </button>
    </AuthFrame>
  );
};
