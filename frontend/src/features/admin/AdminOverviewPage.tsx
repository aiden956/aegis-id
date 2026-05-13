import { Activity, ShieldAlert, Smartphone, Users } from "lucide-react";
import { MetricCard } from "../../components/ui/MetricCard";
import { Page } from "../../components/ui/Page";
import { PageHeader } from "../../components/ui/PageHeader";
import { Panel } from "../../components/ui/Panel";
import { SessionRow } from "../../components/ui/SessionRow";
import type { AuditLog, User } from "../../types/iam";
import { AuditTable } from "./AuditTable";

type AdminOverviewPageProps = {
  users: User[];
  logs: AuditLog[];
};

export const AdminOverviewPage = ({ users, logs }: AdminOverviewPageProps) => (
  <Page>
    <PageHeader
      eyebrow="Admin"
      title="Access operations overview"
      description="Monitor account inventory, privileged access, MFA adoption, and recent security activity."
    />
    <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
      <MetricCard
        icon={<Users />}
        label="Total users"
        value={String(users.length)}
        tone="blue"
      />
      <MetricCard
        icon={<ShieldAlert />}
        label="Admins"
        value={String(users.filter((user) => user.role === "ADMIN").length)}
        tone="yellow"
      />
      <MetricCard
        icon={<Smartphone />}
        label="2FA enabled"
        value={`${users.filter((user) => user.isTwoFactorEnabled).length}/${users.length}`}
        tone="green"
      />
      <MetricCard
        icon={<Activity />}
        label="Audit events"
        value={String(logs.length)}
        tone="slate"
      />
    </div>
    <div className="grid gap-5 xl:grid-cols-[0.9fr_1.1fr]">
      <Panel title="Access policy coverage">
        <div className="space-y-3">
          <SessionRow label="USER" value="Profile and own security settings" />
          <SessionRow label="ADMIN" value="Users, roles, audit logs" />
          <SessionRow
            label="Privilege model"
            value="Route and action access controlled by role"
          />
        </div>
      </Panel>
      <Panel title="Recent audit activity">
        <AuditTable logs={logs.slice(0, 4)} />
      </Panel>
    </div>
  </Page>
);
