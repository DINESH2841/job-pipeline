import crypto from "crypto";
import dotenv from "dotenv";
import path from "path";
import { fileURLToPath } from "url";
import { google } from "googleapis";
import { createClient } from "@supabase/supabase-js";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

dotenv.config({ path: path.resolve(__dirname, "../../.env") });
dotenv.config({ path: path.resolve(__dirname, "../.env") });

const REQUIRED_ENV_VARS = [
  "NEXT_PUBLIC_SUPABASE_URL",
  "NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY",
  "GOOGLE_SHEET_ID",
  "GOOGLE_SERVICE_ACCOUNT_EMAIL",
  "GOOGLE_PRIVATE_KEY"
];

const SHEET_NAMES = {
  jobs: "Jobs",
  history: "History",
  logs: "Logs",
  raw: "RawData"
};

const HISTORY_V2_HEADERS = [
  "Job ID",
  "Title",
  "Company",
  "Apply Link",
  "Status",
  "Notes",
  "Applied Date",
  "Last Updated",
  "Source"
];

const HISTORY_LEGACY_HEADERS = ["Apply Link", "Status", "Notes", "Applied Date", "Last Updated", "Source"];

const JOB_HEADERS = [
  "timestamp",
  "title",
  "company",
  "location",
  "type",
  "experience",
  "skills",
  "score",
  "group",
  "apply_link",
  "posted_time",
  "source"
];

const LOG_HEADERS = ["timestamp", "run_id", "level", "step", "message", "data"];

const RAW_HEADERS = JOB_HEADERS;

const SUPABASE_BATCH_SIZE = 100;
const MAX_RETRIES = 3;
const RETRY_BASE_DELAY_MS = 500;

function requireEnv(name) {
  const value = process.env[name];
  if (!value || !String(value).trim()) {
    throw new Error(`Missing required environment variable: ${name}`);
  }
  return String(value).trim();
}

function validateEnv() {
  const missing = REQUIRED_ENV_VARS.filter((name) => !process.env[name] || !String(process.env[name]).trim());
  if (missing.length) {
    throw new Error(`Missing required environment variables: ${missing.join(", ")}`);
  }

  const key = String(process.env.GOOGLE_PRIVATE_KEY || "").replace(/\\n/g, "\n");
  process.env.GOOGLE_PRIVATE_KEY = key;
}

function createSheetsClient() {
  const auth = new google.auth.JWT({
    email: requireEnv("GOOGLE_SERVICE_ACCOUNT_EMAIL"),
    key: requireEnv("GOOGLE_PRIVATE_KEY").replace(/\\n/g, "\n"),
    scopes: ["https://www.googleapis.com/auth/spreadsheets.readonly"]
  });

  return google.sheets({ version: "v4", auth });
}

function createSupabaseClient() {
  return createClient(
    requireEnv("NEXT_PUBLIC_SUPABASE_URL"),
    requireEnv("NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY"),
    {
      auth: {
        persistSession: false,
        autoRefreshToken: false
      }
    }
  );
}

function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function normalizeText(value) {
  return String(value ?? "").replace(/\s+/g, " ").trim();
}

function normalizeHeader(value) {
  return normalizeText(value).toLowerCase().replace(/[^a-z0-9]+/g, "_").replace(/^_|_$/g, "");
}

function canonicalizeLink(value) {
  const raw = normalizeText(value);
  if (!raw) return "";

  try {
    const url = new URL(raw);
    url.protocol = url.protocol.toLowerCase();
    url.hostname = url.hostname.toLowerCase();
    return url.toString();
  } catch {
    return raw;
  }
}

function toNumber(value, fallback = null) {
  if (value === null || value === undefined || value === "") return fallback;
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : fallback;
}

function parseJsonMaybe(value, fallback = {}) {
  if (value === null || value === undefined || value === "") return fallback;
  if (typeof value === "object") return value;

  const text = String(value).trim();
  if (!text) return fallback;

  try {
    return JSON.parse(text);
  } catch {
    return { raw: text };
  }
}

function parseTimeMaybe(value) {
  const text = normalizeText(value);
  if (!text) return null;
  const date = new Date(text);
  return Number.isNaN(date.getTime()) ? null : date.toISOString();
}

