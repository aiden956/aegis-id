import { Page } from "../../components/ui/Page";
import { PageHeader } from "../../components/ui/PageHeader";
import { Panel } from "../../components/ui/Panel";
import type { AuditLog } from "../../types/iam";
import { AuditTable } from "./AuditTable";

export const AuditLogsPage = ({ logs }: { logs: AuditLog[] }) => (
  <Page>
    <PageHeader
      eyebrow="Admin"
      title="Security audit logs"
      description="Track authentication events, failed attempts, token activity, and privileged account changes."
    />
    <Panel title="Events">
      <AuditTable logs={logs} />
    </Panel>
  </Page>
);
