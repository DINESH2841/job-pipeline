import { useMemo } from "react";
import PageShell from "../components/common/PageShell";
import StatusPill from "../components/common/StatusPill";

function StatCard({ label, value }) {
  return (
    <div className="rounded-3xl border border-slate-200/80 bg-white/90 p-5 shadow-sm shadow-slate-200/60">
      <p className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-500">{label}</p>
      <p className="mt-3 text-3xl font-black tracking-tight text-slate-950">{value}</p>
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
            className="rounded-xl bg-gradient-to-r from-indigo-600 to-sky-600 px-4 py-2.5 text-sm font-semibold text-white shadow-lg shadow-indigo-500/25 transition hover:translate-y-[-1px] hover:shadow-xl disabled:cursor-not-allowed disabled:opacity-60"
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

        <div className="mt-5 grid gap-4 lg:grid-cols-3">
          <div className="rounded-3xl border border-slate-200/80 bg-slate-50/90 p-5">
            <p className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-500">Pipeline health</p>
            <p className="mt-3 text-lg font-bold text-slate-950">Automated scheduling</p>
            <p className="mt-2 text-sm leading-6 text-slate-600">
              The backend now runs three focused pipelines for software, embedded, and hardware roles.
            </p>
          </div>
          <div className="rounded-3xl border border-slate-200/80 bg-slate-50/90 p-5">
            <p className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-500">Latest activity</p>
            <p className="mt-3 text-lg font-bold text-slate-950">{recentLogs[0]?.message || "No recent activity"}</p>
            <p className="mt-2 text-sm leading-6 text-slate-600">{recentLogs[0]?.step || "Waiting for the next pipeline run."}</p>
          </div>
          <div className="rounded-3xl border border-slate-200/80 bg-slate-50/90 p-5">
            <p className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-500">Focus</p>
            <p className="mt-3 text-lg font-bold text-slate-950">Software + embedded + hardware roles</p>
            <p className="mt-2 text-sm leading-6 text-slate-600">
              Highlighting fresher-friendly software, embedded/IoT, and core ECE/VLSI jobs for Chennai, Bangalore, Hyderabad, and nearby states.
            </p>
          </div>
        </div>
      </PageShell>

      <PageShell title="Recent Activity" description="Latest pipeline events from Logs">
        <div className="overflow-x-auto">
          <table className="min-w-full text-sm">
            <thead>
              <tr className="border-b border-slate-200/80 text-left text-slate-500">
                <th className="pb-3 pr-3 font-medium">Timestamp</th>
                <th className="pb-3 pr-3 font-medium">Run ID</th>
                <th className="pb-3 pr-3 font-medium">Level</th>
                <th className="pb-3 pr-3 font-medium">Step</th>
                <th className="pb-3 pr-3 font-medium">Message</th>
              </tr>
            </thead>
            <tbody>
              {recentLogs.length ? (
                recentLogs.map((log) => (
                  <tr key={`${log.rowIndex}-${log.timestamp}`} className="border-b border-slate-100/80">
                    <td className="py-3 pr-3 text-slate-600">{log.timestamp || "-"}</td>
                    <td className="py-3 pr-3 text-slate-700">{log.run_id || "-"}</td>
                    <td className="py-3 pr-3"><StatusPill value={log.level} /></td>
                    <td className="py-3 pr-3 text-slate-700">{log.step || "-"}</td>
                    <td className="py-3 pr-3 text-slate-700">{log.message || "-"}</td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td className="py-6 text-sm text-slate-500" colSpan={5}>
                    No activity yet. Once the pipeline runs, recent events will appear here.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </PageShell>
    </div>
  );
}
