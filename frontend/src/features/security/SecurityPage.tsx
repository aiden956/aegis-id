import { Fingerprint, KeyRound, QrCode, Smartphone } from "lucide-react";
import { Page } from "../../components/ui/Page";
import { PageHeader } from "../../components/ui/PageHeader";
import { Panel } from "../../components/ui/Panel";
import { SessionRow } from "../../components/ui/SessionRow";
import { StatusPill } from "../../components/ui/StatusPill";
import type { User } from "../../types/iam";

export const SecurityPage = ({ user }: { user: User | null }) => (
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
        <div className="mt-4 grid gap-3 sm:grid-cols-2">
          <button className="secondary-button" type="button">
            <Smartphone size={18} />
            Setup 2FA
          </button>
          <button className="secondary-button" type="button">
            <KeyRound size={18} />
            Recovery codes
          </button>
        </div>
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