function stableHash(input) {
  return crypto.createHash("sha256").update(String(input)).digest("hex");
}

function chunk(items, size) {
  const out = [];
  for (let i = 0; i < items.length; i += size) {
    out.push(items.slice(i, i + size));
  }
  return out;
}

function rowToObject(headers, row) {
  return headers.reduce((acc, header, index) => {
    acc[normalizeHeader(header)] = row[index] ?? "";
    return acc;
  }, {});
}

function dataRowsFromValues(values, expectedHeaders) {
  const firstRow = values[0] || [];
  const normalizedFirst = firstRow.map((value) => normalizeHeader(value));
  const expectedNormalized = expectedHeaders.map((value) => normalizeHeader(value));
  const hasHeader = expectedNormalized.some((header) => normalizedFirst.includes(header));

  if (hasHeader) {
    return {
      headers: firstRow,
      rows: values.slice(1)
    };
  }

  return {
    headers: expectedHeaders,
    rows: values
  };
}

function isStatusValue(value) {
  const normalized = normalizeText(value).toLowerCase();
  return ["new", "applied", "assessment", "interview", "in progress", "rejected", "offer"].includes(normalized);
}

function detectHistoryLayout(values) {
  const firstRow = values[0] || [];
  const normalizedFirst = firstRow.map((value) => normalizeHeader(value));

  if (normalizedFirst.includes("job_id") && normalizedFirst.includes("apply_link")) {
    return dataRowsFromValues(values, HISTORY_V2_HEADERS);
  }

  if (normalizedFirst.includes("apply_link") && normalizedFirst.includes("status") && !normalizedFirst.includes("job_id")) {
    return dataRowsFromValues(values, HISTORY_LEGACY_HEADERS);
  }

  if (firstRow.length >= 8) {
    return dataRowsFromValues(values, HISTORY_V2_HEADERS);
  }

  return dataRowsFromValues(values, HISTORY_LEGACY_HEADERS);
}

async function retryTransient(fn, label) {
  let lastError;

  for (let attempt = 1; attempt <= MAX_RETRIES; attempt += 1) {
    try {
      return await fn();
    } catch (error) {
      lastError = error;
      const transient = isTransientError(error);

      if (!transient || attempt === MAX_RETRIES) {
        throw error;
      }

      const delay = RETRY_BASE_DELAY_MS * attempt;
      console.warn(`[retry] ${label} failed (attempt ${attempt}/${MAX_RETRIES}); retrying in ${delay}ms: ${error.message || error}`);
      await sleep(delay);
    }
  }

  throw lastError;
}

function isTransientError(error) {
  const status = Number(error?.status || error?.statusCode || error?.response?.status || 0);
  const code = String(error?.code || error?.name || "").toUpperCase();
  const message = String(error?.message || "").toLowerCase();

  return (
    [408, 425, 429, 500, 502, 503, 504].includes(status) ||
    ["ETIMEDOUT", "ECONNRESET", "ECONNREFUSED", "EAI_AGAIN", "FETCH_ERROR"].includes(code) ||
    message.includes("timeout") ||
    message.includes("fetch failed") ||
    message.includes("temporarily unavailable")
  );
}

function isMissingTableError(error) {
  const message = String(error?.message || "").toLowerCase();
  return message.includes("could not find the table") || message.includes("schema cache");
}

function isRlsError(error) {
  const message = String(error?.message || "").toLowerCase();
  const detail = String(error?.details || "").toLowerCase();
  return message.includes("row level security") || detail.includes("row level security");
}

async function readSheetTab(sheets, spreadsheetId, tabName, expectedHeaders) {
  const response = await retryTransient(
    () => sheets.spreadsheets.values.get({ spreadsheetId, range: `${tabName}!A:Z` }),
    `read ${tabName}`
  );

  const values = response.data.values || [];
  if (!values.length) {
    return { tabName, headers: expectedHeaders, rows: [], read: 0 };
  }

  const { headers, rows } = expectedHeaders === HISTORY_V2_HEADERS || expectedHeaders === HISTORY_LEGACY_HEADERS
    ? detectHistoryLayout(values)
    : dataRowsFromValues(values, expectedHeaders);

  return {
    tabName,
    headers,
    rows,
    read: rows.length
  };
}

