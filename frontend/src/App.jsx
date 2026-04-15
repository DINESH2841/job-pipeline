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
    <main className="min-h-screen bg-slate-100 text-slate-900 lg:flex">
      <Sidebar active={activePage} onChange={setActivePage} />

      <section className="flex-1 p-4 lg:p-6">
        {info ? (
          <div className="mb-4 rounded-xl border border-emerald-200 bg-emerald-50 p-4 text-emerald-800">
            <p className="text-sm font-medium">{info}</p>
          </div>
        ) : null}

        {loading ? (
          <div className="rounded-xl border border-slate-200 bg-white p-6 text-slate-600">Loading dashboard...</div>
        ) : error ? (
          <div className="rounded-xl border border-red-200 bg-red-50 p-6 text-red-700">
            <p className="font-semibold">Error</p>
            <p className="mt-1 text-sm">{error}</p>
            <button type="button" onClick={loadAll} className="mt-3 rounded-md bg-red-700 px-3 py-1 text-xs font-semibold text-white">
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
      </section>
    </main>
  );
}
