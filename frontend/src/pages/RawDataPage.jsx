import PageShell from "../components/common/PageShell";

export default function RawDataPage({ rows }) {
  return (
    <PageShell
      title="Raw Data"
      description="Read-only scraped dataset for debugging"
      right={<p className="text-sm text-slate-500">{rows.length} row(s)</p>}
    >
      <div className="overflow-x-auto">
        <table className="min-w-full text-sm">
          <thead>
            <tr className="border-b border-slate-200/80 text-left text-slate-500">
              <th className="pb-3 pr-3 font-medium">Timestamp</th>
              <th className="pb-3 pr-3 font-medium">Run Tag</th>
              <th className="pb-3 pr-3 font-medium">Title</th>
              <th className="pb-3 pr-3 font-medium">Company</th>
              <th className="pb-3 pr-3 font-medium">Location</th>
              <th className="pb-3 pr-3 font-medium">Description</th>
              <th className="pb-3 pr-3 font-medium">Apply Link</th>
              <th className="pb-3 pr-3 font-medium">Source</th>
            </tr>
          </thead>
          <tbody>
            {rows.length ? (
              rows.map((row) => (
                <tr key={row.rowIndex} className="border-b border-slate-100/80 align-top hover:bg-slate-50/80">
                  <td className="py-3 pr-3 text-slate-600">{row.timestamp || "-"}</td>
                  <td className="py-3 pr-3 text-slate-700">{row.run_tag || "-"}</td>
                  <td className="py-3 pr-3 font-medium text-slate-950">{row.title || "-"}</td>
                  <td className="py-3 pr-3 text-slate-700">{row.company || "-"}</td>
                  <td className="py-3 pr-3 text-slate-700">{row.location || "-"}</td>
                  <td className="py-3 pr-3 max-w-xl text-slate-600">{row.description || "-"}</td>
                  <td className="py-3 pr-3">
                    <a href={row.apply_link || "#"} target="_blank" rel="noreferrer" className="break-all text-sky-700 hover:text-sky-900">
                      {row.apply_link || "-"}
                    </a>
                  </td>
                  <td className="py-3 pr-3 text-slate-700">{row.source || "-"}</td>
                </tr>
              ))
            ) : (
              <tr>
                <td className="py-8 text-sm text-slate-500" colSpan={8}>
                  No raw data yet. The next pipeline run will populate this debugging table.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </PageShell>
  );
}
