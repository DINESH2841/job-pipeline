import cron from "node-cron";
import { validateCoreEnv, env } from "./config/env.js";
import { fetchJobs } from "./services/fetchJobs.js";
import { filterJobsWithAI } from "./services/filterJobs.js";
import {
  saveJobs,
  saveRawData,
  updateHistory,
  getHistorySet,
  getRunId,
  logEvent
} from "./services/supabaseStore.js";
import { sendJobAlertEmail } from "./services/mailer.js";
import { filterOldJobs } from "./utils/helpers.js";

function normalizeLink(value = "") {
  return String(value || "").trim().toLowerCase();
}

function getPipelineLabel(pipeline = {}) {
  return String(pipeline.name || "pipeline").trim().toLowerCase() || "pipeline";
}

function getPipelineKeywords(pipeline = {}) {
  return Array.isArray(pipeline.keywords) ? pipeline.keywords : [];
}

function getPipelineSkills(pipeline = {}) {
  return Array.isArray(pipeline.skills) ? pipeline.skills : [];
}

function localFilter(job, pipeline = {}) {
  const preferredLocations = [
    ...(Array.isArray(pipeline.cities) ? pipeline.cities : []),
    ...(Array.isArray(pipeline.states) ? pipeline.states : [])
  ]
    .map((v) => String(v).trim().toLowerCase())
    .filter(Boolean);

  const title = String(job.title || "").toLowerCase();
  const skills = String(job.skills || "").toLowerCase();
  const description = String(job.description || "").toLowerCase();
  const location = String(job.location || "").toLowerCase();
  const experience = String(job.experience || "").toLowerCase();
  const searchText = [title, skills, description].join(" ");

  const keywordMatch = getPipelineKeywords(pipeline).some((k) => searchText.includes(k))
    || getPipelineSkills(pipeline).flat().some((skill) => searchText.includes(skill));
  const locationMatch = preferredLocations.length
    ? preferredLocations.some((loc) => location.includes(loc)) || location.includes("remote")
    : location.includes("remote") || location.includes("india");
  const expMatch = experience.match(/(\d+)/);
  const expYears = expMatch ? Number(expMatch[1]) : null;
  const experienceOk = expYears === null || expYears <= env.LOCAL_MAX_EXPERIENCE_YEARS;

  return keywordMatch && locationMatch && experienceOk;
}

function scoreJob(job, pipeline = {}) {
  let score = 0;
  const skills = String(job.skills || "").toLowerCase();
  const title = String(job.title || "").toLowerCase();
  const description = String(job.description || "").toLowerCase();
  const searchText = [title, skills, description].join(" ");

  getPipelineSkills(pipeline).forEach((skillGroup) => {
    const matchedSkills = skillGroup.filter((skill) => searchText.includes(skill));
    score += Math.min(matchedSkills.length * 10, 35);
  });

  // Bonus for location
  const location = String(job.location || "").toLowerCase();
  const preferredCities = (Array.isArray(pipeline.cities) ? pipeline.cities : []).map((loc) => String(loc).toLowerCase());
  const preferredStates = (Array.isArray(pipeline.states) ? pipeline.states : []).map((loc) => String(loc).toLowerCase());
  if (location.includes("remote")) score += 20;
  if (preferredCities.some((loc) => location.includes(loc))) score += 15;
  if (preferredStates.some((loc) => location.includes(loc))) score += 10;

  // Experience scoring
  const exp = String(job.experience || "");
  if (exp.includes("0") || exp.includes("1")) score += 20;
  else if (exp.includes("2") || exp.includes("3")) score += 10;
  else score -= 20;

  return score;
}

function groupJob(score) {
  if (score >= 85) return "HIGH";
  if (score >= 70) return "GOOD";
  return "LOW";
}

function normalizeGroup(group) {
  const g = String(group || "").trim().toUpperCase();
  if (g === "HIGH") return "HIGH";
  if (g === "GOOD") return "GOOD";
  return "LOW";
}

