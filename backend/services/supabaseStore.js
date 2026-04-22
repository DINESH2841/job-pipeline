import crypto from "crypto";
import { getSupabaseClient } from "../lib/supabase.js";

const STATUS_OPTIONS = [
  "New",
  "Applied",
  "Assessment",
  "Interview",
  "In Progress",
  "Rejected",
  "Offer"
];

function normalizeText(value = "") {
  return String(value).replace(/\s+/g, " ").trim();
}

function normalizeStatus(status) {
  return STATUS_OPTIONS.includes(status) ? status : "New";
}

function normalizeLink(link = "") {
  const raw = String(link || "").trim();
  if (!raw) return "";

  try {
    const u = new URL(raw);
    u.protocol = u.protocol.toLowerCase();
    u.hostname = u.hostname.toLowerCase();
    return u.toString();
  } catch {
    return raw;
  }
}

function isValidUrl(url) {
  try {
    const u = new URL(String(url || "").trim());
    return u.protocol === "http:" || u.protocol === "https:";
  } catch {
    return false;
  }
}

function isValidTitle(title) {
  const t = normalizeText(title);
  return Boolean(t && t.length > 3 && !/^[a-f0-9]{32}$/i.test(t));
}

function hashObject(input) {
  return crypto.createHash("sha256").update(JSON.stringify(input)).digest("hex");
}

function getRunId() {
  const now = new Date();
  const date = now.toISOString().split("T")[0];
  const slot = now.getHours() < 12 ? "morning" : "evening";
  return `${date}_${slot}`;
}

function chunk(items = [], size = 100) {
  const out = [];
  for (let i = 0; i < items.length; i += size) {
    out.push(items.slice(i, i + size));
  }
  return out;
}

function dedupeBy(items = [], keyFn) {
  const seen = new Set();
  const out = [];

  for (const item of items) {
    const key = String(keyFn(item) || "").trim().toLowerCase();
    if (!key || seen.has(key)) continue;
    seen.add(key);
    out.push(item);
  }

  return out;
}

async function upsertInChunks(table, rows, onConflict, chunkSize = 200) {
  if (!rows.length) return 0;

  const supabase = getSupabaseClient();

  let total = 0;
  const pieces = chunk(rows, chunkSize);

  for (const piece of pieces) {
    const { error } = await supabase
      .from(table)
      .upsert(piece, { onConflict });

    if (error) throw error;
    total += piece.length;
  }

  return total;
}

function normalizeJob(job = {}) {
  const applyLink = normalizeLink(job.apply_link || job.url || job.link || job.jobUrl || "");
  const title = normalizeText(job.title || "");

  if (!isValidUrl(applyLink) || !isValidTitle(title)) return null;

  return {
    title,
    company: normalizeText(job.company || "Unknown"),
    location: normalizeText(typeof job.location === "string" ? job.location : (job.location?.city || "Unknown")) || "Unknown",
    link: applyLink,
    score: Number(job.score || 0),
    job_type: normalizeText(job.type || "") || null,
    experience: normalizeText(job.experience || "") || null,
    skills: Array.isArray(job.skills) ? job.skills.join(", ") : (normalizeText(job.skills || "") || null),
    job_group: normalizeText(job.group || "LOW") || "LOW",
    category: normalizeText(job.category || "") || null,
    posted_time: normalizeText(job.posted_time || "") || null,
    source: normalizeText(job.source || "Unknown") || "Unknown",
    sheet_timestamp: normalizeText(job.timestamp || "") || null,
    description: normalizeText(job.description || "") || null
  };
}

export async function logEvent(log = {}) {
  const supabase = getSupabaseClient();
  const row = {
    run_id: normalizeText(log.run_id || getRunId()),
    run_time: new Date().toISOString(),
    level: normalizeText(log.level || "info") || "info",
    step: normalizeText(log.step || "unknown") || "unknown",
    message: normalizeText(log.message || ""),
    jobs_fetched: Number(log.data?.count || log.data?.fetched || 0) || null,
    jobs_saved: Number(log.data?.saved || log.data?.stored || 0) || null,
    data: log.data || {},
    errors: rowLevelErrors(log),
    source_hash: hashObject({
      run_id: log.run_id || getRunId(),
      level: log.level || "info",
      step: log.step || "unknown",
      message: log.message || "",
      at: new Date().toISOString()
    })
  };

  const { error } = await supabase.from("pipeline_logs").insert(row);
  if (error) throw error;
}

