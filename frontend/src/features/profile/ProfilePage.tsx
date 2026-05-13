import { InfoBlock } from "../../components/ui/InfoBlock";
import { Page } from "../../components/ui/Page";
import { PageHeader } from "../../components/ui/PageHeader";
import { Panel } from "../../components/ui/Panel";
import type { DemoUser } from "../../types/iam";

export const ProfilePage = ({ user }: { user: DemoUser | null }) => (
  <Page>
    <PageHeader
      eyebrow="Profile"
      title="Account information"
      description="Core identity attributes and account details used across your workspace."
    />
    <Panel title="User record">
      <div className="grid gap-4 md:grid-cols-2">
        <InfoBlock label="Name" value={user?.name ?? "AegisID User"} />
        <InfoBlock label="Email" value={user?.email ?? "user@secureiam.test"} />
        <InfoBlock label="Role" value={user?.role ?? "USER"} />
        <InfoBlock label="Last login" value={user?.lastLogin ?? "Today"} />
      </div>
    </Panel>
  </Page>
);
