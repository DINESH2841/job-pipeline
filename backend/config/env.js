import dotenv from "dotenv";
import path from "path";
import { fileURLToPath } from "url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Load .env only for local/dev runs. In CI (GitHub Actions), rely on repository secrets.
if (process.env.CI !== "true") {
  dotenv.config({ path: path.resolve(__dirname, "../../.env") });
  dotenv.config({ path: path.resolve(__dirname, "../.env") });
}

const rawGooglePrivateKey = process.env.GOOGLE_PRIVATE_KEY
  ? process.env.GOOGLE_PRIVATE_KEY
  : (process.env.GOOGLE_API_KEY || "").includes("BEGIN PRIVATE KEY")
    ? process.env.GOOGLE_API_KEY || ""
    : "";

function splitCsv(value, fallback = []) {
  const source = Array.isArray(value)
    ? value
    : String(value || "")
        .split(",")
        .map((item) => item.trim())
        .filter(Boolean);

  const items = source.length ? source : fallback;
  return [...new Set(items)]
    .map((item) => String(item).trim())
    .filter(Boolean);
}

function splitSkillGroups(value, fallback = []) {
  const raw = String(value || "").trim();
  const groups = raw
    ? raw.split("|")
    : fallback.map((group) => (Array.isArray(group) ? group.join(",") : String(group || "")));

  return groups
    .map((group) => group
      .split(",")
      .map((skill) => skill.trim().toLowerCase())
      .filter(Boolean))
    .filter((group) => group.length);
}

function buildPipeline(prefix, defaults) {
  return {
    name: defaults.name,
    keywords: splitCsv(process.env[`${prefix}_JOB_KEYWORDS`] || process.env.JOB_KEYWORDS || "", defaults.keywords).map((term) => term.toLowerCase()),
    skills: splitSkillGroups(process.env[`${prefix}_ROLE_SKILLS`] || process.env.ROLE_SKILLS || "", [defaults.skills]),
    cities: splitCsv(process.env.JOB_LOCATION || "", defaults.cities),
    states: splitCsv(process.env.ALLOWED_STATES || "", defaults.states)
  };
}

const SOFTWARE_DEFAULTS = {
  name: "software",
  keywords: ["software engineer", "frontend developer", "backend developer", "full stack developer"],
  skills: ["node.js", "react", "javascript", "python", "java", "express", "mongodb", "rest api"],
  cities: ["Chennai", "Bangalore", "Hyderabad", "Vijayawada", "Visakhapatnam", "Coimbatore", "Mysore"],
  states: ["Tamil Nadu", "Andhra Pradesh", "Telangana", "Karnataka"]
};

const EMBEDDED_DEFAULTS = {
  name: "embedded",
  keywords: ["embedded engineer", "embedded systems engineer", "firmware engineer", "iot engineer", "embedded developer"],
  skills: ["c", "c++", "embedded", "rtos", "microcontroller", "esp32", "arduino", "embedded c", "device driver", "iot"],
  cities: SOFTWARE_DEFAULTS.cities,
  states: SOFTWARE_DEFAULTS.states
};

const HARDWARE_DEFAULTS = {
  name: "hardware",
  keywords: ["vlsi engineer", "fpga engineer", "asic engineer", "design verification engineer", "physical design engineer"],
  skills: ["vlsi", "verilog", "vhdl", "systemverilog", "asic", "fpga", "physical design", "analog design", "digital design"],
  cities: SOFTWARE_DEFAULTS.cities,
  states: SOFTWARE_DEFAULTS.states
};