function rowLevelErrors(log = {}) {
  if (String(log.level || "").toLowerCase() !== "error") return [];
  return [{
    step: normalizeText(log.step || "unknown"),
    message: normalizeText(log.message || "Pipeline error")
  }];
}

export async function saveJobs(jobs = []) {
  const normalized = dedupeBy(
    jobs.map(normalizeJob).filter(Boolean),
    (job) => job.link
  );
  if (!normalized.length) return 0;
  return upsertInChunks("jobs", normalized, "link", 200);
}

export async function saveRawData(jobs = []) {
  if (!jobs.length) return 0;

  const rows = jobs.map((job, idx) => {
    const title = normalizeText(job.title || "");
    const company = normalizeText(job.company || "");
    const link = normalizeLink(job.apply_link || job.url || job.link || job.jobUrl || "");

    return {
      sheet_name: "RawData",
      source_row: idx + 2,
      sheet_timestamp: new Date().toISOString(),
      title: title || null,
      company: company || null,
      location: normalizeText(typeof job.location === "string" ? job.location : (job.location?.city || "")) || null,
      job_type: normalizeText(job.type || "") || null,
      experience: normalizeText(job.experience || "") || null,
      skills: Array.isArray(job.skills) ? job.skills.join(", ") : (normalizeText(job.skills || "") || null),
      score: Number(job.score || 0),
      job_group: normalizeText(job.group || "") || null,
      category: normalizeText(job.category || "") || null,
      apply_link: link || null,
      posted_time: normalizeText(job.posted_time || "") || null,
      source: normalizeText(job.source || "Unknown") || "Unknown",
      raw_payload: job,
      source_hash: hashObject({
        title,
        company,
        link,
        posted_time: normalizeText(job.posted_time || ""),
        source: normalizeText(job.source || "Unknown"),
        category: normalizeText(job.category || "") || null
      })
    };
  });

  return upsertInChunks("raw_jobs", dedupeBy(rows, (row) => row.source_hash), "source_hash", 200);
}

export async function getHistorySet() {
  const supabase = getSupabaseClient();
  const { data, error } = await supabase
    .from("applications")
    .select("apply_link");

  if (error) throw error;

  const set = new Set();
  (data || []).forEach((row) => {
    const key = normalizeLink(row.apply_link || "");
    if (key) set.add(key);
  });

  return set;
}

export async function updateHistory(jobs = []) {
  if (!jobs.length) return 0;

  const supabase = getSupabaseClient();

  const links = dedupeBy(jobs
    .map((job) => normalizeLink(job.apply_link || job.url || job.link || job.jobUrl || ""))
    .filter(Boolean), (link) => link);

  if (!links.length) return 0;

  const { data: existingJobs, error: jobsErr } = await supabase
    .from("jobs")
    .select("id, link, title, company, source")
    .in("link", links);

  if (jobsErr) throw jobsErr;

  const byLink = new Map((existingJobs || []).map((j) => [normalizeLink(j.link), j]));

  const rows = dedupeBy(jobs
    .map((job) => {
      const link = normalizeLink(job.apply_link || job.url || job.link || job.jobUrl || "");
      if (!link) return null;

      const found = byLink.get(link);
      const title = normalizeText(found?.title || job.title || "Unknown");
      const company = normalizeText(found?.company || job.company || "Unknown");
      const source = normalizeText(found?.source || job.source || "Unknown");
      const status = "New";

      return {
        job_id: found?.id || null,
        title,
        company,
        apply_link: link,
        status,
        notes: null,
        applied_date: null,
        last_updated: new Date().toISOString(),
        source,
        source_hash: hashObject({ identity: link || `${title}|${company}` })
      };
    })
    .filter(Boolean), (row) => row.source_hash);

  if (!rows.length) return 0;

  return upsertInChunks("applications", rows, "source_hash", 200);
}