function filterJobsForAlert(jobs = []) {
  const threshold = String(env.ALERT_MIN_GROUP || "GOOD").trim().toUpperCase();
  if (threshold === "ALL") return jobs;

  const rank = {
    LOW: 1,
    GOOD: 2,
    HIGH: 3
  };

  const minRank = rank[threshold] || rank.GOOD;
  return jobs.filter((job) => rank[normalizeGroup(job.group)] >= minRank);
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
  const t = String(title || "").trim();
  return Boolean(t && t.length > 5 && !/^[a-f0-9]{32}$/i.test(t));
}

function needsAI(job) {
  return !job.skills || job.skills === "N/A";
}

function tagJobsWithCategory(jobs = [], category = "") {
  return jobs.map((job) => ({
    ...job,
    category: category || job.category || ""
  }));
}

function processJobsLocally(jobs = [], pipeline = {}) {
  return jobs
    .filter((job) => isValidUrl(job.apply_link) && isValidTitle(job.title))
    .filter((job) => localFilter(job, pipeline))
    .map((job) => {
      const score = scoreJob(job, pipeline);
      return {
        ...job,
        score,
        group: groupJob(score)
      };
    })
    .filter((job) => job.score >= env.LOCAL_MIN_SCORE)
    .sort((a, b) => b.score - a.score);
}

