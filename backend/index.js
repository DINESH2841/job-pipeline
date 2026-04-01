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
} from "./services/sheets.js";
import { sendJobAlertEmail } from "./services/mailer.js";
import { filterOldJobs } from "./utils/helpers.js";

function localFilter(job) {
  const keywords = ["node", "react", "javascript", "full stack", "frontend", "backend"];
  const preferredLocations = env.PREFERRED_LOCATIONS
    .split(",")
    .map((v) => v.trim().toLowerCase())
    .filter(Boolean);

  const title = String(job.title || "").toLowerCase();
  const skills = String(job.skills || "").toLowerCase();
  const location = String(job.location || "").toLowerCase();
  const experience = String(job.experience || "").toLowerCase();

  const keywordMatch = keywords.some((k) => title.includes(k) || skills.includes(k));
  const locationMatch = preferredLocations.some((loc) => location.includes(loc));
  const expMatch = experience.match(/(\d+)/);
  const expYears = expMatch ? Number(expMatch[1]) : null;
  const experienceOk = expYears === null || expYears <= env.LOCAL_MAX_EXPERIENCE_YEARS;

  return keywordMatch && locationMatch && experienceOk;
}

function scoreJob(job) {
  let score = 0;
  const skills = String(job.skills || "").toLowerCase();

  if (skills.includes("react")) score += 20;
  if (skills.includes("node")) score += 20;
  if (skills.includes("javascript")) score += 15;

  if (job.location === "Remote") score += 20;
  if (["Chennai", "Bangalore", "Hyderabad"].includes(job.location)) score += 15;

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

function processJobsLocally(jobs = []) {
  return jobs
    .filter((job) => isValidUrl(job.apply_link) && isValidTitle(job.title))
    .filter(localFilter)
    .map((job) => {
      const score = scoreJob(job);
      return {
        ...job,
        score,
        group: groupJob(score)
      };
    })
    .filter((job) => job.score >= env.LOCAL_MIN_SCORE)
    .sort((a, b) => b.score - a.score);
}

async function runPipeline() {
  console.log("[pipeline] Starting run...");
  const startedAt = Date.now();
  const run_id = getRunId();

  try {
    await logEvent({ run_id, level: "info", step: "start", message: "Pipeline started" });

    const fetchedJobs = await fetchJobs();
    console.log(`[pipeline] fetched jobs: ${fetchedJobs.length}`);
    await logEvent({
      run_id,
      level: "info",
      step: "fetch",
      message: "Jobs fetched",
      data: { count: fetchedJobs.length }
    });

    let rawRowsInserted = 0;
    try {
      rawRowsInserted = await saveRawData(fetchedJobs);
    } catch (error) {
      await logEvent({
        run_id,
        level: "error",
        step: "raw",
        message: error.message,
        data: {}
      });
      throw error;
    }
    console.log(`[pipeline] raw rows appended: ${rawRowsInserted}`);
    await logEvent({
      run_id,
      level: "info",
      step: "raw",
      message: "Raw data stored",
      data: { stored: rawRowsInserted }
    });

    const recentJobs = filterOldJobs(fetchedJobs, env.DAYS_TO_KEEP);
    console.log(`[pipeline] recent jobs: ${recentJobs.length}`);

    const historyJobIds = await getHistorySet();
    // Dedupe strictly by job_id from History sheet
    const dedupedJobs = recentJobs.filter((job) => {
      const id = job.id || job.job_id;
      return id && !historyJobIds.has(id);
    });
    console.log(`[pipeline] history-deduped jobs: ${dedupedJobs.length}`);
    await logEvent({
      run_id,
      level: "info",
      step: "dedup",
      message: "Removed duplicates",
      data: { remaining: dedupedJobs.length }
    });

    const locallyProcessed = processJobsLocally(dedupedJobs);
    console.log(`[pipeline] local-selected jobs: ${locallyProcessed.length}`);

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

    console.log(`[pipeline] ai-final jobs: ${scored.length}`);
    await logEvent({
      run_id,
      level: "info",
      step: "ai",
      message: "Jobs locally scored (+ optional AI fallback)",
      data: { selected: scored.length }
    });

    let rowsInserted = 0;
    try {
      rowsInserted = await saveJobs(scored);
    } catch (error) {
      await logEvent({
        run_id,
        level: "error",
        step: "sheets",
        message: error.message,
        data: {}
      });
      throw error;
    }
    console.log(`[pipeline] rows appended to sheets: ${rowsInserted}`);
    await logEvent({
      run_id,
      level: "info",
      step: "sheets",
      message: "Jobs saved to sheet",
      data: { saved: rowsInserted }
    });

    let historyInserted = 0;
    try {
      historyInserted = await updateHistory(scored);
    } catch (error) {
      await logEvent({
        run_id,
        level: "error",
        step: "history",
        message: error.message,
        data: {}
      });
      throw error;
    }
    console.log(`[pipeline] history links appended: ${historyInserted}`);

    try {
      await sendJobAlertEmail(scored);
    } catch (error) {
      await logEvent({
        run_id,
        level: "error",
        step: "email",
        message: error.message,
        data: {}
      });
      throw error;
    }
    await logEvent({ run_id, level: "info", step: "email", message: "Email sent" });

    const finishedAt = Date.now();
    console.log(`[pipeline] completed in ${((finishedAt - startedAt) / 1000).toFixed(2)}s`);
    await logEvent({ run_id, level: "info", step: "completed", message: "Pipeline completed" });

    return {
      run_id,
      fetched: fetchedJobs.length,
      recent: recentJobs.length,
      deduped: dedupedJobs.length,
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
      step: "failure",
      message: err.message,
      data: {}
    });
    throw err;
  }
}

async function main() {
  try {
    validateCoreEnv();

    if (env.RUN_CRON_LOCALLY) {
      console.log("[pipeline] RUN_CRON_LOCALLY=true, scheduler enabled.");
      // 09:00 and 18:00 IST => 03:30 and 12:30 UTC
      cron.schedule("30 3,12 * * *", async () => {
        try {
          await runPipeline();
        } catch (error) {
          console.error("[pipeline] Scheduled run failed:", error);
        }
      });

      await runPipeline();
      return;
    }

    await runPipeline();
  } catch (error) {
    console.error("[pipeline] Fatal error:", error);
    process.exitCode = 1;
  }
}

main();