export async function markHistoryLinkApplied(input = {}) {
  const supabase = getSupabaseClient();
  const applyLink = normalizeLink(input.apply_link || "");
  if (!isValidUrl(applyLink)) {
    throw new Error("Valid apply_link is required.");
  }

  const now = new Date().toISOString();
  const source = normalizeText(input.source || "") || null;

  const { data: existing, error: fetchErr } = await supabase
    .from("applications")
    .select("id, title, company, source, notes, applied_date")
    .eq("apply_link", applyLink)
    .order("updated_at", { ascending: false })
    .limit(1)
    .maybeSingle();

  if (fetchErr) throw fetchErr;

  if (existing?.id) {
    const { error: updateErr } = await supabase
      .from("applications")
      .update({
        status: "Applied",
        applied_date: existing.applied_date || now,
        last_updated: now,
        source: existing.source || source
      })
      .eq("id", existing.id);

    if (updateErr) throw updateErr;

    return { ok: true, updated: true, id: existing.id };
  }

  const sourceHash = hashObject({ identity: applyLink });

  const { error: insertErr } = await supabase
    .from("applications")
    .upsert({
      job_id: null,
      title: "Unknown",
      company: "Unknown",
      apply_link: applyLink,
      status: "Applied",
      notes: null,
      applied_date: now,
      last_updated: now,
      source,
      source_hash: sourceHash
    }, { onConflict: "source_hash" });

  if (insertErr) throw insertErr;

  return { ok: true, updated: false };
}

export async function updateHistoryEntryFromDashboard(entry = {}) {
  const supabase = getSupabaseClient();
  const id = normalizeText(entry.id || "");
  const applyLink = normalizeLink(entry.apply_link || "");

  let targetId = id;

  if (!targetId && applyLink) {
    const { data, error } = await supabase
      .from("applications")
      .select("id")
      .eq("apply_link", applyLink)
      .order("updated_at", { ascending: false })
      .limit(1)
      .maybeSingle();

    if (error) throw error;
    targetId = data?.id || "";
  }

  if (!targetId) {
    throw new Error("Missing application id for history update.");
  }

  const payload = {
    status: normalizeStatus(normalizeText(entry.status || "New")),
    notes: normalizeText(entry.notes || "") || null,
    applied_date: normalizeText(entry.applied_date || "") || null,
    source: normalizeText(entry.source || "") || null,
    last_updated: new Date().toISOString()
  };

  const { error } = await supabase
    .from("applications")
    .update(payload)
    .eq("id", targetId);

  if (error) throw error;

  return { ok: true, id: targetId };
}

export async function fetchJobsForApi() {
  const supabase = getSupabaseClient();
  const { data, error } = await supabase
    .from("jobs")
    .select("*")
    .order("created_at", { ascending: false });

  if (error) throw error;

  return (data || []).map((row, idx) => ({
    id: row.id,
    rowIndex: idx + 1,
    timestamp: row.sheet_timestamp || row.created_at || "",
    title: row.title || "",
    company: row.company || "",
    location: row.location || "",
    category: row.category || "",
    type: row.job_type || "",
    experience: row.experience || "",
    skills: row.skills ? String(row.skills).split(",").map((s) => s.trim()).filter(Boolean) : [],
    score: Number(row.score || 0),
    group: row.job_group || "",
    apply_link: row.link || "",
    posted_time: row.posted_time || "",
    source: row.source || ""
  }));
}

export async function fetchHistoryForApi() {
  const supabase = getSupabaseClient();
  const { data, error } = await supabase
    .from("applications")
    .select("*")
    .order("updated_at", { ascending: false });

  if (error) throw error;

  return (data || []).map((row, idx) => ({
    id: row.id,
    rowIndex: idx + 1,
    apply_link: row.apply_link || "",
    status: row.status || "New",
    notes: row.notes || "",
    applied_date: row.applied_date || "",
    last_updated: row.last_updated || row.updated_at || "",
    source: row.source || ""
  }));
}

export async function fetchLogsForApi() {
  const supabase = getSupabaseClient();
  const { data, error } = await supabase
    .from("pipeline_logs")
    .select("*")
    .order("run_time", { ascending: false });

  if (error) throw error;

  return (data || []).map((row, idx) => ({
    id: row.id,
    rowIndex: idx + 1,
    timestamp: row.run_time || row.created_at || "",
    run_id: row.run_id || "",
    level: String(row.level || "info").toLowerCase(),
    step: row.step || "",
    message: row.message || "",
    data: JSON.stringify(row.data || {})
  }));
}

export async function fetchRawJobsForApi() {
  const supabase = getSupabaseClient();
  const { data, error } = await supabase
    .from("raw_jobs")
    .select("*")
    .order("created_at", { ascending: false });

  if (error) throw error;

  return (data || []).map((row, idx) => ({
    id: row.id,
    rowIndex: idx + 1,
    timestamp: row.sheet_timestamp || row.created_at || "",
    run_tag: row.source_row ? String(row.source_row) : "",
    title: row.title || "",
    company: row.company || "",
    location: row.location || "",
    category: row.category || "",
    description: row.raw_payload?.description || "",
    apply_link: row.apply_link || "",
    source: row.source || ""
  }));
}

export { getRunId };
