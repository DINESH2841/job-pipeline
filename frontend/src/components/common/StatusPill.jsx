const levelClasses = {
  success: "bg-emerald-100 text-emerald-700",
  info: "bg-sky-100 text-sky-700",
  warn: "bg-amber-100 text-amber-700",
  warning: "bg-amber-100 text-amber-700",
  error: "bg-red-100 text-red-700"
};

export default function StatusPill({ value }) {
  const key = String(value || "info").toLowerCase();
  const cls = levelClasses[key] || levelClasses.info;
  return <span className={`rounded-full px-2 py-1 text-xs font-semibold ${cls}`}>{value || "info"}</span>;
}
