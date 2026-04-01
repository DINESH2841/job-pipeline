import { useMemo } from "react";
import PageShell from "../components/common/PageShell";
import StatusPill from "../components/common/StatusPill";

function StatCard({ label, value }) {
  return (
    <div className="rounded-lg border border-slate-200 bg-slate-50 p-4">
      <p className="text-sm text-slate-500">{label}</p>
      <p className="mt-1 text-2xl font-bold text-slate-900">{value}</p>
    </div>
  );
}

export default function DashboardPage({ jobs, history, logs, onRunNow, runningPipeline }) {
  const today = new Date().toISOString().slice(0, 10);

  const stats = useMemo(() => {
    const newToday = jobs.filter((j) => (j.timestamp || "").slice(0, 10) === today).length;
    const applied = history.filter((h) => h.status === "Applied").length;
    const interviews = history.filter((h) => h.status === "Interview").length;
    return {
      totalJobs: jobs.length,
      newToday,
      applied,
      interviews
    };
  }, [jobs, history, today]);

  const recentLogs = logs.slice().reverse().slice(0, 8);

  return (
    <div className="space-y-6">
      <PageShell
        title="Dashboard"
        description="Live metrics from Jobs, History, and Logs sheets"
        right={(
          <button
            type="button"
            onClick={onRunNow}
            disabled={runningPipeline}
            className="rounded-md bg-indigo-600 px-3 py-2 text-sm font-semibold text-white disabled:opacity-60"
          >
            {runningPipeline ? "Running..." : "Run now"}
          </button>
        )}
      >
        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
          <StatCard label="Total Jobs" value={stats.totalJobs} />
          <StatCard label="New Jobs Today" value={stats.newToday} />
          <StatCard label="Applied Jobs" value={stats.applied} />
          <StatCard label="Interviews" value={stats.interviews} />
        </div>
      </PageShell>

      <PageShell title="Recent Activity" description="Latest pipeline events from Logs">
        <div className="overflow-x-auto">
          <table className="min-w-full text-sm">
            <thead>
              <tr className="border-b border-slate-200 text-left text-slate-500">
                <th className="pb-2 pr-3 font-medium">Timestamp</th>
                <th className="pb-2 pr-3 font-medium">Run ID</th>
                <th className="pb-2 pr-3 font-medium">Level</th>
                <th className="pb-2 pr-3 font-medium">Step</th>
                <th className="pb-2 pr-3 font-medium">Message</th>
              </tr>
            </thead>
            <tbody>
              {recentLogs.map((log) => (
                <tr key={`${log.rowIndex}-${log.timestamp}`} className="border-b border-slate-100">
                  <td className="py-2 pr-3 text-slate-600">{log.timestamp || "-"}</td>
                  <td className="py-2 pr-3 text-slate-700">{log.run_id || "-"}</td>
                  <td className="py-2 pr-3"><StatusPill value={log.level} /></td>
                  <td className="py-2 pr-3 text-slate-700">{log.step || "-"}</td>
                  <td className="py-2 pr-3 text-slate-700">{log.message || "-"}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </PageShell>
    </div>
  );
}
