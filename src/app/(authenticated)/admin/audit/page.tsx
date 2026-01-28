import { getAuditLogs, getAuditStats } from "@/app/actions/audit";
import { AuditTable } from "./audit-table";

export default async function AuditPage() {
  const [{ logs, total }, stats] = await Promise.all([
    getAuditLogs({ limit: 50 }),
    getAuditStats(),
  ]);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold">Audit Log</h1>
        <p className="text-gray-600">Track all system activities</p>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="bg-white p-4 rounded-lg border">
          <p className="text-sm text-gray-500">Total Events</p>
          <p className="text-2xl font-bold">{stats.totalLogs}</p>
        </div>
        <div className="bg-white p-4 rounded-lg border">
          <p className="text-sm text-gray-500">Logins (24h)</p>
          <p className="text-2xl font-bold text-green-600">{stats.recentLogins}</p>
        </div>
        <div className="bg-white p-4 rounded-lg border">
          <p className="text-sm text-gray-500">Failed Logins (24h)</p>
          <p className="text-2xl font-bold text-red-600">{stats.recentFailedLogins}</p>
        </div>
      </div>

      {/* Table */}
      <AuditTable initialLogs={logs} total={total} />
    </div>
  );
}
