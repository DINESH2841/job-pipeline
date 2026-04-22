import axios from "axios";

const BACKEND_BASE_URL = import.meta.env.VITE_BACKEND_URL || "http://localhost:4000";

export const STATUS_OPTIONS = [
  "New",
  "Applied",
  "Assessment",
  "Interview",
  "In Progress",
  "Rejected",
  "Offer"
];

export async function fetchJobs() {
  const res = await axios.get(`${BACKEND_BASE_URL}/api/jobs`);
  return res.data || [];
}

export async function fetchRawData() {
  const res = await axios.get(`${BACKEND_BASE_URL}/api/raw-data`);
  return res.data || [];
}

export async function fetchHistory() {
  const res = await axios.get(`${BACKEND_BASE_URL}/api/history`);
  return res.data || [];
}

export async function fetchLogs() {
  const res = await axios.get(`${BACKEND_BASE_URL}/api/logs`);
  return res.data || [];
}

export async function updateHistoryEntry(entry) {
  const safeStatus = STATUS_OPTIONS.includes(entry.status) ? entry.status : "New";
  const res = await axios.post(`${BACKEND_BASE_URL}/api/history/update`, {
    id: entry.id,
    apply_link: entry.apply_link,
    status: safeStatus,
    notes: entry.notes || "",
    applied_date: entry.applied_date || "",
    source: entry.source || ""
  });
  return res.data;
}

export async function markJobAsApplied(job) {
  const res = await axios.post(`${BACKEND_BASE_URL}/api/history/mark-applied`, {
    apply_link: job.apply_link,
    source: job.source || ""
  });
  return res.data;
}

export async function runPipelineNow() {
  const res = await axios.post(`${BACKEND_BASE_URL}/api/pipeline/run`);
  return res.data;
}
