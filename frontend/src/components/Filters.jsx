const groups = ["All", "High", "Good", "Low"];

export default function Filters({ activeGroup, setActiveGroup }) {
  return (
    <div className="flex flex-wrap gap-2">
      {groups.map((group) => {
        const active = group === activeGroup;
        return (
          <button
            key={group}
            type="button"
            onClick={() => setActiveGroup(group)}
            className={`rounded-full border px-4 py-2 text-sm font-medium transition-colors ${
              active
                ? "border-slate-900 bg-slate-900 text-white"
                : "border-slate-300 bg-white text-slate-700 hover:bg-slate-100"
            }`}
          >
            {group}
          </button>
        );
      })}
    </div>
  );
}
