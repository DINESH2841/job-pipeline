import { useMemo, useState } from "react";
import PageShell from "../components/common/PageShell";
import StatusPill from "../components/common/StatusPill";

export default function JobsPage({ jobs, onMarkApplied, writing }) {
  const [query, setQuery] = useState("");
  const [location, setLocation] = useState("All");
  const [group, setGroup] = useState("All");
  const [category, setCategory] = useState("All");
  const [minScore, setMinScore] = useState(0);

  const locations = useMemo(() => ["All", ...new Set(jobs.map((j) => j.location).filter(Boolean))], [jobs]);
  const categories = useMemo(() => ["All", ...new Set(jobs.map((j) => j.category).filter(Boolean))], [jobs]);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    return jobs.filter((job) => {
      const matchesQuery =
        !q ||
        job.title.toLowerCase().includes(q) ||
        job.company.toLowerCase().includes(q);
      const matchesLocation = location === "All" || job.location === location;
      const matchesGroup = group === "All" || String(job.group).toUpperCase() === group;
      const matchesCategory = category === "All" || String(job.category || "").toLowerCase() === category.toLowerCase();
      const matchesScore = Number(job.score || 0) >= minScore;
      return matchesQuery && matchesLocation && matchesGroup && matchesCategory && matchesScore;
    });
  }, [jobs, query, location, group, category, minScore]);

  return (
    <PageShell
      title="Jobs"
      description="Filtered jobs from the backend job tracker"
      right={(
        <div className="flex items-center gap-3 text-sm text-slate-500">
          <p>{filtered.length} result(s)</p>
          <span className="rounded-full bg-slate-100 px-3 py-1 text-xs font-semibold text-slate-700">of {jobs.length}</span>
        </div>
      )}
    >
      <div className="mb-5 rounded-3xl border border-slate-200/80 bg-slate-50/80 p-4 shadow-sm">
        <div className="grid gap-3 lg:grid-cols-6">
          <input
            className="rounded-2xl border border-slate-300 bg-white px-4 py-3 text-sm shadow-sm outline-none transition focus:border-sky-400 focus:ring-4 focus:ring-sky-100"
          placeholder="Search title/company"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
        />

          <select className="rounded-2xl border border-slate-300 bg-white px-4 py-3 text-sm shadow-sm outline-none transition focus:border-sky-400 focus:ring-4 focus:ring-sky-100" value={location} onChange={(e) => setLocation(e.target.value)}>
            {locations.map((loc) => (
              <option key={loc} value={loc}>{loc}</option>
            ))}
          </select>

          <select className="rounded-2xl border border-slate-300 bg-white px-4 py-3 text-sm shadow-sm outline-none transition focus:border-sky-400 focus:ring-4 focus:ring-sky-100" value={group} onChange={(e) => setGroup(e.target.value)}>
            <option value="All">All Groups</option>
            <option value="HIGH">HIGH</option>
            <option value="GOOD">GOOD</option>
            <option value="LOW">LOW</option>
          </select>

          <select className="rounded-2xl border border-slate-300 bg-white px-4 py-3 text-sm shadow-sm outline-none transition focus:border-sky-400 focus:ring-4 focus:ring-sky-100" value={category} onChange={(e) => setCategory(e.target.value)}>
            {categories.map((item) => (
              <option key={item} value={item}>{item}</option>
            ))}
          </select>

          <div className="rounded-2xl border border-slate-300 bg-white px-4 py-3 text-sm shadow-sm lg:col-span-2">
            <div className="mb-2 flex items-center justify-between gap-3">
              <label className="block text-xs font-semibold uppercase tracking-[0.18em] text-slate-500">Min Score</label>
              <span className="rounded-full bg-slate-100 px-2.5 py-1 text-xs font-semibold text-slate-700">{minScore}</span>
            </div>
            <input type="range" min="0" max="100" value={minScore} onChange={(e) => setMinScore(Number(e.target.value))} className="w-full accent-sky-500" />
          </div>
        </div>
      </div>

      <div className="overflow-x-auto">
        <table className="min-w-full overflow-hidden rounded-3xl text-sm">
          <thead>
            <tr className="border-b border-slate-200/80 text-left text-slate-500">
              <th className="pb-3 pr-3 font-medium">Title</th>
              <th className="pb-3 pr-3 font-medium">Company</th>
              <th className="pb-3 pr-3 font-medium">Location</th>
              <th className="pb-3 pr-3 font-medium">Category</th>
              <th className="pb-3 pr-3 font-medium">Score</th>
              <th className="pb-3 pr-3 font-medium">Group</th>
              <th className="pb-3 pr-3 font-medium">Actions</th>
            </tr>
          </thead>
          <tbody>
            {filtered.length ? (
              filtered.map((job) => (
                <tr key={`${job.rowIndex}-${job.apply_link}`} className="border-b border-slate-100/80 align-top hover:bg-slate-50/80">
                  <td className="py-3 pr-3">
                    <p className="font-semibold text-slate-950">{job.title}</p>
                    <p className="mt-1 text-xs text-slate-500">{job.source}</p>
                  </td>
                  <td className="py-3 pr-3 text-slate-700">{job.company}</td>
                  <td className="py-3 pr-3 text-slate-700">{job.location}</td>
                  <td className="py-3 pr-3 text-slate-700">
                    <span className="inline-flex rounded-full bg-sky-50 px-3 py-1 font-semibold capitalize text-sky-700">
                      {job.category || "-"}
                    </span>
                  </td>
                  <td className="py-3 pr-3 text-slate-700">
                    <span className="inline-flex rounded-full bg-slate-100 px-3 py-1 font-semibold text-slate-800">{job.score}</span>
                  </td>
                  <td className="py-3 pr-3">
                    <StatusPill value={job.group} />
                  </td>
                  <td className="py-3 pr-3">
                    <div className="flex flex-wrap gap-2">
                      <a
                        href={job.apply_link || "#"}
                        target="_blank"
                        rel="noreferrer"
                        className="rounded-xl bg-slate-950 px-4 py-2 text-xs font-semibold text-white shadow-sm transition hover:bg-slate-800"
                      >
                        Open Job
                      </a>
                      <button
                        type="button"
                        disabled={writing}
                        onClick={() => onMarkApplied(job)}
                        className="rounded-xl bg-emerald-600 px-4 py-2 text-xs font-semibold text-white shadow-sm transition hover:bg-emerald-700 disabled:cursor-not-allowed disabled:opacity-60"
                      >
                        Mark as Applied
                      </button>
                    </div>
                  </td>
                </tr>
              ))
            ) : (
              <tr>
                <td className="py-8 text-sm text-slate-500" colSpan={7}>
                  No jobs match the current filters. Try lowering the score threshold or widening the search.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </PageShell>
  );
}
