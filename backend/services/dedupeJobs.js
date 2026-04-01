import { normalizeText } from "../utils/helpers.js";

export function dedupeJobs(jobs = []) {
  const applyLinkSeen = new Set();
  const companyTitleSeen = new Set();
  const unique = [];

  for (const job of jobs) {
    const applyLinkKey = normalizeText(job.apply_link).toLowerCase();
    const companyTitleKey = `${normalizeText(job.company).toLowerCase()}::${normalizeText(job.title).toLowerCase()}`;

    if (applyLinkKey && applyLinkKey !== "n/a" && applyLinkSeen.has(applyLinkKey)) {
      continue;
    }

    if (companyTitleSeen.has(companyTitleKey)) {
      continue;
    }

    if (applyLinkKey && applyLinkKey !== "n/a") {
      applyLinkSeen.add(applyLinkKey);
    }

    companyTitleSeen.add(companyTitleKey);
    unique.push(job);
  }

  return unique;
}
