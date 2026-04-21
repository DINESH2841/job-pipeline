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

export const env = {
  NODE_ENV: process.env.NODE_ENV || "development",
  OPENAI_BASE_URL: process.env.OPENAI_BASE_URL || "",
  OPENAI_API_KEY: process.env.OPENAI_API_KEY || process.env.OPENROUTER_API_KEY || "",
  OPENAI_MODEL: process.env.OPENAI_MODEL || "gpt-4.1-mini",
  SERPAPI_KEY: process.env.SERPAPI_KEY || "",
  APIFY_TOKEN: process.env.APIFY_TOKEN || "",
  APIFY_LINKEDIN_ACTOR:
    process.env.APIFY_LINKEDIN_ACTOR || "harvestapi/linkedin-jobs-scraper",
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
  JOB_KEYWORDS: (process.env.JOB_KEYWORDS || "software engineer,frontend developer,full stack developer,backend developer,ece engineer,electronics engineer,embedded engineer,firmware engineer,vlsi engineer,hardware engineer").split(",").map(k => k.trim().toLowerCase()).filter(Boolean),
  ROLE_SKILLS: (process.env.ROLE_SKILLS || "node.js,react,javascript,backend,frontend,python,java,express,mongodb,rest api|c,c++,embedded,signal processing,vlsi,circuit design,ece,fpga,asic,rtos,microcontroller,embedded systems,hardware,pcb,iot,arduino,esp32,embedded c,device driver,robotics,control systems,rf,antenna,communication").split("|").map(group => group.split(",").map(s => s.trim().toLowerCase())),
  JOB_LOCATION: process.env.JOB_LOCATION || "India",
  FETCH_TIMEOUT_MS: Number(process.env.FETCH_TIMEOUT_MS || "0"),
  FETCH_MAX_ITEMS: Number(process.env.FETCH_MAX_ITEMS || "100"),
  SERP_MAX_PAGES: Number(process.env.SERP_MAX_PAGES || "50"),
  PREFERRED_LOCATIONS: process.env.PREFERRED_LOCATIONS || "chennai,bangalore,hyderabad,remote,india",
  LOCAL_MIN_SCORE: Number(process.env.LOCAL_MIN_SCORE || "50"),
  LOCAL_MAX_EXPERIENCE_YEARS: Number(process.env.LOCAL_MAX_EXPERIENCE_YEARS || "6"),
  DAYS_TO_KEEP: Number(process.env.DAYS_TO_KEEP || "14"),
  RUN_CRON_LOCALLY: process.env.RUN_CRON_LOCALLY === "true"
};

export function validateCoreEnv() {
  const required = [
    "SERPAPI_KEY",
    "APIFY_TOKEN",
    "GOOGLE_SHEET_ID"
  ];

  const missing = required.filter((key) => !env[key]);
  if (missing.length) {
    throw new Error(`Missing required environment variables: ${missing.join(", ")}`);
  }

  if (!env.OPENAI_API_KEY) {
    throw new Error("Missing required environment variables: OPENAI_API_KEY");
  }

  if (!env.GOOGLE_SERVICE_ACCOUNT_EMAIL || !env.GOOGLE_PRIVATE_KEY) {
    throw new Error(
      "Missing Google service account credentials: GOOGLE_SERVICE_ACCOUNT_EMAIL and/or GOOGLE_PRIVATE_KEY"
    );
  }
}
