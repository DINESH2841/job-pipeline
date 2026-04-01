export function normalizeText(value = "") {
  return String(value).replace(/\s+/g, " ").trim();
}

export function toArray(value) {
  if (Array.isArray(value)) return value;
  if (!value) return [];
  if (typeof value === "string") {
    return value
      .split(/[|,]/)
      .map((item) => item.trim())
      .filter(Boolean);
  }
  return [];
}

export function isRecentPost(postedTime, days = 14) {
  if (!postedTime) return true;

  const text = normalizeText(postedTime).toLowerCase();
  const directDate = Date.parse(postedTime);
  if (!Number.isNaN(directDate)) {
    const ageInDays = (Date.now() - directDate) / (1000 * 60 * 60 * 24);
    return ageInDays <= days;
  }

  const match = text.match(/(\d+)\s*(hour|day|week|month)/);
  if (!match) return true;

  const amount = Number(match[1]);
  const unit = match[2];

  let ageDays = amount;
  if (unit === "hour") ageDays = amount / 24;
  if (unit === "week") ageDays = amount * 7;
  if (unit === "month") ageDays = amount * 30;

  return ageDays <= days;
}

export function filterOldJobs(jobs, days = 14) {
  return jobs.filter((job) => isRecentPost(job.posted_time, days));
}

export function extractSkills(text = "") {
  const skillBank = [
    "javascript",
    "typescript",
    "react",
    "node",
    "express",
    "python",
    "django",
    "flask",
    "sql",
    "mongodb",
    "aws",
    "docker",
    "kubernetes",
    "rest",
    "graphql",
    "tailwind",
    "next.js",
    "git"
  ];

  const lower = String(text).toLowerCase();
  return skillBank.filter((skill) => lower.includes(skill));
}

export function chunk(items, size) {
  const out = [];
  for (let i = 0; i < items.length; i += size) {
    out.push(items.slice(i, i + size));
  }
  return out;
}

export function safeJsonParse(input) {
  try {
    return JSON.parse(input);
  } catch {
    return null;
  }
}
