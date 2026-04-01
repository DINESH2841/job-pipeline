import { google } from "googleapis";
import crypto from "crypto";
import { env } from "../config/env.js";

const RAW_SHEET_NAME = "RawData";
const LOG_SHEET_NAME = "Logs";

function getSheetsClient() {
  const auth = new google.auth.JWT({
    email: env.GOOGLE_SERVICE_ACCOUNT_EMAIL,
    key: env.GOOGLE_PRIVATE_KEY,
    scopes: ["https://www.googleapis.com/auth/spreadsheets"]
  });

  return google.sheets({ version: "v4", auth });
}

function getRunTag() {
  const now = new Date();

  const date = now.toISOString().split("T")[0];
  const hour = now.getHours();

  const slot = hour < 12 ? "morning" : "evening";

  return `${date}_${slot}`;
}

export function getRunId() {
  const now = new Date();
  const date = now.toISOString().split("T")[0];
  const slot = now.getHours() < 12 ? "morning" : "evening";
  return `${date}_${slot}`;
}

async function ensureRawSheet(sheets, spreadsheetId) {
  const header = [
    "timestamp", "title", "company", "location", "type", "experience",
    "skills", "score", "group", "apply_link", "posted_time", "source"
  ];

  try {
    const res = await sheets.spreadsheets.values.get({
      spreadsheetId,
      range: `${RAW_SHEET_NAME}!A1:L1`
    });

    const existing = res.data.values?.[0];
    if (!existing || existing.length === 0) {
      throw new Error("No header");
    }
  } catch {
    try {
      await sheets.spreadsheets.batchUpdate({
        spreadsheetId,
        requestBody: {
          requests: [
            { addSheet: { properties: { title: RAW_SHEET_NAME } } }
          ]
        }
      });
    } catch {
      // If RawData already exists, proceed to header update.
    }

    await sheets.spreadsheets.values.update({
      spreadsheetId,
      range: `${RAW_SHEET_NAME}!A1`,
      valueInputOption: "RAW",
      requestBody: { values: [header] }
    });
  }
}

function makeRawDedupeKey(job = {}) {
  const link = String(job.apply_link || "").trim().toLowerCase();
  if (link) return `link:${link}`;

  const title = String(job.title || "").trim().toLowerCase();
  const company = String(job.company || "").trim().toLowerCase();
  const posted = String(job.posted_time || "").trim().toLowerCase();
  return `fallback:${title}|${company}|${posted}`;
}

async function getExistingRawDedupeKeys(sheets, spreadsheetId) {
  const res = await sheets.spreadsheets.values.get({
    spreadsheetId,
    // B=title, C=company, J=apply_link, K=posted_time
    range: `${RAW_SHEET_NAME}!B2:K`
  });

  const rows = res.data.values || [];
  const existing = new Set();

  for (const row of rows) {
    const title = row[0] || "";
    const company = row[1] || "";
    const apply_link = row[8] || "";
    const posted_time = row[9] || "";
    existing.add(makeRawDedupeKey({ title, company, apply_link, posted_time }));
  }

  return existing;
}

async function ensureSheetHeaders(sheets, spreadsheetId) {
  const header = [
    "timestamp", "title", "company", "location", "type", "experience",
    "skills", "score", "group", "apply_link", "posted_time", "source"
  ];

  const res = await sheets.spreadsheets.values.get({
    spreadsheetId,
    range: `${env.GOOGLE_SHEET_TAB}!A1:L1`
  });

  const existing = res.data.values?.[0];

  if (!existing || existing.length === 0) {
    console.log("⚡ Adding headers...");

    await sheets.spreadsheets.values.update({
      spreadsheetId,
      range: `${env.GOOGLE_SHEET_TAB}!A1`,
      valueInputOption: "RAW",
      requestBody: {
        values: [header]
      }
    });
  } else {
    console.log("✅ Headers already exist");
  }
}