function getField(row, ...keys) {
  for (const key of keys) {
    const normalized = normalizeHeader(key);
    if (row[normalized] !== undefined && row[normalized] !== null && String(row[normalized]).trim() !== "") {
      return row[normalized];
    }
  }
  return "";
}

function normalizeJobRow(row, rowNumber) {
  const title = normalizeText(getField(row, "title"));
  const company = normalizeText(getField(row, "company"));
  const link = canonicalizeLink(getField(row, "apply_link", "link", "url", "jobUrl"));

  if (!title || !company || !link) {
    return {
      ok: false,
      reason: `missing title/company/link at row ${rowNumber}`
    };
  }

  return {
    ok: true,
    record: {
      title,
      company,
      location: normalizeText(getField(row, "location")) || "Unknown",
      link,
      score: toNumber(getField(row, "score"), 0) ?? 0,
      job_type: normalizeText(getField(row, "type")) || null,
      experience: normalizeText(getField(row, "experience")) || null,
      skills: normalizeText(getField(row, "skills")) || null,
      job_group: normalizeText(getField(row, "group")) || null,
      posted_time: normalizeText(getField(row, "posted_time")) || null,
      source: normalizeText(getField(row, "source")) || null,
      sheet_timestamp: normalizeText(getField(row, "timestamp")) || null,
      description: null
    }
  };
}

function normalizeApplicationRow(row, rowNumber) {
  const isV2 = Object.prototype.hasOwnProperty.call(row, "job_id") || Object.prototype.hasOwnProperty.call(row, "job id");
  const applyLink = canonicalizeLink(getField(row, "apply_link", "apply link"));

  const title = normalizeText(isV2 ? getField(row, "title") : getField(row, "title"));
  const company = normalizeText(isV2 ? getField(row, "company") : getField(row, "company"));
  const statusValue = normalizeText(getField(row, "status")) || "New";
  const status = isStatusValue(statusValue) ? statusValue : "New";
  const appliedDate = normalizeText(getField(row, "applied_date", "applied date")) || null;
  const notes = normalizeText(getField(row, "notes")) || null;
  const source = normalizeText(getField(row, "source")) || null;
  const lastUpdated = normalizeText(getField(row, "last_updated", "last updated")) || null;

  if (!title && !company && !applyLink) {
    return {
      ok: false,
      reason: `missing title/company/link at row ${rowNumber}`
    };
  }

  return {
    ok: true,
    record: {
      title: title || "Unknown",
      company: company || "Unknown",
      apply_link: applyLink || null,
      status,
      applied_date: appliedDate,
      notes,
      source,
      last_updated: lastUpdated,
      source_hash: stableHash(
        JSON.stringify({
          identity: applyLink || `${title || "Unknown"}|${company || "Unknown"}`
        })
      )
    }
  };
}

function normalizeLogRow(row, rowNumber) {
  const runId = normalizeText(getField(row, "run_id", "run id"));
  const message = normalizeText(getField(row, "message"));
  const step = normalizeText(getField(row, "step")) || "unknown";
  const level = normalizeText(getField(row, "level")) || "info";
  const runTime = parseTimeMaybe(getField(row, "timestamp"));
  const data = parseJsonMaybe(getField(row, "data"));

  if (!runId && !message && !runTime) {
    return {
      ok: false,
      reason: `missing run_id/message/timestamp at row ${rowNumber}`
    };
  }

  const jobsFetched = toNumber(data?.jobs_fetched ?? data?.count ?? data?.fetched, null);
  const jobsSaved = toNumber(data?.jobs_saved ?? data?.saved ?? data?.stored, null);
  const errors = level.toLowerCase() === "error"
    ? [{ message: message || "Pipeline error", step, data }]
    : (Array.isArray(data?.errors) ? data.errors : []);

  return {
    ok: true,
    record: {
      run_id: runId || "unknown",
      run_time: runTime,
      level,
      step,
      message: message || "",
      jobs_fetched: jobsFetched,
      jobs_saved: jobsSaved,
      data,
      errors,
      source_hash: stableHash(
        JSON.stringify({
          runId: runId || "unknown",
          runTime: runTime || "",
          level,
          step,
          message: message || "",
          data
        })
      )
    }
  };
}