export const env = {
  NODE_ENV: process.env.NODE_ENV || "development",
  OPENAI_BASE_URL: process.env.OPENAI_BASE_URL || "",
  OPENAI_API_KEY: process.env.OPENAI_API_KEY || process.env.OPENROUTER_API_KEY || "",
  OPENAI_MODEL: process.env.OPENAI_MODEL || "gpt-4.1-mini",
  SERPAPI_KEY: process.env.SERPAPI_KEY || "",
  APIFY_TOKEN: process.env.APIFY_TOKEN || "",
  APIFY_LINKEDIN_ACTOR:
    process.env.APIFY_LINKEDIN_ACTOR || "harvestapi/linkedin-jobs-scraper",
  SUPABASE_URL: process.env.SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL || "",
  SUPABASE_SERVICE_ROLE_KEY: process.env.SUPABASE_SERVICE_ROLE_KEY || "",
  GOOGLE_SHEET_ID: process.env.GOOGLE_SHEET_ID || "",
  GOOGLE_API_KEY: process.env.GOOGLE_API_KEY || "",
  GOOGLE_SERVICE_ACCOUNT_EMAIL: process.env.GOOGLE_SERVICE_ACCOUNT_EMAIL || "",
  GOOGLE_PRIVATE_KEY: rawGooglePrivateKey.replace(/\\n/g, "\n"),
  GOOGLE_SHEET_TAB: process.env.GOOGLE_SHEET_TAB || "Jobs",
  GMAIL_USER: process.env.GMAIL_USER || "",
  GMAIL_PASS: process.env.GMAIL_PASS || "",
  ALERT_RECIPIENTS: process.env.ALERT_RECIPIENTS || "",
  ALERT_MIN_GROUP: process.env.ALERT_MIN_GROUP || "GOOD",
  WEBSITE_URL: process.env.WEBSITE_URL || "https://dinesh2841.github.io/job-pipeline/",
  PIPELINES: [
    buildPipeline("SW", SOFTWARE_DEFAULTS),
    buildPipeline("EM", EMBEDDED_DEFAULTS),
    buildPipeline("HW", HARDWARE_DEFAULTS)
  ],
  SEARCH_LOCATION: process.env.SEARCH_LOCATION || "India",
  JOB_KEYWORDS: Array.from(new Set([
    ...SOFTWARE_DEFAULTS.keywords,
    ...EMBEDDED_DEFAULTS.keywords,
    ...HARDWARE_DEFAULTS.keywords,
    ...splitCsv(process.env.JOB_KEYWORDS || "", [])
  ])),
  ROLE_SKILLS: [
    ...splitSkillGroups(process.env.SW_ROLE_SKILLS || process.env.ROLE_SKILLS || "", [SOFTWARE_DEFAULTS.skills]),
    ...splitSkillGroups(process.env.EM_ROLE_SKILLS || process.env.ROLE_SKILLS || "", [EMBEDDED_DEFAULTS.skills]),
    ...splitSkillGroups(process.env.HW_ROLE_SKILLS || process.env.ROLE_SKILLS || "", [HARDWARE_DEFAULTS.skills])
  ],
  JOB_LOCATION: splitCsv(process.env.JOB_LOCATION || "", SOFTWARE_DEFAULTS.cities).join(","),
  ALLOWED_STATES: splitCsv(process.env.ALLOWED_STATES || "", SOFTWARE_DEFAULTS.states).join(","),
  FETCH_TIMEOUT_MS: Number(process.env.FETCH_TIMEOUT_MS || "0"),
  FETCH_MAX_ITEMS: Number(process.env.FETCH_MAX_ITEMS || "100"),
  SERP_MAX_PAGES: Number(process.env.SERP_MAX_PAGES || "50"),
  PREFERRED_LOCATIONS: process.env.PREFERRED_LOCATIONS || [
    ...splitCsv(process.env.JOB_LOCATION || "", SOFTWARE_DEFAULTS.cities),
    ...splitCsv(process.env.ALLOWED_STATES || "", SOFTWARE_DEFAULTS.states),
    "remote",
    "india"
  ].join(","),
  LOCAL_MIN_SCORE: Number(process.env.LOCAL_MIN_SCORE || "50"),
  LOCAL_MAX_EXPERIENCE_YEARS: Number(process.env.LOCAL_MAX_EXPERIENCE_YEARS || "6"),
  DAYS_TO_KEEP: Number(process.env.DAYS_TO_KEEP || "14"),
  RUN_CRON_LOCALLY: process.env.RUN_CRON_LOCALLY === "true"
};

export function validateCoreEnv() {
  const required = [
    "SERPAPI_KEY",
    "APIFY_TOKEN",
    "SUPABASE_URL",
    "SUPABASE_SERVICE_ROLE_KEY"
  ];

  const missing = required.filter((key) => !env[key]);
  if (missing.length) {
    throw new Error(`Missing required environment variables: ${missing.join(", ")}`);
  }

  if (!env.OPENAI_API_KEY) {
    throw new Error("Missing required environment variables: OPENAI_API_KEY");
  }

}
