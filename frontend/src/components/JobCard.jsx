export default function JobCard({ job }) {
  const groupStyles = {
    High: "bg-emerald-100 text-emerald-800",
    Good: "bg-blue-100 text-blue-800",
    Low: "bg-amber-100 text-amber-800"
  };

  return (
    <article className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm hover:shadow-md transition-shadow">
      <div className="flex items-start justify-between gap-3">
        <div>
          <h3 className="text-lg font-semibold text-slate-900">{job.title}</h3>
          <p className="text-sm text-slate-600 mt-1">
            {job.company} • {job.location}
          </p>
        </div>
        <span
          className={`rounded-full px-3 py-1 text-xs font-semibold ${
            groupStyles[job.group] || groupStyles.Low
          }`}
        >
          {job.group}
        </span>
      </div>

      <div className="mt-4 flex items-center justify-between">
        <p className="text-sm font-medium text-slate-700">Score: {job.score}</p>
        <a
          href={job.link}
          target="_blank"
          rel="noreferrer"
          className="inline-flex items-center rounded-lg bg-slate-900 px-4 py-2 text-sm font-semibold text-white hover:bg-slate-700"
        >
          Apply
        </a>
      </div>
    </article>
  );
}
