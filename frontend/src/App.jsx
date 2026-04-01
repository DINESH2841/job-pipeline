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
  const [writing, setWriting] = useState(false);
  const [savingRow, setSavingRow] = useState(null);

  async function loadAll() {
    setLoading(true);
    setError("");
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

  return (
    <main className="min-h-screen bg-slate-100 text-slate-900 lg:flex">
      <Sidebar active={activePage} onChange={setActivePage} />

      <section className="flex-1 p-4 lg:p-6">
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
              <DashboardPage jobs={sortedJobs} history={sortedHistory} logs={sortedLogs} />
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
