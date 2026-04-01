import { useMemo, useState } from "react";
import PageShell from "../components/common/PageShell";

export default function JobsPage({ jobs, onMarkApplied, writing }) {
  const [query, setQuery] = useState("");
  const [location, setLocation] = useState("All");
  const [group, setGroup] = useState("All");
  const [minScore, setMinScore] = useState(0);

  const locations = useMemo(() => ["All", ...new Set(jobs.map((j) => j.location).filter(Boolean))], [jobs]);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    return jobs.filter((job) => {
      const matchesQuery =
        !q ||
        job.title.toLowerCase().includes(q) ||
        job.company.toLowerCase().includes(q);
      const matchesLocation = location === "All" || job.location === location;
      const matchesGroup = group === "All" || String(job.group).toUpperCase() === group;
      const matchesScore = Number(job.score || 0) >= minScore;
      return matchesQuery && matchesLocation && matchesGroup && matchesScore;
    });
  }, [jobs, query, location, group, minScore]);

  return (
    <PageShell
      title="Jobs"
      description="Filtered jobs from Jobs sheet"
      right={<p className="text-sm text-slate-500">{filtered.length} result(s)</p>}
    >
      <div className="mb-4 grid gap-3 lg:grid-cols-5">
        <input
          className="rounded-lg border border-slate-300 px-3 py-2 text-sm"
          placeholder="Search title/company"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
        />

        <select className="rounded-lg border border-slate-300 px-3 py-2 text-sm" value={location} onChange={(e) => setLocation(e.target.value)}>
          {locations.map((loc) => (
            <option key={loc} value={loc}>{loc}</option>
          ))}
        </select>

        <select className="rounded-lg border border-slate-300 px-3 py-2 text-sm" value={group} onChange={(e) => setGroup(e.target.value)}>
          <option value="All">All Groups</option>
          <option value="HIGH">HIGH</option>
          <option value="GOOD">GOOD</option>
          <option value="LOW">LOW</option>
        </select>

        <div className="rounded-lg border border-slate-300 px-3 py-2 text-sm">
          <label className="mb-1 block text-xs text-slate-500">Min Score: {minScore}</label>
          <input type="range" min="0" max="100" value={minScore} onChange={(e) => setMinScore(Number(e.target.value))} className="w-full" />
        </div>
      </div>

      <div className="overflow-x-auto">
        <table className="min-w-full text-sm">
          <thead>
            <tr className="border-b border-slate-200 text-left text-slate-500">
              <th className="pb-2 pr-3 font-medium">Title</th>
              <th className="pb-2 pr-3 font-medium">Company</th>
              <th className="pb-2 pr-3 font-medium">Location</th>
              <th className="pb-2 pr-3 font-medium">Score</th>
              <th className="pb-2 pr-3 font-medium">Group</th>
              <th className="pb-2 pr-3 font-medium">Actions</th>
            </tr>
          </thead>
          <tbody>
            {filtered.map((job) => (
              <tr key={`${job.rowIndex}-${job.apply_link}`} className="border-b border-slate-100 align-top">
                <td className="py-2 pr-3">
                  <p className="font-medium text-slate-900">{job.title}</p>
                  <p className="text-xs text-slate-500">{job.source}</p>
                </td>
                <td className="py-2 pr-3 text-slate-700">{job.company}</td>
                <td className="py-2 pr-3 text-slate-700">{job.location}</td>
                <td className="py-2 pr-3 text-slate-700">{job.score}</td>
                <td className="py-2 pr-3 text-slate-700">{job.group}</td>
                <td className="py-2 pr-3">
                  <div className="flex gap-2">
                    <a
                      href={job.apply_link || "#"}
                      target="_blank"
                      rel="noreferrer"
                      className="rounded-md bg-slate-800 px-3 py-1 text-xs font-semibold text-white"
                    >
                      Open Job
                    </a>
                    <button
                      type="button"
                      disabled={writing}
                      onClick={() => onMarkApplied(job)}
                      className="rounded-md bg-emerald-600 px-3 py-1 text-xs font-semibold text-white disabled:opacity-60"
                    >
                      Mark as Applied
                    </button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </PageShell>
  );
}
