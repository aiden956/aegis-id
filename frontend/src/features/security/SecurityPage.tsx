import { zodResolver } from "@hookform/resolvers/zod";
import {
  Fingerprint,
  KeyRound,
  QrCode,
  RotateCcw,
  Smartphone,
  X,
} from "lucide-react";
import { useEffect, useState } from "react";
import { Controller, useController, useForm } from "react-hook-form";
import { useSearchParams } from "react-router";
import { toast } from "sonner";
import type {
  RegenerateRecoveryCodesPayload,
} from "../../api/auth";
import { Page } from "../../components/ui/Page";
import { PageHeader } from "../../components/ui/PageHeader";
import { Panel } from "../../components/ui/Panel";
import { SessionRow } from "../../components/ui/SessionRow";
import { StatusPill } from "../../components/ui/StatusPill";
import type { User } from "../../types/iam";
import {
  disableTwoFactorSchema,
  enableTwoFactorSchema,
  recoveryRegenerationBaseSchema,
  recoveryRegenerationLocalSchema,
  type DisableTwoFactorValues,
  type EnableTwoFactorValues,
  type RecoveryRegenerationFormValues,
} from "../../validation/forms";

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

const toFriendlyToastError = (value: unknown) => {
  const rawMessage = value instanceof Error ? value.message : "Request failed";
  const normalized = rawMessage.toLowerCase();

  if (normalized.includes("timed out") || normalized.includes("not allowed")) {
    return "Passkey setup was canceled or timed out. Please try again and approve the passkey prompt.";
  }
  if (normalized.includes("not supported")) {
    return "This browser or device does not support passkey setup.";
  }

  return rawMessage;
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
  const [localRecoveryStatus, setLocalRecoveryStatus] = useState<{
    total: number;
    remaining: number;
  } | null>(null);
  const [visibleRecoveryCodes, setVisibleRecoveryCodes] = useState<
    string[] | null
  >(null);
  const [hasConfirmedSavedCodes, setHasConfirmedSavedCodes] = useState(false);
  const [isRegenerationOpen, setIsRegenerationOpen] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const {
    control: enableControl,
    handleSubmit: handleEnableSubmit,
    reset: resetEnableForm,
    formState: { errors: enableErrors },
  } = useForm<EnableTwoFactorValues>({
    resolver: zodResolver(enableTwoFactorSchema),
    defaultValues: { code: "" },
  });
  const {
    control: disableControl,
    handleSubmit: handleDisableSubmit,
    reset: resetDisableForm,
    formState: { errors: disableErrors },
  } = useForm<DisableTwoFactorValues>({
    resolver: zodResolver(disableTwoFactorSchema),
    defaultValues: { code: "" },
  });

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
          toast.success("Recovery codes regenerated. Save the new set now.");
        }
      })
      .catch((consumeError) => {
        if (isMounted) {
          toast.error(
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
      toast.error("OAuth re-verification failed. Try generating recovery codes again.");
    });
    setSearchParams((currentParams) => {
      currentParams.delete("recoveryError");
      return currentParams;
    });
  }, [searchParams, setSearchParams]);

  const runWithStatus = async (task: () => Promise<void>) => {
    setIsSubmitting(true);
    try {
      await task();
    } catch (taskError) {
      toast.error(toFriendlyToastError(taskError));
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleSetup = async () => {
    await runWithStatus(async () => {
      const result = await onStartSetup();
      setSetupData(result);
      toast.success("Scan the QR code and enter your 6-digit code to enable.");
    });
  };

  const handleEnable = async ({ code }: EnableTwoFactorValues) => {
    await runWithStatus(async () => {
      const generatedRecoveryCodes = await onEnable(code);
      setSetupData(null);
      resetEnableForm();
      setVisibleRecoveryCodes(generatedRecoveryCodes);
      setHasConfirmedSavedCodes(false);
      setLocalRecoveryStatus({
        total: generatedRecoveryCodes.length,
        remaining: generatedRecoveryCodes.length,
      });
      toast.success("Authenticator app enabled. Save your recovery codes now.");
    });
  };

  const handleDisable = async ({ code }: DisableTwoFactorValues) => {
    await runWithStatus(async () => {
      await onDisable(code);
      resetDisableForm();
      setVisibleRecoveryCodes(null);
      setLocalRecoveryStatus(null);
      toast.success("Two-factor authentication disabled.");
    });
  };

  const handleRegisterPasskey = async () => {
    await runWithStatus(async () => {
      await onRegisterPasskey();
      toast.success("Passkey registered successfully.");
    });
  };

  const handleRegenerateRecoveryCodes = async (
    values: RecoveryRegenerationFormValues,
    isOAuthProvider: boolean,
  ) => {
    await runWithStatus(async () => {
      if (isOAuthProvider) {
        await onStartOAuthRecoveryCodeRegeneration({
          secondFactorMethod: values.secondFactorMethod,
          secondFactorCode: values.secondFactorCode,
        });
        return;
      }

      const generatedRecoveryCodes = await onRegenerateRecoveryCodes({
        password: values.password,
        secondFactorMethod: values.secondFactorMethod,
        secondFactorCode: values.secondFactorCode,
      });
      setVisibleRecoveryCodes(generatedRecoveryCodes);
      setHasConfirmedSavedCodes(false);
      setLocalRecoveryStatus({
        total: generatedRecoveryCodes.length,
        remaining: generatedRecoveryCodes.length,
      });
      setIsRegenerationOpen(false);
      toast.success("Recovery codes regenerated. Save the new set now.");
    });
  };

  const handleSavedRecoveryCodes = () => {
    setVisibleRecoveryCodes(null);
    setHasConfirmedSavedCodes(false);
    toast.success("Recovery codes saved confirmation recorded.");
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
              <Controller
                control={enableControl}
                name="code"
                render={({ field }) => (
                  <>
                    <input
                      className={[
                        "mt-3 h-10 w-full rounded-lg bg-white px-3 text-sm outline-none",
                        enableErrors.code
                          ? "border border-red-300 focus:border-red-500"
                          : "border border-slate-200 focus:border-blue-500",
                      ].join(" ")}
                      value={field.value}
                      placeholder="Enter 6-digit code"
                      onChange={(event) => field.onChange(event.target.value)}
                    />
                    {enableErrors.code ? (
                      <p className="mt-1 text-xs font-medium text-red-600">
                        {enableErrors.code.message}
                      </p>
                    ) : null}
                  </>
                )}
              />
              <button
                className="primary-button mt-3 w-full"
                type="button"
                disabled={isSubmitting}
                onClick={handleEnableSubmit(handleEnable)}
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
              <Controller
                control={disableControl}
                name="code"
                render={({ field }) => (
                  <>
                    <input
                      className={[
                        "h-10 w-full rounded-lg bg-white px-3 text-sm outline-none",
                        disableErrors.code
                          ? "border border-red-300 focus:border-red-500"
                          : "border border-slate-200 focus:border-blue-500",
                      ].join(" ")}
                      value={field.value}
                      placeholder="Authenticator code to disable"
                      onChange={(event) => field.onChange(event.target.value)}
                    />
                    {disableErrors.code ? (
                      <p className="mt-1 text-xs font-medium text-red-600">
                        {disableErrors.code.message}
                      </p>
                    ) : null}
                  </>
                )}
              />
              <button
                className="secondary-button mt-3 w-full"
                type="button"
                disabled={isSubmitting}
                onClick={handleDisableSubmit(handleDisable)}
              >
                Disable 2FA
              </button>
            </div>
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
          isOAuthProvider={usesOAuthProvider}
          isSubmitting={isSubmitting}
          provider={user?.provider}
          onClose={() => setIsRegenerationOpen(false)}
          onGenerate={handleRegenerateRecoveryCodes}
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
  isOAuthProvider,
  isSubmitting,
  provider,
  onClose,
  onGenerate,
}: {
  isOAuthProvider: boolean;
  isSubmitting: boolean;
  provider?: string;
  onClose: () => void;
  onGenerate: (
    values: RecoveryRegenerationFormValues,
    isOAuthProvider: boolean,
  ) => Promise<void>;
}) => {
  const {
    control,
    handleSubmit,
    setValue,
    formState: { errors },
  } = useForm<RecoveryRegenerationFormValues>({
    resolver: zodResolver(
      isOAuthProvider ? recoveryRegenerationBaseSchema : recoveryRegenerationLocalSchema,
    ),
    defaultValues: {
      secondFactorMethod: "totp",
      secondFactorCode: "",
      ...(isOAuthProvider ? {} : { password: "" }),
    },
  });
  const { field: secondFactorMethodField } = useController({
    control,
    name: "secondFactorMethod",
  });
  const selectedMethod = secondFactorMethodField.value;

  return (
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
            <Controller
              control={control}
              name="password"
              render={({ field }) => (
                <label className="block text-sm font-semibold text-slate-700">
                  Password
                  <input
                    className={[
                      "mt-2 h-10 w-full rounded-lg bg-white px-3 text-sm font-normal outline-none",
                      errors.password
                        ? "border border-red-300 focus:border-red-500"
                        : "border border-slate-200 focus:border-blue-500",
                    ].join(" ")}
                    value={field.value ?? ""}
                    type="password"
                    autoComplete="current-password"
                    onChange={(event) => field.onChange(event.target.value)}
                  />
                  {errors.password ? (
                    <p className="mt-1 text-xs font-medium text-red-600">
                      {errors.password.message}
                    </p>
                  ) : null}
                </label>
              )}
            />
          ) : null}

          <div className="grid grid-cols-2 gap-2">
            {(["totp", "recovery"] as const).map((method) => (
              <button
                className={[
                  "rounded-lg border px-3 py-2 text-sm font-semibold",
                  selectedMethod === method
                    ? "border-blue-600 bg-blue-50 text-blue-700"
                    : "border-slate-200 bg-white text-slate-700",
                ].join(" ")}
                type="button"
                key={method}
                onClick={() => {
                  setValue("secondFactorMethod", method);
                  setValue("secondFactorCode", "");
                }}
              >
                {method === "totp" ? "Authenticator code" : "Recovery code"}
              </button>
            ))}
          </div>

          <Controller
            control={control}
            name="secondFactorCode"
            render={({ field }) => (
              <label className="block text-sm font-semibold text-slate-700">
                {selectedMethod === "totp"
                  ? "Authenticator code"
                  : "Unused recovery code"}
                <input
                  className={[
                    "mt-2 h-10 w-full rounded-lg bg-white px-3 text-sm font-normal outline-none",
                    errors.secondFactorCode
                      ? "border border-red-300 focus:border-red-500"
                      : "border border-slate-200 focus:border-blue-500",
                  ].join(" ")}
                  value={field.value}
                  type="text"
                  autoComplete={selectedMethod === "totp" ? "one-time-code" : "off"}
                  placeholder={selectedMethod === "totp" ? "123456" : "ABCD-1234-EFGH"}
                  onChange={(event) => field.onChange(event.target.value)}
                />
                {errors.secondFactorCode ? (
                  <p className="mt-1 text-xs font-medium text-red-600">
                    {errors.secondFactorCode.message}
                  </p>
                ) : null}
              </label>
            )}
          />
        </div>

        <div className="mt-5 flex flex-col gap-2 sm:flex-row sm:justify-end">
          <button className="secondary-button" type="button" onClick={onClose}>
            Cancel
          </button>
          <button
            className="primary-button"
            type="button"
            disabled={isSubmitting}
            onClick={handleSubmit((values) => onGenerate(values, isOAuthProvider))}
          >
            {isOAuthProvider
              ? `Verify with ${provider === "github" ? "GitHub" : "Google"}`
              : "Generate new codes"}
          </button>
        </div>
      </div>
    </div>
  );
};

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
