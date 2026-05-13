import { Fingerprint, KeyRound, QrCode, Smartphone } from "lucide-react";
import { useState } from "react";
import { Page } from "../../components/ui/Page";
import { PageHeader } from "../../components/ui/PageHeader";
import { Panel } from "../../components/ui/Panel";
import { SessionRow } from "../../components/ui/SessionRow";
import { StatusPill } from "../../components/ui/StatusPill";
import type { User } from "../../types/iam";

type SecurityPageProps = {
  user: User | null;
  onStartSetup: () => Promise<{ qrCodeDataUrl: string; manualEntryKey: string }>;
  onEnable: (code: string) => Promise<void>;
  onDisable: (code: string) => Promise<void>;
};

export const SecurityPage = ({
  user,
  onStartSetup,
  onEnable,
  onDisable,
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
      setError(taskError instanceof Error ? taskError.message : "Request failed");
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
                Manual key: <span className="font-mono">{setupData.manualEntryKey}</span>
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
            <button className="secondary-button" type="button" onClick={handleSetup}>
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
          {error ? <p className="mt-3 text-sm font-medium text-red-700">{error}</p> : null}
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
                      {connected ? "Connected to this account" : "Available to connect"}
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
          <div className="flex items-start gap-4 rounded-lg border border-blue-200 bg-blue-50 p-4 text-blue-950">
            <Fingerprint size={42} />
            <div>
              <p className="font-semibold">Passkey enrollment</p>
              <p className="mt-1 text-sm leading-6 text-blue-800">
                Register trusted devices for phishing-resistant sign-in and step-up
                verification.
              </p>
            </div>
          </div>
        </Panel>

        <Panel title="Session policy">
          <div className="space-y-3">
            <SessionRow label="Access token" value="Short-lived token" />
            <SessionRow label="Refresh token" value="Rotating token strategy" />
            <SessionRow label="Browser storage" value="HTTP-only secure cookies" />
            <SessionRow label="Logout behavior" value="Revoke refresh token" />
          </div>
        </Panel>
      </div>
    </Page>
  );
};
