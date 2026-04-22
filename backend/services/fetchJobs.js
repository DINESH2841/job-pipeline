import axios from "axios";
import crypto from "crypto";
import { env } from "../config/env.js";
import { normalizeText } from "../utils/helpers.js";

const FETCH_TIMEOUT = env.FETCH_TIMEOUT_MS > 0 ? env.FETCH_TIMEOUT_MS : 0;

function toSearchTerms(value, fallback = []) {
  const source = Array.isArray(value)
    ? value
    : String(value || "")
        .split(",")
        .map((item) => item.trim().toLowerCase())
        .filter(Boolean);

  return [...new Set([...source, ...fallback])].filter(Boolean);
}

function getKeywordTerms(pipeline = {}) {
  return toSearchTerms(pipeline.keywords || env.JOB_KEYWORDS, ["software engineer", "embedded engineer"])
    .map((term) => String(term).trim().toLowerCase())
    .filter(Boolean);
}

function getLocationQuery(pipeline = {}) {
  return String(pipeline.searchLocation || env.SEARCH_LOCATION || "India").trim() || "India";
}

function buildSearchQuery(terms = []) {
  return terms.length ? terms.join(" OR ") : "software engineer OR embedded engineer";
}

function extractExperience(desc = "") {
  const match = String(desc).match(/(\d+)\+?\s*(years|yrs)/i);
  return match ? `${match[1]} years` : "0-2 years";
}

function extractSkills(desc = "") {
  const skills = [
    "JavaScript", "TypeScript", "React", "Next", "Node",
    "Express", "MongoDB", "SQL", "AWS", "Docker", "Kubernetes"
  ];
  const lower = String(desc).toLowerCase();
  return skills.filter((skill) => lower.includes(skill.toLowerCase())).join(", ") || "N/A";
}

function cleanLocation(loc) {
  if (!loc) return "Unknown";

  if (typeof loc === "string") {
    const lower = loc.toLowerCase();
    if (lower.includes("chennai")) return "Chennai";
    if (lower.includes("bangalore") || lower.includes("bengaluru")) return "Bangalore";
    if (lower.includes("hyderabad")) return "Hyderabad";
    if (lower.includes("remote")) return "Remote";
    return normalizeText(loc);
  }

  if (typeof loc === "object" && loc !== null) {
    return normalizeText(loc.city || loc.region || "Unknown");
  }

  return "Unknown";
}

function isValidUrl(url) {
  try {
    const u = new URL(String(url || "").trim());
    return u.protocol === "http:" || u.protocol === "https:";
  } catch {
    return false;
  }
}

function getApplyLink(raw) {
  return normalizeText(
    raw.source_link ||
      raw.apply_link ||
      raw.applyUrl ||
      raw.jobUrl ||
      raw.url ||
      raw.link ||
      raw.share_link ||
      ""
  );
}

function createJobId(job) {
  const base = `${job.title || ""}-${job.company || ""}-${job.location || ""}`.toLowerCase();
  return crypto.createHash("md5").update(base).digest("hex");
}

function mapJob(job, fallbackSource = "Unknown") {
  const rawDescription = normalizeText(job.description || job.snippet || job.job_description || job.descriptionText || "");

  const rawTitle = normalizeText(job.title || job.job_title || job.position || "Unknown Role");
  const title = /^[a-f0-9]{32}$/i.test(rawTitle) ? "Unknown Role" : rawTitle;

  const location = cleanLocation(job.location || job.jobLocation || job.detected_extensions?.location);
  const applyLink = getApplyLink(job);

  const mapped = {
    id: String(job.job_id || crypto.randomUUID()),
    timestamp: new Date().toISOString(),
    title,
    company: normalizeText(job.company_name || job.companyName || job.company || job.employer_name || "Unknown"),
    location,
    type: normalizeText(job.detected_extensions?.schedule_type || job.schedule_type || job.employment_type || "N/A"),
    experience: extractExperience(rawDescription),
    skills: extractSkills(rawDescription),
    score: 0,
    group: "General",
    apply_link: applyLink,
    posted_time: normalizeText(job.detected_extensions?.posted_at || job.posted_time || job.postedAt || "N/A"),
    source: normalizeText(job.via || job.source || fallbackSource || "Unknown"),
    description: rawDescription.slice(0, 300),
    raw_json: JSON.stringify(job)
  };

  mapped.id = mapped.id && mapped.id.trim() ? mapped.id : createJobId(mapped);
  mapped.job_id = mapped.id;

  return mapped;
}

