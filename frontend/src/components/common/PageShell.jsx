export default function PageShell({ title, description, right, children }) {
  return (
    <section className="overflow-hidden rounded-3xl border border-slate-200/80 bg-white/85 shadow-xl shadow-slate-200/70 backdrop-blur-sm">
      <header className="flex flex-col gap-4 border-b border-slate-200/80 bg-gradient-to-r from-slate-50 via-white to-sky-50 p-5 md:flex-row md:items-center md:justify-between">
        <div>
          <p className="text-xs font-semibold uppercase tracking-[0.24em] text-sky-600">Workspace</p>
          <h2 className="mt-1 text-2xl font-bold tracking-tight text-slate-950">{title}</h2>
          {description ? <p className="mt-1 text-sm leading-6 text-slate-600">{description}</p> : null}
        </div>
        {right}
      </header>
      <div className="p-5 md:p-6">{children}</div>
    </section>
  );
}
