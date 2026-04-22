const items = [
  { key: "dashboard", label: "Dashboard" },
  { key: "jobs", label: "Jobs" },
  { key: "history", label: "History" },
  { key: "raw", label: "Raw Data" },
  { key: "logs", label: "Logs" }
];

export default function Sidebar({ active, onChange }) {
  return (
    <aside className="w-full border-b border-slate-200/80 bg-slate-950 px-4 py-4 text-white shadow-2xl lg:sticky lg:top-0 lg:h-screen lg:w-76 lg:border-b-0 lg:border-r lg:border-slate-800 lg:px-5">
      <div className="mb-5 rounded-3xl border border-white/10 bg-white/5 p-4 backdrop-blur-sm">
        <div className="flex items-center gap-3">
          <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-gradient-to-br from-sky-400 to-indigo-500 text-lg font-black text-white shadow-lg shadow-sky-500/30">
            J
          </div>
          <div>
            <h1 className="text-lg font-bold tracking-tight text-white">Job Pipeline</h1>
            <p className="text-xs text-slate-300">Software + ECE tracking</p>
          </div>
        </div>
        <p className="mt-3 text-sm leading-6 text-slate-300">
          Monitor fresh roles, score them fast, and keep your application pipeline tidy.
        </p>
      </div>

      <nav className="flex gap-2 overflow-auto lg:flex-col">
        {items.map((item) => {
          const isActive = active === item.key;
          return (
            <button
              key={item.key}
              type="button"
              onClick={() => onChange(item.key)}
              className={`flex items-center gap-3 rounded-2xl px-4 py-3 text-left text-sm font-semibold transition ${
                isActive
                  ? "bg-white text-slate-950 shadow-lg shadow-black/20"
                  : "bg-white/5 text-slate-200 hover:bg-white/10"
              }`}
            >
              <span
                className={`h-2.5 w-2.5 rounded-full ${
                  isActive ? "bg-sky-500" : "bg-slate-500"
                }`}
              />
              {item.label}
            </button>
          );
        })}
      </nav>

      <div className="mt-5 rounded-3xl border border-white/10 bg-gradient-to-br from-slate-900 to-slate-800 p-4 text-sm text-slate-300 shadow-lg">
        <p className="font-semibold text-white">Daily automation</p>
        <p className="mt-2 leading-6">
          Scheduled runs keep your lists updated without you needing to babysit the dashboard.
        </p>
      </div>
    </aside>
  );
}