function normalizeRawRow(row, rowNumber) {
  const title = normalizeText(getField(row, "title"));
  const company = normalizeText(getField(row, "company"));
  const link = canonicalizeLink(getField(row, "apply_link", "link", "url", "jobUrl"));

  if (!title && !company && !link) {
    return {
      ok: false,
      reason: `empty raw row at ${rowNumber}`
    };
  }

  return {
    ok: true,
    record: {
      sheet_name: "RawData",
      source_row: rowNumber,
      sheet_timestamp: normalizeText(getField(row, "timestamp")) || null,
      title: title || null,
      company: company || null,
      location: normalizeText(getField(row, "location")) || null,
      job_type: normalizeText(getField(row, "type")) || null,
      experience: normalizeText(getField(row, "experience")) || null,
      skills: normalizeText(getField(row, "skills")) || null,
      score: toNumber(getField(row, "score"), null),
      job_group: normalizeText(getField(row, "group")) || null,
      apply_link: link || null,
      posted_time: normalizeText(getField(row, "posted_time")) || null,
      source: normalizeText(getField(row, "source")) || null,
      raw_payload: row,
      source_hash: stableHash(
        JSON.stringify({
          title: title || "",
          company: company || "",
          link: link || "",
          location: normalizeText(getField(row, "location")) || "",
          posted_time: normalizeText(getField(row, "posted_time")) || "",
          source: normalizeText(getField(row, "source")) || ""
        })
      )
    }
  };
}

function buildJobMaps(jobRecords) {
  const byLink = new Map();
  const byTitleCompany = new Map();

  for (const job of jobRecords) {
    if (job.link) {
      byLink.set(job.link, job);
    }

    const key = `${normalizeText(job.title).toLowerCase()}|${normalizeText(job.company).toLowerCase()}`;
    if (key !== "|") {
      byTitleCompany.set(key, job);
    }
  }

  return { byLink, byTitleCompany };
}

function matchApplicationJob(appRecord, jobMaps) {
  const linkKey = canonicalizeLink(appRecord.apply_link || "");
  if (linkKey && jobMaps.byLink.has(linkKey)) {
    return jobMaps.byLink.get(linkKey);
  }

  const titleCompanyKey = `${normalizeText(appRecord.title).toLowerCase()}|${normalizeText(appRecord.company).toLowerCase()}`;
  if (titleCompanyKey !== "|" && jobMaps.byTitleCompany.has(titleCompanyKey)) {
    return jobMaps.byTitleCompany.get(titleCompanyKey);
  }

  return null;
}

async function upsertBatch(supabase, table, rows, conflictTarget, summary, batchLabel) {
  if (!rows.length) return [];

  const results = [];
  const batches = chunk(rows, SUPABASE_BATCH_SIZE);

  for (const [index, batch] of batches.entries()) {
    try {
      const data = await retryTransient(async () => {
        const response = await supabase
          .from(table)
          .upsert(batch, { onConflict: conflictTarget })
          .select();

        if (response.error) {
          throw response.error;
        }

        return response.data || [];
      }, `${batchLabel} batch ${index + 1}`);

      results.push(...data);
      summary.upserted += batch.length;
    } catch (error) {
      summary.failed += batch.length;
      console.warn(`[${batchLabel}] batch ${index + 1} failed; skipping ${batch.length} row(s): ${error.message || error}`);

      if (isMissingTableError(error)) {
        throw new Error(
          `Supabase table \"${table}\" is missing. Apply supabase/migrations/001_sheets_to_supabase.sql in your Supabase project before rerunning the migration.`
        );
      }

      if (isRlsError(error)) {
        throw new Error(
          `Supabase table \"${table}\" is blocked by Row Level Security. Add temporary migration policies for the publishable-key role, then rerun the migration.`
        );
      }
    }
  }

  return results;
}

