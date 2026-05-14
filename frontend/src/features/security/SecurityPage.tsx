import {
  Fingerprint,
  KeyRound,
  QrCode,
  RotateCcw,
  Smartphone,
  X,
} from "lucide-react";
import { useEffect, useState } from "react";
import { useSearchParams } from "react-router";
import type {
  RecoveryCodeSecondFactorMethod,
  RegenerateRecoveryCodesPayload,
} from "../../api/auth";
import { Page } from "../../components/ui/Page";
import { PageHeader } from "../../components/ui/PageHeader";
import { Panel } from "../../components/ui/Panel";
import { SessionRow } from "../../components/ui/SessionRow";
import { StatusPill } from "../../components/ui/StatusPill";
import type { User } from "../../types/iam";

type SecurityPageProps = {
  user: User | null;
  recoveryCodeStatus: { total: number; remaining: number } | null;
  onStartSetup: () => Promise<{
    qrCodeDataUrl: string;
    manualEntryKey: string;
  }>;
  onEnable: (code: string) => Promise<string[]>;
  onDisable: (code: string) => Promise<void>;
  onGetRecoveryCodeStatus: () => Promise<{ total: number; remaining: number }>;
  onRegenerateRecoveryCodes: (
    payload: RegenerateRecoveryCodesPayload,
  ) => Promise<string[]>;
  onStartOAuthRecoveryCodeRegeneration: (
    payload: Omit<RegenerateRecoveryCodesPayload, "password">,
  ) => Promise<void>;
  onConsumePendingRecoveryCodes: () => Promise<string[] | null>;
  onRegisterPasskey: () => Promise<void>;
};

type RegenerationForm = {
  password: string;
  secondFactorMethod: RecoveryCodeSecondFactorMethod;
  secondFactorCode: string;
};

const initialRegenerationForm: RegenerationForm = {
  password: "",
  secondFactorMethod: "totp",
  secondFactorCode: "",
};