async function ensureHistorySheet(sheets, spreadsheetId) {
  const historyHeader = [
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

  try {
    const res = await sheets.spreadsheets.values.get({
      spreadsheetId,
      range: "History!A1:I1"
    });

    const existing = res.data.values?.[0];
    if (!existing || existing.length === 0) {
      await sheets.spreadsheets.values.update({
        spreadsheetId,
        range: "History!A1:I1",
        valueInputOption: "RAW",
        requestBody: {
          values: [historyHeader]
        }
      });
    } else {
      const normalizedExisting = existing.map((h) => String(h || "").trim().toLowerCase());
      const normalizedTarget = historyHeader.map((h) => h.toLowerCase());
      const headersMatch =
        normalizedExisting.length >= normalizedTarget.length &&
        normalizedTarget.every((h, idx) => normalizedExisting[idx] === h);

      if (!headersMatch) {
        // Safe header upgrade from legacy formats.
        await sheets.spreadsheets.values.update({
          spreadsheetId,
          range: "History!A1:I1",
          valueInputOption: "RAW",
          requestBody: {
            values: [historyHeader]
          }
        });
      }
    }
  } catch {
    console.log("⚡ Creating History sheet...");

    await sheets.spreadsheets.batchUpdate({
      spreadsheetId,
      requestBody: {
        requests: [
          {
            addSheet: {
              properties: { title: "History" }
            }
          }
        ]
      }
    });

    await sheets.spreadsheets.values.update({
      spreadsheetId,
      range: "History!A1:I1",
      valueInputOption: "RAW",
      requestBody: {
        values: [historyHeader]
      }
    });
  }
}

async function ensureLogsSheet(sheets, spreadsheetId) {
  const header = ["timestamp", "run_id", "level", "step", "message", "data"];

  try {
    const res = await sheets.spreadsheets.values.get({
      spreadsheetId,
      range: `${LOG_SHEET_NAME}!A1:F1`
    });

    const existing = res.data.values?.[0];
    if (!existing || existing.length === 0) {
      throw new Error("No header");
    }
  } catch {
    try {
      await sheets.spreadsheets.batchUpdate({
        spreadsheetId,
        requestBody: {
          requests: [{ addSheet: { properties: { title: LOG_SHEET_NAME } } }]
        }
      });
    } catch {
      // If Logs already exists, continue to header write.
    }

    await sheets.spreadsheets.values.update({
      spreadsheetId,
      range: `${LOG_SHEET_NAME}!A1`,
      valueInputOption: "RAW",
      requestBody: { values: [header] }
    });
  }
}

export async function logEvent(log) {
  const sheets = getSheetsClient();
  await ensureLogsSheet(sheets, env.GOOGLE_SHEET_ID);

  const values = [[
    new Date().toISOString(),
    log.run_id || getRunId(),
    log.level || "info",
    log.step || "unknown",
    log.message || "",
    JSON.stringify(log.data || {})
  ]];

  await sheets.spreadsheets.values.append({
    spreadsheetId: env.GOOGLE_SHEET_ID,
    range: `${LOG_SHEET_NAME}!A1`,
    valueInputOption: "USER_ENTERED",
    requestBody: { values }
  });
}

function isValidUrl(url) {
  try {
    const u = new URL(String(url || "").trim());
    return u.protocol === "http:" || u.protocol === "https:";
  } catch {
    return false;
  }
}

function createJobId(job) {
  const base = `${job.title || ""}-${job.company || ""}-${job.location || ""}`.toLowerCase();
  return crypto.createHash("md5").update(base).digest("hex");
}

export async function getHistoryLinks() {
  const sheets = getSheetsClient();
  await ensureHistorySheet(sheets, env.GOOGLE_SHEET_ID);

  const res = await sheets.spreadsheets.values.get({
    spreadsheetId: env.GOOGLE_SHEET_ID,
    range: "History!A:A"
  });

  const links = (res.data.values?.flat() || [])
    .map((v) => String(v).trim())
    .filter(Boolean)
    .filter((v) => v.toLowerCase() !== "job id");

  return new Set(links);
}

export async function getHistorySet() {
  return getHistoryLinks();
}

export async function appendHistoryLinks(jobs = []) {
  if (!jobs.length) return 0;

  const sheets = getSheetsClient();
  await ensureHistorySheet(sheets, env.GOOGLE_SHEET_ID);

  const existingRes = await sheets.spreadsheets.values.get({
    spreadsheetId: env.GOOGLE_SHEET_ID,
    range: "History!A2:D"
  });
  const existingRows = existingRes.data.values || [];
  const existingHistoryKeys = new Set(
    existingRows.map((r) => `${String(r[0] || "").trim().toLowerCase()}|${String(r[3] || "").trim().toLowerCase()}`)
  );
  const batchHistoryKeys = new Set();

  const historyValues = jobs
    .map((j) => {
      // Extract apply_link from various possible fields
      const link = j.apply_link || j.url || j.link || j.jobUrl || "";
      const cleanedLink = String(link).trim();
      const jobId = String(j.id || j.job_id || createJobId(j)).trim();

      if (!jobId || !isValidUrl(cleanedLink)) return null;

      const pairKey = `${jobId.toLowerCase()}|${cleanedLink.toLowerCase()}`;
      if (existingHistoryKeys.has(pairKey) || batchHistoryKeys.has(pairKey)) return null;
      batchHistoryKeys.add(pairKey);

      return [
        jobId,
        String(j.title || "Unknown").trim(),
        String(j.company || "Unknown").trim(),
        cleanedLink,
        "New",
        "",
        "",
        new Date().toISOString(),
        j.source || ""
      ];
    })
    .filter(Boolean);

  if (!historyValues.length) return 0;

  await sheets.spreadsheets.values.append({
    spreadsheetId: env.GOOGLE_SHEET_ID,
    range: "History!A1",
    valueInputOption: "RAW",
    requestBody: { values: historyValues }
  });

  return historyValues.length;
}

export async function updateHistory(jobs = []) {
  return appendHistoryLinks(jobs);
}

export async function appendRawJobsToSheet(jobs = []) {
  if (!jobs.length) return 0;

  const sheets = getSheetsClient();
  await ensureRawSheet(sheets, env.GOOGLE_SHEET_ID);

  const existingKeys = await getExistingRawDedupeKeys(sheets, env.GOOGLE_SHEET_ID);
  const batchKeys = new Set();

  const uniqueJobs = jobs.filter((job) => {
    const key = makeRawDedupeKey(job);
    if (existingKeys.has(key) || batchKeys.has(key)) {
      return false;
    }
    batchKeys.add(key);
    return true;
  });

  if (!uniqueJobs.length) {
    console.log("ℹ️ RawData dedupe: no new unique parsed jobs to append");
    return 0;
  }

  const rawValues = uniqueJobs.map((job) => [
    new Date().toISOString(),
    job.title ?? "",
    job.company ?? "",
    typeof job.location === "string" ? job.location : (job.location?.city || "Unknown"),
    job.type ?? "",
    job.experience ?? "",
    Array.isArray(job.skills) ? job.skills.join(", ") : (job.skills ?? ""),
    Number(job.score ?? 0),
    job.group ?? "Raw",
    job.apply_link ?? "",
    job.posted_time ?? "",
    job.source ?? "Unknown"
  ]);

  await sheets.spreadsheets.values.append({
    spreadsheetId: env.GOOGLE_SHEET_ID,
    range: `${RAW_SHEET_NAME}!A:L`,
    valueInputOption: "USER_ENTERED",
    requestBody: {
      values: rawValues
    }
  });

  console.log(`✅ RawData appended ${rawValues.length} unique rows (from ${jobs.length} parsed jobs)`);
  return rawValues.length;
}

export async function saveRawData(jobs = []) {
  return appendRawJobsToSheet(jobs);
}

// Clean and validate job data before saving to Jobs sheet
function cleanJob(job) {
  // Extract location - handle both string and object formats
  let location = "Unknown";
  if (job.location) {
    if (typeof job.location === "object" && job.location.city) {
      location = job.location.city;
    } else if (typeof job.location === "string") {
      location = job.location;
    }
  }

  // Extract apply_link from various possible fields
  const apply_link = job.apply_link || job.url || job.link || job.jobUrl || "";

  // Trim description to first 300 characters
  const description = job.description ? job.description.slice(0, 300) : "";

  return {
    id: job.id || job.job_id || createJobId(job),
    title: job.title || "Unknown",
    company: job.company || "Unknown",
    location: location,
    type: job.type || "",
    experience: job.experience || "",
    skills: job.skills,
    score: job.score ?? 0,
    group: job.group || "LOW",
    apply_link: apply_link,
    posted_time: job.posted_time || "",
    source: job.source || "Unknown"
  };
}

// Filter out invalid jobs (missing critical fields)
function isValidJob(job) {
  return Boolean((job.id || job.job_id) && isValidUrl(job.apply_link) && job.title && job.title !== "Unknown");
}

export async function appendJobsToSheet(jobs = []) {
  if (!jobs.length) return 0;

  // Clean all jobs
  const cleanedJobs = jobs.map(cleanJob);

  // Filter out invalid jobs
  const validJobs = cleanedJobs.filter(isValidJob);

  if (!validJobs.length) {
    console.log("⚠️  No valid jobs to save after cleaning");
    return 0;
  }

  const sheets = getSheetsClient();
  await ensureSheetHeaders(sheets, env.GOOGLE_SHEET_ID);
  await ensureHistorySheet(sheets, env.GOOGLE_SHEET_ID);

  const existingRes = await sheets.spreadsheets.values.get({
    spreadsheetId: env.GOOGLE_SHEET_ID,
    range: `${env.GOOGLE_SHEET_TAB}!B2:J`
  });
  const existingRows = existingRes.data.values || [];
  const existingJobKeys = new Set(
    existingRows.map((r) => {
      const title = String(r[0] || "").trim().toLowerCase();
      const company = String(r[1] || "").trim().toLowerCase();
      const location = String(r[2] || "").trim().toLowerCase();
      const link = String(r[8] || "").trim().toLowerCase();
      return link ? `link:${link}` : `fallback:${title}|${company}|${location}`;
    })
  );

  const batchKeys = new Set();
  const finalJobs = validJobs.filter((job) => {
    const link = String(job.apply_link || "").trim().toLowerCase();
    const title = String(job.title || "").trim().toLowerCase();
    const company = String(job.company || "").trim().toLowerCase();
    const location = String(job.location || "").trim().toLowerCase();
    const key = link ? `link:${link}` : `fallback:${title}|${company}|${location}`;
    if (existingJobKeys.has(key) || batchKeys.has(key)) return false;
    batchKeys.add(key);
    return true;
  });

  if (!finalJobs.length) {
    console.log("ℹ️ Jobs dedupe: no new unique jobs to append");
    return 0;
  }

  const timestamp = new Date().toISOString();

  const values = finalJobs.map((job) => [
    timestamp,
    job.title,
    job.company,
    job.location,
    job.type,
    job.experience,
    Array.isArray(job.skills) ? job.skills.join(", ") : (job.skills || ""),
    String(job.score),
    job.group,
    job.apply_link,
    job.posted_time,
    job.source
  ]);

  await sheets.spreadsheets.values.append({
    spreadsheetId: env.GOOGLE_SHEET_ID,
    range: `${env.GOOGLE_SHEET_TAB}!A:L`,
    valueInputOption: "USER_ENTERED",
    requestBody: {
      values
    }
  });

  console.log(`✅ Saved ${values.length} clean jobs (filtered from ${jobs.length})`);
  return values.length;
}

export async function saveJobs(jobs = []) {
  return appendJobsToSheet(jobs);
}
