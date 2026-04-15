import nodemailer from "nodemailer";
import { env } from "../config/env.js";

function groupJobs(jobs) {
  return jobs.reduce(
    (acc, job) => {
      const key = job.group || "Low";
      acc[key] = acc[key] || [];
      acc[key].push(job);
      return acc;
    },
    { High: [], Good: [], Low: [] }
  );
}

function renderGroup(title, jobs) {
  if (!jobs.length) return "";

  const items = jobs
    .map(
      (job) => `
      <li style="margin-bottom:10px;">
        <strong>${job.title}</strong> at ${job.company} (${job.location})
        <br/>
        Score: <strong>${job.score}</strong>
        <br/>
        <a href="${job.apply_link}" target="_blank" rel="noreferrer">Apply</a>
      </li>
    `
    )
    .join("");

  return `
    <h3>${title} (${jobs.length})</h3>
    <ul>${items}</ul>
  `;
}

export async function sendJobAlertEmail(jobs = []) {
  if (!jobs.length) {
    console.log("[mailer] No jobs found, skipping email.");
    return {
      sent: false,
      reason: "no_jobs"
    };
  }

  if (!env.GMAIL_USER || !env.GMAIL_PASS || !env.ALERT_RECIPIENTS) {
    console.warn("[mailer] Missing GMAIL_USER, GMAIL_PASS, or ALERT_RECIPIENTS. Skipping email.");
    return {
      sent: false,
      reason: "missing_mail_config"
    };
  }

  const transporter = nodemailer.createTransport({
    service: "gmail",
    auth: {
      user: env.GMAIL_USER,
      pass: env.GMAIL_PASS
    }
  });

  const grouped = groupJobs(jobs);
  const html = `
    <div style="font-family: Arial, sans-serif; line-height:1.5;">
      <h2>Automated Job Pipeline Alert</h2>
      <p>Total filtered jobs: <strong>${jobs.length}</strong></p>
      ${renderGroup("🔥 High Priority", grouped.High)}
      ${renderGroup("✅ Good Match", grouped.Good)}
      ${renderGroup("🧪 Low Match", grouped.Low)}
      <hr />
      <small>Generated at: ${new Date().toISOString()}</small>
    </div>
  `;

  await transporter.sendMail({
    from: env.GMAIL_USER,
    to: env.ALERT_RECIPIENTS,
    subject: `Job Pipeline Alert: ${jobs.length} matched jobs`,
    html
  });

  console.log("[mailer] Alert email sent.");
  return {
    sent: true,
    reason: "sent"
  };
}