export const SecurityPage = ({
  user,
  recoveryCodeStatus,
  onStartSetup,
  onEnable,
  onDisable,
  onGetRecoveryCodeStatus,
  onRegenerateRecoveryCodes,
  onStartOAuthRecoveryCodeRegeneration,
  onConsumePendingRecoveryCodes,
  onRegisterPasskey,
}: SecurityPageProps) => {
  const [searchParams, setSearchParams] = useSearchParams();
  const [setupData, setSetupData] = useState<{
    qrCodeDataUrl: string;
    manualEntryKey: string;
  } | null>(null);
  const [code, setCode] = useState("");
  const [disableCode, setDisableCode] = useState("");
  const [localRecoveryStatus, setLocalRecoveryStatus] = useState<{
    total: number;
    remaining: number;
  } | null>(null);
  const [visibleRecoveryCodes, setVisibleRecoveryCodes] = useState<
    string[] | null
  >(null);
  const [hasConfirmedSavedCodes, setHasConfirmedSavedCodes] = useState(false);
  const [isRegenerationOpen, setIsRegenerationOpen] = useState(false);
  const [regenerationForm, setRegenerationForm] = useState<RegenerationForm>(
    initialRegenerationForm,
  );
  const [error, setError] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const displayedRecoveryStatus = recoveryCodeStatus ?? localRecoveryStatus;
  const isLowOnRecoveryCodes =
    Boolean(user?.isTwoFactorEnabled) &&
    Boolean(displayedRecoveryStatus) &&
    displayedRecoveryStatus!.remaining <= 2;
  const usesOAuthProvider =
    user?.provider === "google" || user?.provider === "github";

  useEffect(() => {
    if (!user?.isTwoFactorEnabled) {
      return;
    }

    let isMounted = true;
    onGetRecoveryCodeStatus()
      .then((status) => {
        if (isMounted) {
          setLocalRecoveryStatus(status);
        }
      })
      .catch(() => {
        if (isMounted) {
          setLocalRecoveryStatus(null);
        }
      });

    return () => {
      isMounted = false;
    };
  }, [onGetRecoveryCodeStatus, user?.isTwoFactorEnabled]);

  useEffect(() => {
    if (searchParams.get("recoveryCodes") !== "ready") {
      return;
    }

    let isMounted = true;
    onConsumePendingRecoveryCodes()
      .then((codes) => {
        if (!isMounted) {
          return;
        }
        if (codes) {
          setVisibleRecoveryCodes(codes);
          setHasConfirmedSavedCodes(false);
          setMessage("Recovery codes regenerated. Save the new set now.");
        }
      })
      .catch((consumeError) => {
        if (isMounted) {
          setError(
            consumeError instanceof Error
              ? consumeError.message
              : "Unable to load regenerated recovery codes",
          );
        }
      })
      .finally(() => {
        if (isMounted) {
          setSearchParams((currentParams) => {
            currentParams.delete("recoveryCodes");
            return currentParams;
          });
        }
      });

    return () => {
      isMounted = false;
    };
  }, [onConsumePendingRecoveryCodes, searchParams, setSearchParams]);

  useEffect(() => {
    const recoveryError = searchParams.get("recoveryError");
    if (!recoveryError) {
      return;
    }

    window.queueMicrotask(() => {
      setError(
        "OAuth re-verification failed. Try generating recovery codes again.",
      );
    });
    setSearchParams((currentParams) => {
      currentParams.delete("recoveryError");
      return currentParams;
    });
  }, [searchParams, setSearchParams]);

  const runWithStatus = async (task: () => Promise<void>) => {
    setError(null);
    setMessage(null);
    setIsSubmitting(true);
    try {
      await task();
    } catch (taskError) {
      setError(
        taskError instanceof Error ? taskError.message : "Request failed",
      );
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleSetup = async () => {
    await runWithStatus(async () => {
      const result = await onStartSetup();
      setSetupData(result);
      setMessage("Scan the QR code and enter your 6-digit code to enable.");
    });
  };

  const handleEnable = async () => {
    await runWithStatus(async () => {
      const generatedRecoveryCodes = await onEnable(code);
      setSetupData(null);
      setCode("");
      setVisibleRecoveryCodes(generatedRecoveryCodes);
      setHasConfirmedSavedCodes(false);
      setLocalRecoveryStatus({
        total: generatedRecoveryCodes.length,
        remaining: generatedRecoveryCodes.length,
      });
      setMessage("Authenticator app enabled. Save your recovery codes now.");
    });
  };

  const handleDisable = async () => {
    await runWithStatus(async () => {
      await onDisable(disableCode);
      setDisableCode("");
      setVisibleRecoveryCodes(null);
      setLocalRecoveryStatus(null);
      setMessage("Two-factor authentication disabled.");
    });
  };

  const handleRegisterPasskey = async () => {
    await runWithStatus(async () => {
      await onRegisterPasskey();
      setMessage("Passkey registered successfully.");
    });
  };

  const handleRegenerateRecoveryCodes = async () => {
    await runWithStatus(async () => {
      const generatedRecoveryCodes = await onRegenerateRecoveryCodes({
        password: regenerationForm.password,
        secondFactorMethod: regenerationForm.secondFactorMethod,
        secondFactorCode: regenerationForm.secondFactorCode,
      });
      setVisibleRecoveryCodes(generatedRecoveryCodes);
      setHasConfirmedSavedCodes(false);
      setLocalRecoveryStatus({
        total: generatedRecoveryCodes.length,
        remaining: generatedRecoveryCodes.length,
      });
      setRegenerationForm(initialRegenerationForm);
      setIsRegenerationOpen(false);
      setMessage("Recovery codes regenerated. Save the new set now.");
    });
  };

  const handleOAuthRegeneration = async () => {
    await runWithStatus(async () => {
      await onStartOAuthRecoveryCodeRegeneration({
        secondFactorMethod: regenerationForm.secondFactorMethod,
        secondFactorCode: regenerationForm.secondFactorCode,
      });
    });
  };

  const handleSavedRecoveryCodes = () => {
    setVisibleRecoveryCodes(null);
    setHasConfirmedSavedCodes(false);
    setMessage("Recovery codes saved confirmation recorded.");
  };

  return (
    <Page>
      <PageHeader
        eyebrow="Security"
        title="Account protection settings"
        description="Configure multi-factor access, provider connections, recovery options, and session protections."
      />
      <div className="grid gap-5 xl:grid-cols-2">
        <Panel title="Authenticator app">
          <div className="flex items-start gap-4 rounded-lg border border-green-200 bg-green-50 p-4 text-green-950">
            <QrCode size={40} />
            <div>
              <p className="font-semibold">
                {user?.isTwoFactorEnabled
                  ? "Authenticator app enabled"
                  : "Authenticator app not enabled"}
              </p>
              <p className="mt-1 text-sm leading-6 text-green-800">
                Add an authenticator app to require a verification code after
                password or social sign-in.
              </p>
            </div>
          </div>
          {setupData ? (
            <div className="mt-4 rounded-lg border border-slate-200 bg-white p-4">
              <img
                alt="Authenticator setup QR code"
                className="mx-auto h-40 w-40"
                src={setupData.qrCodeDataUrl}
              />
              <p className="mt-3 text-sm text-slate-700">
                Manual key:{" "}
                <span className="font-mono">{setupData.manualEntryKey}</span>
              </p>
              <input
                className="mt-3 h-10 w-full rounded-lg border border-slate-200 bg-white px-3 text-sm outline-none focus:border-blue-500"
                value={code}
                placeholder="Enter 6-digit code"
                onChange={(event) => setCode(event.target.value)}
              />
              <button
                className="primary-button mt-3 w-full"
                type="button"
                disabled={isSubmitting}
                onClick={handleEnable}
              >
                <Smartphone size={18} />
                {isSubmitting ? "Enabling..." : "Enable 2FA"}
              </button>
            </div>
          ) : null}
          <div className="mt-4 grid gap-3 sm:grid-cols-2">
            <button
              className="secondary-button"
              type="button"
              onClick={handleSetup}
            >
              <Smartphone size={18} />
              Setup 2FA
            </button>
            {user?.isTwoFactorEnabled ? (
              <button
                className="secondary-button"
                type="button"
                disabled={isSubmitting}
                onClick={() => {
                  setError(null);
                  setMessage(null);
                  setRegenerationForm(initialRegenerationForm);
                  setIsRegenerationOpen(true);
                }}
              >
                <RotateCcw size={18} />
                Generate new codes
              </button>
            ) : null}
          </div>
          {user?.isTwoFactorEnabled && (
            <div
              className={[
                "mt-3 rounded-lg border p-4",
                isLowOnRecoveryCodes
                  ? "border-amber-300 bg-amber-50"
                  : "border-slate-200 bg-slate-50",
              ].join(" ")}
            >
              <div className="flex items-start gap-3">
                <span className="flex size-10 shrink-0 items-center justify-center rounded-lg bg-white text-amber-700 ring-1 ring-amber-200">
                  <KeyRound size={20} />
                </span>
                <div className="min-w-0 flex-1">
                  <div className="flex flex-wrap items-center gap-2">
                    <p className="text-sm font-semibold text-slate-950">
                      Recovery codes
                    </p>
                    <StatusPill
                      status={
                        displayedRecoveryStatus &&
                        displayedRecoveryStatus.remaining > 2
                          ? "success"
                          : "warning"
                      }
                    >
                      {displayedRecoveryStatus
                        ? `${displayedRecoveryStatus.remaining} unused`
                        : "Checking"}
                    </StatusPill>
                  </div>
                  <p className="mt-1 text-sm leading-6 text-slate-700">
                    Recovery codes are stored as secure hashes and cannot be
                    shown again after you confirm saving them.
                  </p>
                  {isLowOnRecoveryCodes ? (
                    <p className="mt-2 text-sm font-semibold text-amber-800">
                      You are running low. Generate a new set soon.
                    </p>
                  ) : null}
                </div>
              </div>
            </div>
          )}
          {user?.isTwoFactorEnabled ? (
            <div className="mt-3 rounded-lg border border-slate-200 bg-white p-4">
              <input
                className="h-10 w-full rounded-lg border border-slate-200 bg-white px-3 text-sm outline-none focus:border-blue-500"
                value={disableCode}
                placeholder="Authenticator code to disable"
                onChange={(event) => setDisableCode(event.target.value)}
              />
              <button
                className="secondary-button mt-3 w-full"
                type="button"
                disabled={isSubmitting}
                onClick={handleDisable}
              >
                Disable 2FA
              </button>
            </div>
          ) : null}
          {error ? (
            <p className="mt-3 text-sm font-medium text-red-700">{error}</p>
          ) : null}
          {message ? (
            <p className="mt-3 text-sm font-medium text-green-700">{message}</p>
          ) : null}
        </Panel>

        <Panel title="Connected login providers">
          <div className="space-y-3">
            {["local", "google", "github"].map((provider) => {
              const connected = user?.provider === provider;
              return (
                <div
                  className="flex items-center justify-between rounded-lg border border-slate-200 p-4"
                  key={provider}
                >
                  <div>
                    <p className="font-semibold">{provider.toUpperCase()}</p>
                    <p className="text-sm text-slate-600">
                      {connected
                        ? "Connected to this account"
                        : "Available to connect"}
                    </p>
                  </div>
                  <StatusPill status={connected ? "success" : "warning"}>
                    {connected ? "Connected" : "Not linked"}
                  </StatusPill>
                </div>
              );
            })}
          </div>
        </Panel>

        <Panel title="Passkeys">
          <div className="rounded-lg border border-blue-200 bg-gradient-to-br from-blue-50 to-slate-50 p-4">
            <div className="flex items-start gap-4">
              <span className="flex size-12 shrink-0 items-center justify-center rounded-lg bg-white text-blue-700 shadow-sm ring-1 ring-blue-100">
                <Fingerprint size={28} />
              </span>
              <div>
                <div className="flex flex-wrap items-center gap-2">
                  <p className="font-semibold text-slate-950">
                    Biometric passkey sign-in
                  </p>
                  <StatusPill status={user?.hasPasskey ? "success" : "warning"}>
                    {user?.hasPasskey ? "Enrolled" : "Not enrolled"}
                  </StatusPill>
                </div>
                <p className="mt-1 max-w-xl text-sm leading-6 text-slate-600">
                  Use your device biometrics, PIN, or security key to sign in
                  without typing a password.
                </p>
              </div>
            </div>
          </div>
          <button
            className="secondary-button mt-4"
            type="button"
            disabled={isSubmitting}
            onClick={handleRegisterPasskey}
          >
            <Fingerprint size={18} />
            {isSubmitting
              ? "Registering..."
              : user?.hasPasskey
                ? "Add another passkey"
                : "Register passkey"}
          </button>
        </Panel>

        <Panel title="Session policy">
          <div className="space-y-3">
            <SessionRow label="Access token" value="Short-lived token" />
            <SessionRow label="Refresh token" value="Rotating token strategy" />
            <SessionRow
              label="Browser storage"
              value="HTTP-only secure cookies"
            />
            <SessionRow label="Logout behavior" value="Revoke refresh token" />
          </div>
        </Panel>
      </div>

      {isRegenerationOpen ? (
        <RecoveryCodeRegenerationModal
          form={regenerationForm}
          isOAuthProvider={usesOAuthProvider}
          isSubmitting={isSubmitting}
          provider={user?.provider}
          onChange={setRegenerationForm}
          onClose={() => {
            setIsRegenerationOpen(false);
            setRegenerationForm(initialRegenerationForm);
          }}
          onGenerate={handleRegenerateRecoveryCodes}
          onOAuthGenerate={handleOAuthRegeneration}
        />
      ) : null}

      {visibleRecoveryCodes ? (
        <SaveRecoveryCodesModal
          codes={visibleRecoveryCodes}
          confirmed={hasConfirmedSavedCodes}
          onConfirmChange={setHasConfirmedSavedCodes}
          onDone={handleSavedRecoveryCodes}
        />
      ) : null}
    </Page>
  );
};

const RecoveryCodeRegenerationModal = ({
  form,
  isOAuthProvider,
  isSubmitting,
  provider,
  onChange,
  onClose,
  onGenerate,
  onOAuthGenerate,
}: {
  form: RegenerationForm;
  isOAuthProvider: boolean;
  isSubmitting: boolean;
  provider?: string;
  onChange: (form: RegenerationForm) => void;
  onClose: () => void;
  onGenerate: () => void;
  onOAuthGenerate: () => void;
}) => (
  <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/50 p-4">
    <div className="w-full max-w-lg rounded-lg bg-white p-5 shadow-xl">
      <div className="flex items-start justify-between gap-4">
        <div>
          <p className="text-lg font-semibold text-slate-950">
            Generate new recovery codes
          </p>
          <p className="mt-1 text-sm leading-6 text-slate-600">
            Your old unused recovery codes will be disabled immediately after a
            new set is created.
          </p>
        </div>
        <button
          className="icon-button"
          type="button"
          aria-label="Close"
          onClick={onClose}
        >
          <X size={18} />
        </button>
      </div>

      <div className="mt-4 rounded-lg border border-amber-200 bg-amber-50 p-4 text-sm text-amber-900">
        <p className="font-semibold">Verification required</p>
        <p className="mt-1 text-amber-800">
          Confirm your identity before replacing the current recovery codes.
        </p>
      </div>

      <div className="mt-4 space-y-3">
        {!isOAuthProvider ? (
          <label className="block text-sm font-semibold text-slate-700">
            Password
            <input
              className="mt-2 h-10 w-full rounded-lg border border-slate-200 bg-white px-3 text-sm font-normal outline-none focus:border-blue-500"
              value={form.password}
              type="password"
              autoComplete="current-password"
              onChange={(event) =>
                onChange({ ...form, password: event.target.value })
              }
            />
          </label>
        ) : null}

        <div className="grid grid-cols-2 gap-2">
          {(["totp", "recovery"] as const).map((method) => (
            <button
              className={[
                "rounded-lg border px-3 py-2 text-sm font-semibold",
                form.secondFactorMethod === method
                  ? "border-blue-600 bg-blue-50 text-blue-700"
                  : "border-slate-200 bg-white text-slate-700",
              ].join(" ")}
              type="button"
              key={method}
              onClick={() =>
                onChange({
                  ...form,
                  secondFactorMethod: method,
                  secondFactorCode: "",
                })
              }
            >
              {method === "totp" ? "Authenticator code" : "Recovery code"}
            </button>
          ))}
        </div>

        <label className="block text-sm font-semibold text-slate-700">
          {form.secondFactorMethod === "totp"
            ? "Authenticator code"
            : "Unused recovery code"}
          <input
            className="mt-2 h-10 w-full rounded-lg border border-slate-200 bg-white px-3 text-sm font-normal outline-none focus:border-blue-500"
            value={form.secondFactorCode}
            type="text"
            autoComplete={
              form.secondFactorMethod === "totp" ? "one-time-code" : "off"
            }
            placeholder={
              form.secondFactorMethod === "totp" ? "123456" : "ABCD-1234-EFGH"
            }
            onChange={(event) =>
              onChange({ ...form, secondFactorCode: event.target.value })
            }
          />
        </label>
      </div>

      <div className="mt-5 flex flex-col gap-2 sm:flex-row sm:justify-end">
        <button className="secondary-button" type="button" onClick={onClose}>
          Cancel
        </button>
        {isOAuthProvider ? (
          <button
            className="primary-button"
            type="button"
            disabled={isSubmitting}
            onClick={onOAuthGenerate}
          >
            Verify with {provider === "github" ? "GitHub" : "Google"}
          </button>
        ) : (
          <button
            className="primary-button"
            type="button"
            disabled={isSubmitting}
            onClick={onGenerate}
          >
            Generate new codes
          </button>
        )}
      </div>
    </div>
  </div>
);

const SaveRecoveryCodesModal = ({
  codes,
  confirmed,
  onConfirmChange,
  onDone,
}: {
  codes: string[];
  confirmed: boolean;
  onConfirmChange: (value: boolean) => void;
  onDone: () => void;
}) => (
  <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/60 p-4">
    <div className="w-full max-w-2xl rounded-lg bg-white p-5 shadow-xl">
      <p className="text-lg font-semibold text-slate-950">
        Save your recovery codes
      </p>
      <p className="mt-1 text-sm leading-6 text-slate-600">
        These codes are shown once. Store them somewhere private before
        continuing.
      </p>
      <div className="mt-4 grid gap-2 sm:grid-cols-2">
        {codes.map((item) => (
          <code
            key={item}
            className="rounded-lg border border-amber-200 bg-amber-50 px-3 py-2 text-sm font-semibold text-slate-900"
          >
            {item}
          </code>
        ))}
      </div>
      <label className="mt-4 flex items-start gap-3 rounded-lg border border-slate-200 p-3 text-sm font-semibold text-slate-800">
        <input
          className="mt-1"
          type="checkbox"
          checked={confirmed}
          onChange={(event) => onConfirmChange(event.target.checked)}
        />
        I have saved these recovery codes somewhere safe.
      </label>
      <div className="mt-5 flex justify-end">
        <button
          className="primary-button"
          type="button"
          disabled={!confirmed}
          onClick={onDone}
        >
          Done
        </button>
      </div>
    </div>
  </div>
);
