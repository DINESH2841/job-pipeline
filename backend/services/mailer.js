import nodemailer from "nodemailer";
import { env } from "../config/env.js";

function escapeHtml(value) {
  return String(value ?? "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/\"/g, "&quot;")
    .replace(/'/g, "&#039;");
}

function normalizeGroup(group) {
  const g = String(group || "").trim().toUpperCase();
  if (g === "HIGH") return "HIGH";
  if (g === "GOOD") return "GOOD";
  if (g === "LOW") return "LOW";
  return "LOW";
}

function groupJobs(jobs) {
  return jobs.reduce(
    (acc, job) => {
      const key = normalizeGroup(job.group);
      acc[key] = acc[key] || [];
      acc[key].push(job);
      return acc;
    },
    { HIGH: [], GOOD: [], LOW: [] }
  );
}

function topCounts(items, limit = 3) {
  const map = new Map();
  for (const item of items) {
    const key = String(item || "Unknown").trim() || "Unknown";
    map.set(key, (map.get(key) || 0) + 1);
  }

  return [...map.entries()]
    .sort((a, b) => b[1] - a[1])
    .slice(0, limit);
}

function renderStatCard({ label, value, sub }) {
  return `
    <td style="padding:8px; vertical-align:top;">
      <div style="background:#f8fafc; border:1px solid #e2e8f0; border-radius:12px; padding:14px; text-align:center;">
        <div style="font-size:20px; font-weight:700; color:#0f172a;">${escapeHtml(value)}</div>
        <div style="font-size:12px; color:#334155; margin-top:4px;">${escapeHtml(label)}</div>
        ${sub ? `<div style="font-size:11px; color:#64748b; margin-top:4px;">${escapeHtml(sub)}</div>` : ""}
      </div>
    </td>
  `;
}

function renderGroup(title, toneColor, jobs) {
  if (!jobs.length) return "";

  const items = jobs
    .map(
      (job) => `
      <tr>
        <td style="padding:10px 8px; border-bottom:1px solid #e2e8f0;">
          <div style="font-weight:600; color:#0f172a;">${escapeHtml(job.title)}</div>
          <div style="font-size:12px; color:#475569; margin-top:2px;">${escapeHtml(job.company)} • ${escapeHtml(job.location)}</div>
        </td>
        <td style="padding:10px 8px; border-bottom:1px solid #e2e8f0; text-align:center; font-weight:700; color:#0f172a;">${escapeHtml(job.score)}</td>
        <td style="padding:10px 8px; border-bottom:1px solid #e2e8f0; text-align:center; font-size:12px; color:#334155;">${escapeHtml(job.experience || "N/A")}</td>
        <td style="padding:10px 8px; border-bottom:1px solid #e2e8f0; text-align:center; font-size:12px;">
          <a href="${escapeHtml(job.apply_link)}" target="_blank" rel="noreferrer" style="display:inline-block; text-decoration:none; color:#ffffff; background:${toneColor}; border-radius:8px; padding:7px 10px; font-weight:600;">Apply</a>
        </td>
      </tr>
    `
    )
    .join("");

  return `
    <div style="margin-top:18px; border:1px solid #e2e8f0; border-radius:12px; overflow:hidden;">
      <div style="background:${toneColor}; color:#ffffff; padding:10px 14px; font-weight:700;">
        ${escapeHtml(title)} (${jobs.length})
      </div>
      <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="border-collapse:collapse; background:#ffffff;">
        <thead>
          <tr>
            <th style="text-align:left; padding:8px; font-size:12px; color:#475569; background:#f8fafc;">Role</th>
            <th style="text-align:center; padding:8px; font-size:12px; color:#475569; background:#f8fafc;">Score</th>
            <th style="text-align:center; padding:8px; font-size:12px; color:#475569; background:#f8fafc;">Experience</th>
            <th style="text-align:center; padding:8px; font-size:12px; color:#475569; background:#f8fafc;">Action</th>
          </tr>
        </thead>
        <tbody>${items}</tbody>
      </table>
    </div>
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
  const locations = topCounts(jobs.map((job) => job.location));
  const companies = topCounts(jobs.map((job) => job.company));
  const remoteCount = jobs.filter((job) => String(job.location || "").toLowerCase().includes("remote")).length;
  const generatedAt = new Date();
  const websiteUrl = String(env.WEBSITE_URL || "").trim();
  const hasWebsiteLink = /^https?:\/\//i.test(websiteUrl);

  const topLocations = locations.length
    ? locations.map(([name, count]) => `${name} (${count})`).join(", ")
    : "No location data";

  const topCompanies = companies.length
    ? companies.map(([name, count]) => `${name} (${count})`).join(", ")
    : "No company data";

  const text = [
    "Automated Job Pipeline Alert",
    `Total filtered jobs: ${jobs.length}`,
    `High priority: ${grouped.HIGH.length}`,
    `Good matches: ${grouped.GOOD.length}`,
    `Low matches: ${grouped.LOW.length}`,
    `Remote jobs: ${remoteCount}`,
    `Top locations: ${topLocations}`,
    `Top companies: ${topCompanies}`,
    ...(hasWebsiteLink ? [`Website: ${websiteUrl}`] : []),
    "",
    ...jobs.map(
      (job, idx) => `${idx + 1}. ${job.title} at ${job.company} (${job.location}) | Score: ${job.score} | Apply: ${job.apply_link}`
    ),
    "",
    `Generated at: ${generatedAt.toISOString()}`
  ].join("\n");

  const html = `
    <div style="margin:0; padding:24px 0; background:#f1f5f9; font-family:Segoe UI, Arial, sans-serif; color:#0f172a;">
      <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="max-width:780px; margin:0 auto; border-collapse:collapse;">
        <tr>
          <td style="padding:0 14px;">
            <div style="display:none; max-height:0; overflow:hidden; opacity:0; color:transparent;">
              ${jobs.length} matched jobs • ${grouped.HIGH.length} high priority roles ready for quick apply.
            </div>

            <div style="background:linear-gradient(135deg, #0ea5e9 0%, #6366f1 100%); color:#ffffff; border-radius:16px 16px 0 0; padding:20px 22px;">
              <div style="font-size:13px; opacity:0.95;">Daily Job Pipeline Digest</div>
              <div style="font-size:27px; font-weight:800; margin-top:4px;">${jobs.length} matched opportunities</div>
              <div style="font-size:13px; margin-top:8px; opacity:0.95;">
                Generated on ${generatedAt.toLocaleString("en-IN", { dateStyle: "medium", timeStyle: "short" })}
              </div>
            </div>

            <div style="background:#ffffff; border:1px solid #e2e8f0; border-top:none; border-radius:0 0 16px 16px; padding:18px;">
              <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="border-collapse:collapse;">
                <tr>
                  ${renderStatCard({ label: "High Priority", value: grouped.HIGH.length })}
                  ${renderStatCard({ label: "Good Matches", value: grouped.GOOD.length })}
                  ${renderStatCard({ label: "Low Matches", value: grouped.LOW.length })}
                  ${renderStatCard({ label: "Remote Roles", value: remoteCount })}
                </tr>
              </table>

              <div style="margin-top:16px; background:#f8fafc; border:1px solid #e2e8f0; border-radius:12px; padding:12px 14px;">
                <div style="font-size:13px; color:#334155;"><strong>Top Locations:</strong> ${escapeHtml(topLocations)}</div>
                <div style="font-size:13px; color:#334155; margin-top:6px;"><strong>Top Companies:</strong> ${escapeHtml(topCompanies)}</div>
                ${hasWebsiteLink
    ? `<div style="margin-top:10px;">
                     <a href="${escapeHtml(websiteUrl)}" target="_blank" rel="noreferrer" style="display:inline-block; text-decoration:none; color:#ffffff; background:#0f172a; border-radius:10px; padding:8px 12px; font-size:12px; font-weight:700;">🌐 Open Website</a>
                     <div style="font-size:11px; color:#64748b; margin-top:6px; word-break:break-all;">${escapeHtml(websiteUrl)}</div>
                   </div>`
    : ""}
              </div>

              ${renderGroup("🔥 High Priority", "#dc2626", grouped.HIGH)}
              ${renderGroup("✅ Good Match", "#2563eb", grouped.GOOD)}
              ${renderGroup("🧪 Low Match", "#64748b", grouped.LOW)}

              <div style="margin-top:16px; font-size:12px; color:#64748b; border-top:1px dashed #cbd5e1; padding-top:12px;">
                Tip: Apply to high-priority roles first for the best conversion. 🚀
              </div>
            </div>
          </td>
        </tr>
      </table>
    </div>
  `;

  await transporter.sendMail({
    from: env.GMAIL_USER,
    to: env.ALERT_RECIPIENTS,
    subject: `Job Pipeline Alert: ${jobs.length} matched jobs | High: ${grouped.HIGH.length}`,
    text,
    html
  });

  console.log("[mailer] Alert email sent.");
  return {
    sent: true,
    reason: "sent"
  };
}
