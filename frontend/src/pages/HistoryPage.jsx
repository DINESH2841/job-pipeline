import { useState } from "react";
import PageShell from "../components/common/PageShell";
import { STATUS_OPTIONS } from "../services/sheetsApi";

const statusStyles = {
  Applied: "border-emerald-200 bg-emerald-50 text-emerald-700",
  Interview: "border-sky-200 bg-sky-50 text-sky-700",
  Rejected: "border-red-200 bg-red-50 text-red-700",
  New: "border-slate-200 bg-slate-50 text-slate-700"
};

export default function HistoryPage({ history, onSave, savingRow }) {
  const [drafts, setDrafts] = useState({});

  const merged = history.map((item) => ({
    ...item,
    ...(drafts[item.rowIndex] || {})
  }));

  const setDraft = (rowIndex, patch) => {
    setDrafts((prev) => ({
      ...prev,
      [rowIndex]: {
        ...(prev[rowIndex] || {}),
        ...patch
      }
    }));
  };

  return (
    <PageShell
      title="History"
      description="Track status and notes for applied jobs"
      right={<p className="text-sm text-slate-500">{history.length} row(s)</p>}
    >
      <div className="overflow-x-auto">
        <table className="min-w-full text-sm">
          <thead>
            <tr className="border-b border-slate-200/80 text-left text-slate-500">
              <th className="pb-3 pr-3 font-medium">Apply Link</th>
              <th className="pb-3 pr-3 font-medium">Status</th>
              <th className="pb-3 pr-3 font-medium">Notes</th>
              <th className="pb-3 pr-3 font-medium">Applied Date</th>
              <th className="pb-3 pr-3 font-medium">Last Updated</th>
              <th className="pb-3 pr-3 font-medium">Source</th>
              <th className="pb-3 pr-3 font-medium">Action</th>
            </tr>
          </thead>
          <tbody>
            {merged.length ? (
              merged.map((entry) => (
                <tr key={entry.rowIndex} className="border-b border-slate-100/80 align-top hover:bg-slate-50/80">
                  <td className="py-3 pr-3">
                    <a href={entry.apply_link || "#"} target="_blank" rel="noreferrer" className="break-all font-medium text-sky-700 hover:text-sky-900">
                      {entry.apply_link}
                    </a>
                  </td>
                  <td className="py-3 pr-3">
                    <select
                      className="rounded-xl border border-slate-300 bg-white px-3 py-2 shadow-sm outline-none focus:border-sky-400 focus:ring-4 focus:ring-sky-100"
                      value={entry.status || "New"}
                      onChange={(e) => setDraft(entry.rowIndex, { status: e.target.value })}
                    >
                      {STATUS_OPTIONS.map((status) => (
                        <option key={status} value={status}>{status}</option>
                      ))}
                    </select>
                    <span className={`mt-2 inline-flex rounded-full border px-2.5 py-1 text-xs font-semibold ${statusStyles[entry.status || "New"] || statusStyles.New}`}>
                      {entry.status || "New"}
                    </span>
                  </td>
                  <td className="py-3 pr-3">
                    <input
                      className="w-72 rounded-xl border border-slate-300 bg-white px-3 py-2 shadow-sm outline-none focus:border-sky-400 focus:ring-4 focus:ring-sky-100"
                      value={entry.notes || ""}
                      onChange={(e) => setDraft(entry.rowIndex, { notes: e.target.value })}
                    />
                  </td>
                  <td className="py-3 pr-3 text-slate-600">{entry.applied_date || "-"}</td>
                  <td className="py-3 pr-3 text-slate-600">{entry.last_updated || "-"}</td>
                  <td className="py-3 pr-3 text-slate-600">{entry.source || "-"}</td>
                  <td className="py-3 pr-3">
                    <button
                      type="button"
                      onClick={() => onSave(entry)}
                      disabled={savingRow === entry.rowIndex}
                      className="rounded-xl bg-slate-950 px-4 py-2 text-xs font-semibold text-white shadow-sm transition hover:bg-slate-800 disabled:cursor-not-allowed disabled:opacity-60"
                    >
                      {savingRow === entry.rowIndex ? "Saving..." : "Update"}
                    </button>
                  </td>
                </tr>
              ))
            ) : (
              <tr>
                <td className="py-8 text-sm text-slate-500" colSpan={7}>
                  No history rows yet. Applied jobs will appear here with notes and status controls.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </PageShell>
  );
}
