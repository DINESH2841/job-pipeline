import PageShell from "../components/common/PageShell";

export default function RawDataPage({ rows }) {
  return (
    <PageShell title="RawData" description="Read-only scraped dataset for debugging">
      <div className="overflow-x-auto">
        <table className="min-w-full text-sm">
          <thead>
            <tr className="border-b border-slate-200 text-left text-slate-500">
              <th className="pb-2 pr-3 font-medium">Timestamp</th>
              <th className="pb-2 pr-3 font-medium">Run Tag</th>
              <th className="pb-2 pr-3 font-medium">Title</th>
              <th className="pb-2 pr-3 font-medium">Company</th>
              <th className="pb-2 pr-3 font-medium">Location</th>
              <th className="pb-2 pr-3 font-medium">Description</th>
              <th className="pb-2 pr-3 font-medium">Apply Link</th>
              <th className="pb-2 pr-3 font-medium">Source</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((row) => (
              <tr key={row.rowIndex} className="border-b border-slate-100 align-top">
                <td className="py-2 pr-3 text-slate-600">{row.timestamp || "-"}</td>
                <td className="py-2 pr-3 text-slate-700">{row.run_tag || "-"}</td>
                <td className="py-2 pr-3 text-slate-900">{row.title || "-"}</td>
                <td className="py-2 pr-3 text-slate-700">{row.company || "-"}</td>
                <td className="py-2 pr-3 text-slate-700">{row.location || "-"}</td>
                <td className="py-2 pr-3 text-slate-600 max-w-xl">{row.description || "-"}</td>
                <td className="py-2 pr-3">
                  <a href={row.apply_link || "#"} target="_blank" rel="noreferrer" className="text-sky-700 underline break-all">
                    {row.apply_link || "-"}
                  </a>
                </td>
                <td className="py-2 pr-3 text-slate-700">{row.source || "-"}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </PageShell>
  );
}