async function fetchFromApifyLinkedIn(pipeline = {}) {
  try {
    const defaultInput = {
      keywords: getKeywordTerms(pipeline).join(", "),
      location: getLocationQuery(pipeline),
      ...(env.FETCH_MAX_ITEMS > 0 ? { maxItems: env.FETCH_MAX_ITEMS } : {})
    };

    let data = [];

    const tasksRes = await axios.get("https://api.apify.com/v2/actor-tasks", {
      params: { token: env.APIFY_TOKEN },
      timeout: FETCH_TIMEOUT
    });

    const tasks = tasksRes.data?.data?.items || [];
    const linkedInTask = tasks.find(
      (task) => task.actUsername === "harvestapi" && task.actName === "linkedin-job-search"
    );

    if (linkedInTask?.id) {
      const taskUrl = `https://api.apify.com/v2/actor-tasks/${linkedInTask.id}/run-sync-get-dataset-items?token=${env.APIFY_TOKEN}`;
      const taskRes = await axios.post(taskUrl, defaultInput, { timeout: FETCH_TIMEOUT });
      data = Array.isArray(taskRes.data) ? taskRes.data : [];
    } else {
      const actorUrl = `https://api.apify.com/v2/acts/harvestapi~linkedin-jobs-scraper/run-sync-get-dataset-items?token=${env.APIFY_TOKEN}`;
      const actorRes = await axios.post(actorUrl, defaultInput, { timeout: FETCH_TIMEOUT });
      data = Array.isArray(actorRes.data) ? actorRes.data : [];
    }

    const rows = Array.isArray(data) ? data : [];
    return rows.map((job) => mapJob(job, "LinkedIn"));
  } catch (err) {
    console.error("❌ LinkedIn error:", err.response?.data || err.message);
    return [];
  }
}

async function fetchFromSerpApiIndeed(pipeline = {}) {
  try {
    const keywordTerms = getKeywordTerms(pipeline);
    const keywordQuery = buildSearchQuery(keywordTerms);
    const locationQuery = getLocationQuery(pipeline);

    const allJobs = [];
    let nextPageToken = "";
    const hasFetchLimit = env.FETCH_MAX_ITEMS > 0;
    const maxPages = hasFetchLimit
      ? Math.max(1, Math.ceil(env.FETCH_MAX_ITEMS / 10))
      : Math.max(1, env.SERP_MAX_PAGES);

    for (let page = 0; page < maxPages; page += 1) {
      const { data } = await axios.get("https://serpapi.com/search.json", {
        params: {
          engine: "google_jobs",
          q: keywordQuery,
          location: locationQuery,
          google_domain: "google.com",
          gl: "in",
          hl: "en",
          sort: "date",
          api_key: env.SERPAPI_KEY,
          ...(nextPageToken ? { next_page_token: nextPageToken } : {})
        },
        timeout: FETCH_TIMEOUT
      });

      if (page === 0) {
        console.log("SerpAPI response:", data);
      }

      const pageJobs = Array.isArray(data?.jobs_results) ? data.jobs_results : [];
      allJobs.push(...pageJobs);

      nextPageToken = data?.serpapi_pagination?.next_page_token || "";
      if (!nextPageToken || (hasFetchLimit && allJobs.length >= env.FETCH_MAX_ITEMS)) {
        break;
      }
    }

    const jobs = hasFetchLimit ? allJobs.slice(0, env.FETCH_MAX_ITEMS) : allJobs;
    return jobs.map((job) => mapJob(job, "Indeed"));
  } catch (err) {
    console.error("❌ Indeed error:", err.response?.data || err.message);
    return [];
  }
}

export async function fetchJobs(pipeline = {}) {
  const settled = await Promise.allSettled([fetchFromApifyLinkedIn(pipeline), fetchFromSerpApiIndeed(pipeline)]);

  const jobs = [];
  settled.forEach((result, index) => {
    if (result.status === "fulfilled") {
      jobs.push(...result.value);
    } else {
      const source = index === 0 ? "Apify LinkedIn" : "SerpAPI Indeed";
      console.error(`[fetchJobs] ${source} failed:`, result.reason?.message || result.reason);
    }
  });

  const deduped = [];
  const seen = new Set();
  for (const job of jobs) {
    const key = String(job.apply_link || job.id || job.job_id || `${job.title}|${job.company}|${job.location}`)
      .trim()
      .toLowerCase();
    if (!key || seen.has(key)) continue;
    seen.add(key);
    deduped.push(job);
  }

  return deduped;
}