async function runPipeline(pipeline = {}, sharedContext = {}) {
  const label = getPipelineLabel(pipeline);
  const run_id = sharedContext.run_id || getRunId();
  const historyApplyLinks = sharedContext.historyApplyLinks || new Set();
  const seenLinks = sharedContext.seenLinks || new Set();

  console.log(`[pipeline:${label}] Starting run...`);
  const startedAt = Date.now();

  try {
    await logEvent({
      run_id,
      level: "info",
      step: `${label}:start`,
      message: `Pipeline started for ${label}`,
      data: { category: label, keywords: getPipelineKeywords(pipeline).length }
    });

    const fetchedJobs = await fetchJobs(pipeline);
    const taggedJobs = tagJobsWithCategory(fetchedJobs, label);
    console.log(`[pipeline:${label}] fetched jobs: ${taggedJobs.length}`);
    await logEvent({
      run_id,
      level: "info",
      step: `${label}:fetch`,
      message: "Jobs fetched",
      data: { count: taggedJobs.length, category: label }
    });

    const recentJobs = filterOldJobs(taggedJobs, env.DAYS_TO_KEEP);
    console.log(`[pipeline:${label}] recent jobs: ${recentJobs.length}`);

    const newJobs = recentJobs.filter((job) => {
      const link = normalizeLink(job.apply_link || job.url || job.link || "");
      if (!link) return false;
      if (historyApplyLinks.has(link)) return false;
      if (seenLinks.has(link)) return false;
      seenLinks.add(link);
      return true;
    });
    console.log(`[pipeline:${label}] history-deduped jobs: ${newJobs.length}`);
    await logEvent({
      run_id,
      level: "info",
      step: `${label}:dedup`,
      message: "Removed duplicates",
      data: { remaining: newJobs.length, category: label }
    });

    let rawRowsInserted = 0;
    try {
      rawRowsInserted = await saveRawData(newJobs);
    } catch (error) {
      await logEvent({
        run_id,
        level: "error",
        step: `${label}:raw`,
        message: error.message,
        data: { category: label }
      });
      throw error;
    }
    console.log(`[pipeline:${label}] raw rows appended: ${rawRowsInserted}`);
    await logEvent({
      run_id,
      level: "info",
      step: `${label}:raw`,
      message: "Raw data stored",
      data: { stored: rawRowsInserted, category: label }
    });

    const locallyProcessed = processJobsLocally(newJobs, pipeline);
    console.log(`[pipeline:${label}] local-selected jobs: ${locallyProcessed.length}`);

    const aiCandidates = locallyProcessed.filter(needsAI);
    let scored = locallyProcessed;

    if (aiCandidates.length) {
      const filtered = await filterJobsWithAI(aiCandidates);
      const aiMap = new Map(
        (filtered.jobs || []).map((j) => [j.id || j.job_id || j.apply_link, j])
      );

      scored = locallyProcessed.map((job) => {
        const aiJob = aiMap.get(job.id || job.job_id || job.apply_link);
        if (!aiJob) return job;

        const mergedScore = Math.max(Number(job.score || 0), Number(aiJob.score || 0));
        return {
          ...job,
          skills: job.skills && job.skills !== "N/A" ? job.skills : (aiJob.skills || job.skills),
          score: mergedScore,
          group: groupJob(mergedScore)
        };
      });
    }

    console.log(`[pipeline:${label}] ai-final jobs: ${scored.length}`);
    await logEvent({
      run_id,
      level: "info",
      step: `${label}:ai`,
      message: "Jobs locally scored (+ optional AI fallback)",
      data: { selected: scored.length, category: label }
    });

    let rowsInserted = 0;
    try {
      rowsInserted = await saveJobs(scored);
    } catch (error) {
      await logEvent({
        run_id,
        level: "error",
        step: `${label}:save`,
        message: error.message,
        data: { category: label }
      });
      throw error;
    }
    console.log(`[pipeline:${label}] rows appended to database: ${rowsInserted}`);
    await logEvent({
      run_id,
      level: "info",
      step: `${label}:save`,
      message: "Jobs saved to database",
      data: { saved: rowsInserted, category: label }
    });

    let historyInserted = 0;
    try {
      historyInserted = await updateHistory(scored);
    } catch (error) {
      await logEvent({
        run_id,
        level: "error",
        step: `${label}:history`,
        message: error.message,
        data: { category: label }
      });
      throw error;
    }
    console.log(`[pipeline:${label}] history links appended: ${historyInserted}`);

    const alertJobs = filterJobsForAlert(scored);

    let emailResult;
    try {
      emailResult = await sendJobAlertEmail(alertJobs);
    } catch (error) {
      await logEvent({
        run_id,
        level: "error",
        step: `${label}:email`,
        message: error.message,
        data: { category: label }
      });
      throw error;
    }
    await logEvent({
      run_id,
      level: "info",
      step: `${label}:email`,
      message: emailResult?.sent ? "Email sent" : "Email skipped",
      data: {
        sent: Boolean(emailResult?.sent),
        reason: emailResult?.reason || "unknown",
        selectedJobs: scored.length,
        alertJobs: alertJobs.length,
        alertMinGroup: String(env.ALERT_MIN_GROUP || "GOOD").toUpperCase(),
        category: label
      }
    });

    const finishedAt = Date.now();
    console.log(`[pipeline:${label}] completed in ${((finishedAt - startedAt) / 1000).toFixed(2)}s`);
    await logEvent({ run_id, level: "info", step: `${label}:completed`, message: "Pipeline completed", data: { category: label } });

    return {
      run_id,
      category: label,
      fetched: fetchedJobs.length,
      recent: recentJobs.length,
      deduped: newJobs.length,
      rawInserted: rawRowsInserted,
      selected: scored.length,
      inserted: rowsInserted,
      historyInserted,
      summary: {
        localSelected: scored.length,
        aiCandidates: aiCandidates.length
      }
    };
  } catch (err) {
    await logEvent({
      run_id,
      level: "error",
      step: `${label}:failure`,
      message: err.message,
      data: { category: label }
    });
    throw err;
  }
}

async function runAllPipelines() {
  const run_id = getRunId();
  const sharedContext = {
    run_id,
    historyApplyLinks: await getHistorySet(),
    seenLinks: new Set()
  };

  const results = [];
  for (const pipeline of env.PIPELINES) {
    const result = await runPipeline(pipeline, sharedContext);
    results.push(result);
  }

  return results;
}

async function main() {
  try {
    validateCoreEnv();

    if (env.RUN_CRON_LOCALLY) {
      console.log("[pipeline] RUN_CRON_LOCALLY=true, scheduler enabled.");
      // 09:00 and 18:00 IST => 03:30 and 12:30 UTC
      cron.schedule("30 3,12 * * *", async () => {
        try {
          await runAllPipelines();
        } catch (error) {
          console.error("[pipeline] Scheduled run failed:", error);
        }
      });

      await runAllPipelines();
      return;
    }

    await runAllPipelines();
  } catch (error) {
    console.error("[pipeline] Fatal error:", error);
    process.exitCode = 1;
  }
}

main();
