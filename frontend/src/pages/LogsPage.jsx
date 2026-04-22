import PageShell from "../components/common/PageShell";
import StatusPill from "../components/common/StatusPill";

export default function LogsPage({ logs }) {
  return (
    <PageShell
      title="Logs"
      description="Pipeline observability events"
      right={<p className="text-sm text-slate-500">{logs.length} event(s)</p>}
    >
      <div className="overflow-x-auto">
        <table className="min-w-full text-sm">
          <thead>
            <tr className="border-b border-slate-200/80 text-left text-slate-500">
              <th className="pb-3 pr-3 font-medium">Timestamp</th>
              <th className="pb-3 pr-3 font-medium">Run ID</th>
              <th className="pb-3 pr-3 font-medium">Level</th>
              <th className="pb-3 pr-3 font-medium">Step</th>
              <th className="pb-3 pr-3 font-medium">Message</th>
              <th className="pb-3 pr-3 font-medium">Data</th>
            </tr>
          </thead>
          <tbody>
            {logs.length ? (
              logs.map((log) => (
                <tr key={log.rowIndex} className="border-b border-slate-100/80 align-top hover:bg-slate-50/80">
                  <td className="py-3 pr-3 text-slate-600">{log.timestamp || "-"}</td>
                  <td className="py-3 pr-3 text-slate-700">{log.run_id || "-"}</td>
                  <td className="py-3 pr-3"><StatusPill value={log.level || "info"} /></td>
                  <td className="py-3 pr-3 text-slate-700">{log.step || "-"}</td>
                  <td className="py-3 pr-3 text-slate-700">{log.message || "-"}</td>
                  <td className="py-3 pr-3 text-xs leading-6 text-slate-500">{log.data || "{}"}</td>
                </tr>
              ))
            ) : (
              <tr>
                <td className="py-8 text-sm text-slate-500" colSpan={6}>
                  No logs yet. Once a pipeline run starts, the observability trail will appear here.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </PageShell>
  );
}
