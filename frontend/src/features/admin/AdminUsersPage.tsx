import { Search } from "lucide-react";
import { Page } from "../../components/ui/Page";
import { PageHeader } from "../../components/ui/PageHeader";
import { Panel } from "../../components/ui/Panel";
import { StatusPill } from "../../components/ui/StatusPill";
import type { Role, User } from "../../types/iam";

type AdminUsersPageProps = {
  users: User[];
  onRoleChange: (userId: string, role: Role) => Promise<void>;
};

export const AdminUsersPage = ({ users, onRoleChange }: AdminUsersPageProps) => (
  <Page>
    <PageHeader
      eyebrow="Admin"
      title="User management"
      description="Review local accounts, login providers, 2FA status, and role assignments."
    />
    <Panel
      title="Users"
      action={
        <div className="relative">
          <Search
            className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400"
            size={16}
          />
          <input
            className="h-10 rounded-lg border border-slate-200 bg-white pl-9 pr-3 text-sm outline-none focus:border-blue-500"
            placeholder="Search users"
          />
        </div>
      }
    >
      <div className="overflow-x-auto">
        <table className="data-table">
          <thead>
            <tr>
              <th>User</th>
              <th>Providers</th>
              <th>2FA</th>
              <th>Role</th>
              <th>Created</th>
            </tr>
          </thead>
          <tbody>
            {users.map((user) => (
              <tr key={user.id}>
                <td>
                  <p className="font-semibold text-slate-950">{user.name}</p>
                  <p className="text-sm text-slate-500">{user.email}</p>
                </td>
                <td>{(user.provider ?? "local").toUpperCase()}</td>
                <td>
                  <StatusPill status={user.isTwoFactorEnabled ? "success" : "warning"}>
                    {user.isTwoFactorEnabled ? "Enabled" : "Disabled"}
                  </StatusPill>
                </td>
                <td>
                  <select
                    className="rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm font-semibold"
                    value={user.role}
                    onChange={async (event) => {
                      await onRoleChange(user.id, event.target.value as Role);
                    }}
                  >
                    <option value="USER">USER</option>
                    <option value="ADMIN">ADMIN</option>
                  </select>
                </td>
                <td>
                  {user.createdAt
                    ? new Date(user.createdAt).toLocaleDateString()
                    : "-"}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </Panel>
  </Page>
);
