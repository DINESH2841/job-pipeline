import { useEffect, useMemo, useState } from "react";
import Sidebar from "./components/layout/Sidebar";
import DashboardPage from "./pages/DashboardPage";
import JobsPage from "./pages/JobsPage";
import HistoryPage from "./pages/HistoryPage";
import RawDataPage from "./pages/RawDataPage";
import LogsPage from "./pages/LogsPage";
import {
  fetchHistory,
  fetchJobs,
  fetchLogs,
  fetchRawData,
  markJobAsApplied,
  runPipelineNow,
  updateHistoryEntry
} from "./services/sheetsApi";

export default function App() {
  const [activePage, setActivePage] = useState("dashboard");
  const [jobs, setJobs] = useState([]);
  const [rawData, setRawData] = useState([]);
  const [history, setHistory] = useState([]);
  const [logs, setLogs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [info, setInfo] = useState("");
  const [writing, setWriting] = useState(false);
  const [savingRow, setSavingRow] = useState(null);
  const [runningPipeline, setRunningPipeline] = useState(false);

  async function loadAll() {
    setLoading(true);
    setError("");
    setInfo("");
    try {
      const [jobsData, rawDataRows, historyRows, logsRows] = await Promise.all([
        fetchJobs(),
        fetchRawData(),
        fetchHistory(),
        fetchLogs()
      ]);

      setJobs(jobsData);
      setRawData(rawDataRows);
      setHistory(historyRows);
      setLogs(logsRows);
    } catch (err) {
      setError(err.response?.data?.error?.message || err.message || "Failed to load dashboard data.");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    loadAll();
  }, []);

  const sortedJobs = useMemo(() => [...jobs].sort((a, b) => Number(b.score || 0) - Number(a.score || 0)), [jobs]);
  const sortedRaw = useMemo(() => [...rawData].sort((a, b) => (b.timestamp || "").localeCompare(a.timestamp || "")), [rawData]);
  const sortedHistory = useMemo(() => [...history].sort((a, b) => b.rowIndex - a.rowIndex), [history]);
  const sortedLogs = useMemo(() => [...logs].sort((a, b) => (b.timestamp || "").localeCompare(a.timestamp || "")), [logs]);
  const latestLog = sortedLogs[0];

  const pageMeta = {
    dashboard: { label: "Dashboard", description: "Track performance, activity, and one-click pipeline runs." },
    jobs: { label: "Jobs", description: "Browse software, embedded, and hardware opportunities with smart filters." },
    history: { label: "History", description: "Keep application status and notes organized in one place." },
    raw: { label: "Raw Data", description: "Inspect the scraped dataset for debugging and verification." },
    logs: { label: "Logs", description: "Review the latest pipeline events and system behavior." }
  };

  const overviewCards = [
    { label: "Jobs loaded", value: jobs.length },
    { label: "Applied tracked", value: history.filter((item) => item.status === "Applied").length },
    { label: "Latest logs", value: sortedLogs.length },
    { label: "Live page", value: pageMeta[activePage]?.label || "Workspace" }
  ];

  const onMarkApplied = async (job) => {
    try {
      setWriting(true);
      setError("");
      await markJobAsApplied(job);
      await loadAll();
    } catch (err) {
      setError(err.response?.data?.error?.message || err.message || "Failed to mark as applied.");
    } finally {
      setWriting(false);
    }
  };

  const onSaveHistory = async (entry) => {
    try {
      setSavingRow(entry.rowIndex);
      setError("");
      await updateHistoryEntry(entry);
      await loadAll();
    } catch (err) {
      setError(err.response?.data?.error?.message || err.message || "Failed to update history row.");
    } finally {
      setSavingRow(null);
    }
  };

  const onRunNow = async () => {
    try {
      setRunningPipeline(true);
      setError("");
      setInfo("");
      const result = await runPipelineNow();
      await loadAll();
      const seconds = result?.durationMs ? (Number(result.durationMs) / 1000).toFixed(1) : null;
      setInfo(seconds ? `Pipeline completed in ${seconds}s. Data refreshed.` : "Pipeline completed. Data refreshed.");
    } catch (err) {
      setError(err.response?.data?.error || err.response?.data?.message || err.message || "Failed to run pipeline now.");
    } finally {
      setRunningPipeline(false);
    }
  };

  return (
    <main className="min-h-screen text-slate-900 xl:flex">
      <Sidebar active={activePage} onChange={setActivePage} />

      <section className="min-w-0 flex-1 px-4 py-4 md:px-6 md:py-6 xl:px-8">
        <div className="mx-auto flex max-w-7xl flex-col gap-6">
          <div className="overflow-hidden rounded-3xl border border-slate-200/80 bg-slate-950 text-white shadow-2xl shadow-slate-300/40">
            <div className="grid gap-6 p-6 xl:grid-cols-[1.5fr_1fr] xl:p-8">
              <div>
                <p className="inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/10 px-3 py-1 text-xs font-semibold uppercase tracking-[0.24em] text-sky-200">
                  Live job pipeline
                </p>
                <h2 className="mt-4 text-3xl font-black tracking-tight text-white md:text-4xl">
                  Software + Embedded + ECE job tracker with a polished workflow
                </h2>
                <p className="mt-3 max-w-2xl text-sm leading-6 text-slate-300 md:text-base">
                  Search, score, save, and review opportunities from a clean dashboard designed for fast daily use.
                </p>
                {latestLog ? (
                  <p className="mt-4 text-sm text-slate-400">
                    Latest event: <span className="font-semibold text-white">{latestLog.message || "Pipeline activity"}</span>
                  </p>
                ) : null}
              </div>

              <div className="grid grid-cols-2 gap-3">
                {overviewCards.map((card) => (
                  <div key={card.label} className="rounded-3xl border border-white/10 bg-white/10 p-4 backdrop-blur-sm">
                    <p className="text-xs font-semibold uppercase tracking-[0.2em] text-slate-300">{card.label}</p>
                    <p className="mt-3 text-2xl font-bold text-white">{card.value}</p>
                  </div>
                ))}
              </div>
            </div>
            <div className="flex flex-wrap items-center gap-3 border-t border-white/10 px-6 py-4 text-sm text-slate-300 xl:px-8">
              <span className="inline-flex items-center gap-2 rounded-full bg-emerald-500/15 px-3 py-1 font-medium text-emerald-200">
                ● Pipeline ready
              </span>
              <span>{pageMeta[activePage]?.description}</span>
            </div>
          </div>

          {info ? (
            <div className="rounded-2xl border border-emerald-200 bg-emerald-50/90 p-4 text-emerald-800 shadow-sm">
              <p className="text-sm font-medium">{info}</p>
            </div>
          ) : null}

          {loading ? (
            <div className="rounded-2xl border border-slate-200/80 bg-white/85 p-6 text-slate-600 shadow-sm">Loading dashboard...</div>
          ) : error ? (
            <div className="rounded-2xl border border-red-200 bg-red-50/90 p-6 text-red-700 shadow-sm">
              <p className="font-semibold">Error</p>
              <p className="mt-1 text-sm">{error}</p>
              <button type="button" onClick={loadAll} className="mt-3 rounded-lg bg-red-700 px-4 py-2 text-xs font-semibold text-white shadow-sm hover:bg-red-800">
                Retry
              </button>
            </div>
          ) : (
            <>
              {activePage === "dashboard" && (
                <DashboardPage
                  jobs={sortedJobs}
                  history={sortedHistory}
                  logs={sortedLogs}
                  onRunNow={onRunNow}
                  runningPipeline={runningPipeline}
                />
              )}
              {activePage === "jobs" && (
                <JobsPage jobs={sortedJobs} onMarkApplied={onMarkApplied} writing={writing} />
              )}
              {activePage === "history" && (
                <HistoryPage history={sortedHistory} onSave={onSaveHistory} savingRow={savingRow} />
              )}
              {activePage === "raw" && <RawDataPage rows={sortedRaw} />}
              {activePage === "logs" && <LogsPage logs={sortedLogs} />}
            </>
          )}
        </div>
      </section>
    </main>
  );
}