async function preflightSupabaseSchema(supabase) {
  const tables = ["jobs", "applications", "pipeline_logs", "raw_jobs"];

  for (const table of tables) {
    const response = await supabase
      .from(table)
      .select("id", { head: true, count: "exact" })
      .limit(1);

    if (!response.error) {
      continue;
    }

    const message = String(response.error.message || "");
    const detail = String(response.error.details || "");
    const schemaCacheMiss = message.includes("Could not find the table") || message.includes("schema cache");

    if (schemaCacheMiss) {
      throw new Error(
        `Supabase table \"${table}\" is missing. Apply supabase/migrations/001_sheets_to_supabase.sql in your Supabase project before running the migration.`
      );
    }

    if (message.toLowerCase().includes("row level security") || detail.toLowerCase().includes("row level security")) {
      throw new Error(
        `Supabase table \"${table}\" is protected by RLS. Add temporary policies for the publishable-key migration window, then rerun the script.`
      );
    }

    throw new Error(`Supabase preflight failed for table \"${table}\": ${message || detail || "unknown error"}`);
  }
}

async function main() {
  validateEnv();

  const spreadsheetId = requireEnv("GOOGLE_SHEET_ID");
  const sheets = createSheetsClient();
  const supabase = createSupabaseClient();

  console.log("[migrate] Verifying Supabase schema...");
  await preflightSupabaseSchema(supabase);

  const summary = {
    jobs: { read: 0, valid: 0, skipped: 0, upserted: 0, failed: 0 },
    applications: { read: 0, valid: 0, skipped: 0, upserted: 0, failed: 0, unmatched: 0 },
    pipelineLogs: { read: 0, valid: 0, skipped: 0, upserted: 0, failed: 0 },
    rawJobs: { read: 0, valid: 0, skipped: 0, upserted: 0, failed: 0 }
  };

  console.log("[migrate] Reading Google Sheets tabs...");

  const [jobsSheet, historySheet, logsSheet, rawSheet] = await Promise.all([
    readSheetTab(sheets, spreadsheetId, SHEET_NAMES.jobs, JOB_HEADERS),
    readSheetTab(sheets, spreadsheetId, SHEET_NAMES.history, HISTORY_V2_HEADERS),
    readSheetTab(sheets, spreadsheetId, SHEET_NAMES.logs, LOG_HEADERS),
    readSheetTab(sheets, spreadsheetId, SHEET_NAMES.raw, RAW_HEADERS)
  ]);

  summary.jobs.read = jobsSheet.read;
  summary.applications.read = historySheet.read;
  summary.pipelineLogs.read = logsSheet.read;
  summary.rawJobs.read = rawSheet.read;

  console.log(`[migrate] Jobs rows read: ${summary.jobs.read}`);
  console.log(`[migrate] History rows read: ${summary.applications.read}`);
  console.log(`[migrate] Logs rows read: ${summary.pipelineLogs.read}`);
  console.log(`[migrate] RawData rows read: ${summary.rawJobs.read}`);

  const jobCandidates = [];
  const jobSeen = new Set();

  for (const [index, rowValues] of jobsSheet.rows.entries()) {
    const row = rowToObject(jobsSheet.headers, rowValues);
    const normalized = normalizeJobRow(row, index + 2);

    if (!normalized.ok) {
      summary.jobs.skipped += 1;
      console.warn(`[jobs] ${normalized.reason}`);
      continue;
    }

    if (jobSeen.has(normalized.record.link)) {
      summary.jobs.skipped += 1;
      continue;
    }

    jobSeen.add(normalized.record.link);
    jobCandidates.push(normalized.record);
  }

  summary.jobs.valid = jobCandidates.length;

  const jobRecords = await upsertBatch(supabase, "jobs", jobCandidates, "link", summary.jobs, "jobs");
  const jobMaps = buildJobMaps(jobRecords.length ? jobRecords : jobCandidates);

  const applicationCandidates = [];
  const applicationSeen = new Set();

  for (const [index, rowValues] of historySheet.rows.entries()) {
    const row = rowToObject(historySheet.headers, rowValues);
    const normalized = normalizeApplicationRow(row, index + 2);

    if (!normalized.ok) {
      summary.applications.skipped += 1;
      console.warn(`[applications] ${normalized.reason}`);
      continue;
    }

    const dedupeKey = normalized.record.source_hash;
    if (applicationSeen.has(dedupeKey)) {
      summary.applications.skipped += 1;
      continue;
    }

    applicationSeen.add(dedupeKey);

    const matchedJob = matchApplicationJob(normalized.record, jobMaps);
    if (!matchedJob) {
      summary.applications.unmatched += 1;
    }

    applicationCandidates.push({
      job_id: matchedJob?.id ?? null,
      title: normalized.record.title,
      company: normalized.record.company,
      apply_link: normalized.record.apply_link,
      status: normalized.record.status,
      applied_date: normalized.record.applied_date,
      notes: normalized.record.notes,
      source: normalized.record.source,
      last_updated: normalized.record.last_updated,
      source_hash: normalized.record.source_hash
    });
  }

  summary.applications.valid = applicationCandidates.length;
  await upsertBatch(supabase, "applications", applicationCandidates, "source_hash", summary.applications, "applications");

  const logCandidates = [];
  const logSeen = new Set();

  for (const [index, rowValues] of logsSheet.rows.entries()) {
    const row = rowToObject(logsSheet.headers, rowValues);
    const normalized = normalizeLogRow(row, index + 2);

    if (!normalized.ok) {
      summary.pipelineLogs.skipped += 1;
      console.warn(`[pipeline_logs] ${normalized.reason}`);
      continue;
    }

    if (logSeen.has(normalized.record.source_hash)) {
      summary.pipelineLogs.skipped += 1;
      continue;
    }

    logSeen.add(normalized.record.source_hash);
    logCandidates.push(normalized.record);
  }

  summary.pipelineLogs.valid = logCandidates.length;
  await upsertBatch(supabase, "pipeline_logs", logCandidates, "source_hash", summary.pipelineLogs, "pipeline_logs");

  const rawCandidates = [];
  const rawSeen = new Set();

  for (const [index, rowValues] of rawSheet.rows.entries()) {
    const row = rowToObject(rawSheet.headers, rowValues);
    const normalized = normalizeRawRow(row, index + 2);

    if (!normalized.ok) {
      summary.rawJobs.skipped += 1;
      console.warn(`[raw_jobs] ${normalized.reason}`);
      continue;
    }

    if (rawSeen.has(normalized.record.source_hash)) {
      summary.rawJobs.skipped += 1;
      continue;
    }

    rawSeen.add(normalized.record.source_hash);
    rawCandidates.push(normalized.record);
  }

  summary.rawJobs.valid = rawCandidates.length;
  await upsertBatch(supabase, "raw_jobs", rawCandidates, "source_hash", summary.rawJobs, "raw_jobs");

  console.log("\n[migrate] Completed migration summary");
  console.log(`- Jobs: read ${summary.jobs.read}, valid ${summary.jobs.valid}, upserted ${summary.jobs.upserted}, skipped ${summary.jobs.skipped}, failed ${summary.jobs.failed}`);
  console.log(`- History -> applications: read ${summary.applications.read}, valid ${summary.applications.valid}, upserted ${summary.applications.upserted}, skipped ${summary.applications.skipped}, failed ${summary.applications.failed}, unmatched ${summary.applications.unmatched}`);
  console.log(`- Logs -> pipeline_logs: read ${summary.pipelineLogs.read}, valid ${summary.pipelineLogs.valid}, upserted ${summary.pipelineLogs.upserted}, skipped ${summary.pipelineLogs.skipped}, failed ${summary.pipelineLogs.failed}`);
  console.log(`- RawData -> raw_jobs: read ${summary.rawJobs.read}, valid ${summary.rawJobs.valid}, upserted ${summary.rawJobs.upserted}, skipped ${summary.rawJobs.skipped}, failed ${summary.rawJobs.failed}`);
  console.log("[migrate] Re-run behavior: jobs are upserted by canonical link, and the other tables are upserted by source hash, so reruns should not create duplicates.");
}

main().catch((error) => {
  console.error("[migrate] Fatal error:", error);
  process.exitCode = 1;
});