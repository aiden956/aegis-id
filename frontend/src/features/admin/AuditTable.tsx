import { StatusPill } from "../../components/ui/StatusPill";
import type { AuditLog } from "../../types/iam";

export const AuditTable = ({ logs }: { logs: AuditLog[] }) => (
  <div className="overflow-x-auto">
    <table className="data-table">
      <thead>
        <tr>
          <th>Event</th>
          <th>Actor</th>
          <th>Result</th>
          <th>Time</th>
          <th>IP</th>
        </tr>
      </thead>
      <tbody>
        {logs.map((log) => (
          <tr key={log.id}>
            <td className="font-semibold text-slate-950">{log.event}</td>
            <td>{log.actor}</td>
            <td>
              <StatusPill status={log.result}>{log.result}</StatusPill>
            </td>
            <td>{log.time}</td>
            <td>{log.ip}</td>
          </tr>
        ))}
      </tbody>
    </table>
  </div>
);
