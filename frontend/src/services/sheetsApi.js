import axios from "axios";

const BACKEND_BASE_URL = import.meta.env.VITE_BACKEND_URL || (import.meta.env.DEV ? "http://localhost:4000" : "");

export const STATUS_OPTIONS = [
  "New",
  "Applied",
  "Assessment",
  "Interview",
  "In Progress",
  "Rejected",
  "Offer"
];

function assertBackendConfig() {
  if (!BACKEND_BASE_URL) {
    throw new Error("Missing VITE_BACKEND_URL in frontend env.");
  }

  if (!import.meta.env.DEV) {
    const normalized = String(BACKEND_BASE_URL).toLowerCase();
    if (normalized.includes("localhost") || normalized.includes("127.0.0.1")) {
      throw new Error("Invalid VITE_BACKEND_URL for production. Use a public HTTPS backend URL.");
    }
  }
}

async function apiGet(path) {
  assertBackendConfig();
  const res = await axios.get(`${BACKEND_BASE_URL}${path}`);
  return res.data || [];
}

async function apiPost(path, payload) {
  assertBackendConfig();
  const res = await axios.post(`${BACKEND_BASE_URL}${path}`, payload || {});
  return res.data;
}

export async function fetchJobs() {
  return apiGet("/api/jobs");
}

export async function fetchRawData() {
  return apiGet("/api/raw-data");
}

export async function fetchHistory() {
  return apiGet("/api/history");
}

export async function fetchLogs() {
  return apiGet("/api/logs");
}

export async function updateHistoryEntry(entry) {
  const safeStatus = STATUS_OPTIONS.includes(entry.status) ? entry.status : "New";
  return apiPost("/api/history/update", {
    id: entry.id,
    apply_link: entry.apply_link,
    status: safeStatus,
    notes: entry.notes || "",
    applied_date: entry.applied_date || "",
    source: entry.source || ""
  });
}

export async function markJobAsApplied(job) {
  return apiPost("/api/history/mark-applied", {
    apply_link: job.apply_link,
    source: job.source || ""
  });
}

export async function runPipelineNow() {
  return apiPost("/api/pipeline/run", {});
}
