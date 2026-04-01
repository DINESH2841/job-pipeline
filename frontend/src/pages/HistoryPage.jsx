import { useState } from "react";
import PageShell from "../components/common/PageShell";
import { STATUS_OPTIONS } from "../services/sheetsApi";

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
    <PageShell title="History" description="Track status and notes for applied jobs">
      <div className="overflow-x-auto">
        <table className="min-w-full text-sm">
          <thead>
            <tr className="border-b border-slate-200 text-left text-slate-500">
              <th className="pb-2 pr-3 font-medium">Apply Link</th>
              <th className="pb-2 pr-3 font-medium">Status</th>
              <th className="pb-2 pr-3 font-medium">Notes</th>
              <th className="pb-2 pr-3 font-medium">Applied Date</th>
              <th className="pb-2 pr-3 font-medium">Last Updated</th>
              <th className="pb-2 pr-3 font-medium">Source</th>
              <th className="pb-2 pr-3 font-medium">Action</th>
            </tr>
          </thead>
          <tbody>
            {merged.map((entry) => (
              <tr key={entry.rowIndex} className="border-b border-slate-100 align-top">
                <td className="py-2 pr-3">
                  <a href={entry.apply_link || "#"} target="_blank" rel="noreferrer" className="text-sky-700 underline break-all">
                    {entry.apply_link}
                  </a>
                </td>
                <td className="py-2 pr-3">
                  <select
                    className="rounded-md border border-slate-300 px-2 py-1"
                    value={entry.status || "New"}
                    onChange={(e) => setDraft(entry.rowIndex, { status: e.target.value })}
                  >
                    {STATUS_OPTIONS.map((status) => (
                      <option key={status} value={status}>{status}</option>
                    ))}
                  </select>
                </td>
                <td className="py-2 pr-3">
                  <input
                    className="w-64 rounded-md border border-slate-300 px-2 py-1"
                    value={entry.notes || ""}
                    onChange={(e) => setDraft(entry.rowIndex, { notes: e.target.value })}
                  />
                </td>
                <td className="py-2 pr-3 text-slate-600">{entry.applied_date || "-"}</td>
                <td className="py-2 pr-3 text-slate-600">{entry.last_updated || "-"}</td>
                <td className="py-2 pr-3 text-slate-600">{entry.source || "-"}</td>
                <td className="py-2 pr-3">
                  <button
                    type="button"
                    onClick={() => onSave(entry)}
                    disabled={savingRow === entry.rowIndex}
                    className="rounded-md bg-slate-900 px-3 py-1 text-xs font-semibold text-white disabled:opacity-60"
                  >
                    Update
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </PageShell>
  );
}
