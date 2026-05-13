import { BadgeCheck, CheckCircle2, Clock3, KeyRound, ShieldCheck, Smartphone } from "lucide-react";
import { permissions } from "../../data/permissions";
import { MetricCard } from "../../components/ui/MetricCard";
import { Page } from "../../components/ui/Page";
import { PageHeader } from "../../components/ui/PageHeader";
import { Panel } from "../../components/ui/Panel";
import type { User } from "../../types/iam";

export const DashboardPage = ({ user }: { user: User | null }) => (
  <Page>
    <PageHeader
      eyebrow="Dashboard"
      title="Security posture overview"
      description="Track identity risk, access coverage, and active protection controls across your organization."
    />
    <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
      <MetricCard
        icon={<ShieldCheck />}
        label="Session health"
        value="Protected"
        tone="blue"
      />
      <MetricCard
        icon={<Smartphone />}
        label="2FA"
        value={user?.isTwoFactorEnabled ? "Enabled" : "Disabled"}
        tone={user?.isTwoFactorEnabled ? "green" : "yellow"}
      />
      <MetricCard
        icon={<KeyRound />}
        label="Role"
        value={user?.role ?? "USER"}
        tone="slate"
      />
      <MetricCard
        icon={<Clock3 />}
        label="Token rotation"
        value="Current"
        tone="green"
      />
    </div>

    <div className="grid gap-5 xl:grid-cols-[1.2fr_0.8fr]">
      <Panel title="Security signals">
        <div className="grid gap-3 sm:grid-cols-2">
          {[
            ["Authentication", "Password and provider-based sign-in"],
            ["Identity providers", "Google and GitHub connections available"],
            ["Multi-factor protection", "Authenticator code verification flow"],
            ["Access boundaries", "Role-based route and action controls"],
          ].map(([label, detail]) => (
            <div className="rounded-lg border border-slate-200 p-4" key={label}>
              <CheckCircle2 className="text-green-600" size={20} />
              <p className="mt-3 font-semibold">{label}</p>
              <p className="mt-1 text-sm text-slate-600">{detail}</p>
            </div>
          ))}
        </div>
      </Panel>
      <Panel title="Current access">
        <div className="space-y-3">
          {permissions[user?.role ?? "USER"].map((permission) => (
            <div
              className="flex items-center justify-between rounded-lg bg-slate-50 px-3 py-2"
              key={permission}
            >
              <span className="text-sm font-medium text-slate-700">
                {permission}
              </span>
              <BadgeCheck size={16} className="text-green-600" />
            </div>
          ))}
        </div>
      </Panel>
    </div>
  </Page>
);
