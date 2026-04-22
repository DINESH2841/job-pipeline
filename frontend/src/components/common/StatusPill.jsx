const levelClasses = {
  success: "border-emerald-200 bg-emerald-50 text-emerald-700",
  info: "border-sky-200 bg-sky-50 text-sky-700",
  warn: "border-amber-200 bg-amber-50 text-amber-700",
  warning: "border-amber-200 bg-amber-50 text-amber-700",
  error: "border-red-200 bg-red-50 text-red-700"
};

export default function StatusPill({ value }) {
  const key = String(value || "info").toLowerCase();
  const cls = levelClasses[key] || levelClasses.info;
  return (
    <span className={`inline-flex items-center rounded-full border px-2.5 py-1 text-xs font-semibold capitalize ${cls}`}>
      {value || "info"}
    </span>
  );
}
