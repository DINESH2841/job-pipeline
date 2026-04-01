const items = [
  { key: "dashboard", label: "Dashboard" },
  { key: "jobs", label: "Jobs" },
  { key: "history", label: "History" },
  { key: "raw", label: "RawData" },
  { key: "logs", label: "Logs" }
];

export default function Sidebar({ active, onChange }) {
  return (
    <aside className="w-full border-b border-slate-200 bg-white p-4 lg:h-screen lg:w-64 lg:border-b-0 lg:border-r">
      <h1 className="mb-4 text-xl font-bold text-slate-900">Job Tracker</h1>
      <nav className="flex gap-2 overflow-auto lg:flex-col">
        {items.map((item) => {
          const isActive = active === item.key;
          return (
            <button
              key={item.key}
              type="button"
              onClick={() => onChange(item.key)}
              className={`rounded-lg px-3 py-2 text-left text-sm font-medium transition ${
                isActive
                  ? "bg-slate-900 text-white"
                  : "bg-slate-100 text-slate-700 hover:bg-slate-200"
              }`}
            >
              {item.label}
            </button>
          );
        })}
      </nav>
    </aside>
  );
}
