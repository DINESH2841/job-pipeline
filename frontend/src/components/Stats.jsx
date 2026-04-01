export default function Stats({ jobs }) {
  const total = jobs.length;
  const high = jobs.filter((j) => j.group === "High").length;
  const good = jobs.filter((j) => j.group === "Good").length;
  const low = jobs.filter((j) => j.group === "Low").length;

  const cards = [
    { label: "Total Jobs", value: total, color: "bg-slate-900 text-white" },
    { label: "High", value: high, color: "bg-emerald-100 text-emerald-800" },
    { label: "Good", value: good, color: "bg-blue-100 text-blue-800" },
    { label: "Low", value: low, color: "bg-amber-100 text-amber-800" }
  ];

  return (
    <section className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
      {cards.map((card) => (
        <div key={card.label} className={`rounded-xl p-4 shadow-sm ${card.color}`}>
          <p className="text-sm opacity-90">{card.label}</p>
          <p className="mt-2 text-2xl font-bold">{card.value}</p>
        </div>
      ))}
    </section>
  );
}
