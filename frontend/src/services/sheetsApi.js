import axios from "axios";

const BACKEND_BASE_URL = import.meta.env.VITE_BACKEND_URL || "http://localhost:4000";

const SHEET_ID = import.meta.env.VITE_GOOGLE_SHEET_ID;
const API_KEY = import.meta.env.VITE_GOOGLE_API_KEY;

const SHEETS_BASE = "https://sheets.googleapis.com/v4/spreadsheets";

const RANGES = {
  jobs: "Jobs!A:L",
  rawData: "RawData!A:H",
  history: "History!A:I",
  logs: "Logs!A:F"
};

const STATUS_OPTIONS = [
  "New",
  "Applied",
  "Assessment",
  "Interview",
  "In Progress",
  "Rejected",
  "Offer"
];

function assertReadConfig() {
  if (!SHEET_ID || !API_KEY) {
    throw new Error("Missing VITE_GOOGLE_SHEET_ID or VITE_GOOGLE_API_KEY in frontend env.");
  }
}

function mapJobs(values = []) {
  return values.slice(1).map((row, idx) => ({
    rowIndex: idx + 2,
    timestamp: row[0] || "",
    title: row[1] || "",
    company: row[2] || "",
    location: row[3] || "",
    type: row[4] || "",
    experience: row[5] || "",
    skills: row[6] ? String(row[6]).split(",").map((s) => s.trim()).filter(Boolean) : [],
    score: Number(row[7] || 0),
    group: row[8] || "",
    apply_link: row[9] || "",
    posted_time: row[10] || "",
    source: row[11] || ""
  }));
}

function mapRawData(values = []) {
  return values.slice(1).map((row, idx) => ({
    rowIndex: idx + 2,
    timestamp: row[0] || "",
    run_tag: row[1] || "",
    title: row[2] || "",
    company: row[3] || "",
    location: row[4] || "",
    description: row[5] || "",
    apply_link: row[6] || "",
    source: row[7] || ""
  }));
}

function mapHistory(values = []) {
  const headers = (values[0] || []).map((h) => String(h || "").trim().toLowerCase());
  const isV2 = headers[0] === "job id" && headers[3] === "apply link";

  return values.slice(1).map((row, idx) => {
    if (isV2) {
      return {
        rowIndex: idx + 2,
        apply_link: row[3] || "",
        status: row[4] || "New",
        notes: row[5] || "",
        applied_date: row[6] || "",
        last_updated: row[7] || "",
        source: row[8] || ""
      };
    }

    return {
      rowIndex: idx + 2,
      apply_link: row[0] || "",
      status: row[1] || "New",
      notes: row[2] || "",
      applied_date: row[3] || "",
      last_updated: row[4] || "",
      source: row[5] || ""
    };
  });
}

function mapLogs(values = []) {
  return values.slice(1).map((row, idx) => ({
    rowIndex: idx + 2,
    timestamp: row[0] || "",
    run_id: row[1] || "",
    level: (row[2] || "info").toLowerCase(),
    step: row[3] || "",
    message: row[4] || "",
    data: row[5] || "{}"
  }));
}

async function readRange(range) {
  assertReadConfig();
  const encodedRange = encodeURIComponent(range);
  const url = `${SHEETS_BASE}/${SHEET_ID}/values/${encodedRange}?key=${API_KEY}`;
  const res = await axios.get(url);
  return res.data.values || [];
}

async function appendRange(range, values) {
  const res = await axios.post(`${BACKEND_BASE_URL}/api/history/mark-applied`, {
    apply_link: values?.[0]?.[0] || "",
    source: values?.[0]?.[5] || ""
  });
  return res.data;
}

async function updateRange(range, values) {
  const rowMatch = String(range || "").match(/\d+/);
  const rowIndex = rowMatch ? Number(rowMatch[0]) : null;
  const row = values?.[0] || [];

  const res = await axios.post(`${BACKEND_BASE_URL}/api/history/update`, {
    rowIndex,
    status: row[0] || "New",
    notes: row[1] || "",
    applied_date: row[2] || "",
    source: row[4] || ""
  });
  return res.data;
}

export async function fetchJobs() {
  const values = await readRange(RANGES.jobs);
  return mapJobs(values);
}

export async function fetchRawData() {
  const values = await readRange(RANGES.rawData);
  return mapRawData(values);
}

export async function fetchHistory() {
  const values = await readRange(RANGES.history);
  return mapHistory(values);
}

export async function fetchLogs() {
  const values = await readRange(RANGES.logs);
  return mapLogs(values);
}

export async function updateHistoryEntry(entry) {
  const safeStatus = STATUS_OPTIONS.includes(entry.status) ? entry.status : "New";
  const range = `History!B${entry.rowIndex}:F${entry.rowIndex}`;
  return updateRange(range, [[safeStatus, entry.notes || "", entry.applied_date || "", new Date().toISOString(), entry.source || ""]]);
}

export async function markJobAsApplied(job) {
  const history = await fetchHistory();
  const existing = history.find((h) => h.apply_link === job.apply_link);

  if (existing) {
    existing.status = "Applied";
    existing.applied_date = existing.applied_date || new Date().toISOString();
    existing.source = existing.source || job.source || "";
    return updateHistoryEntry(existing);
  }

  return appendRange("History!A1", [[job.apply_link, "Applied", "", new Date().toISOString(), new Date().toISOString(), job.source || ""]]);
}

export async function runPipelineNow() {
  const res = await axios.post(`${BACKEND_BASE_URL}/api/pipeline/run`);
  return res.data;
}

export { STATUS_OPTIONS };
