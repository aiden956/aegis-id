import {
  Fingerprint,
  KeyRound,
  QrCode,
  Smartphone,
} from "lucide-react";
import { useState } from "react";
import { Page } from "../../components/ui/Page";
import { PageHeader } from "../../components/ui/PageHeader";
import { Panel } from "../../components/ui/Panel";
import { SessionRow } from "../../components/ui/SessionRow";
import { StatusPill } from "../../components/ui/StatusPill";
import type { User } from "../../types/iam";

type SecurityPageProps = {
  user: User | null;
  onStartSetup: () => Promise<{
    qrCodeDataUrl: string;
    manualEntryKey: string;
  }>;
  onEnable: (code: string) => Promise<void>;
  onDisable: (code: string) => Promise<void>;
  onRegisterPasskey: () => Promise<void>;
};

export const SecurityPage = ({
  user,
  onStartSetup,
  onEnable,
  onDisable,
  onRegisterPasskey,
}: SecurityPageProps) => {
  const [setupData, setSetupData] = useState<{
    qrCodeDataUrl: string;
    manualEntryKey: string;
  } | null>(null);
  const [code, setCode] = useState("");
  const [disableCode, setDisableCode] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

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
      await onEnable(code);
      setSetupData(null);
      setCode("");
      setMessage("Authenticator app enabled.");
    });
  };

  const handleDisable = async () => {
    await runWithStatus(async () => {
      await onDisable(disableCode);
      setDisableCode("");
      setMessage("Two-factor authentication disabled.");
    });
  };

  const handleRegisterPasskey = async () => {
    await runWithStatus(async () => {
      await onRegisterPasskey();
      setMessage("Passkey registered successfully.");
    });
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
            <button className="secondary-button" type="button">
              <KeyRound size={18} />
              Recovery codes
            </button>
          </div>
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
    </Page>
  );
};
