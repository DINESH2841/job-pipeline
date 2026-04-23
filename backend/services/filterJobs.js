import OpenAI from "openai";
import { env } from "../config/env.js";
import { safeJsonParse } from "../utils/helpers.js";

const isOpenRouter = /openrouter\.ai/i.test(env.OPENAI_BASE_URL);

const client = new OpenAI({
  apiKey: env.OPENAI_API_KEY,
  ...(env.OPENAI_BASE_URL ? { baseURL: env.OPENAI_BASE_URL } : {}),
  ...(isOpenRouter
    ? {
        defaultHeaders: {
          "HTTP-Referer": env.WEBSITE_URL || "https://dinesh2841.github.io/job-pipeline/",
          "X-Title": "job-pipeline"
        }
      }
    : {})
});

const MASTER_FILTER_PROMPT = `You are a strict job filtering and scoring engine.

Your task:
- Analyze multiple job postings
- Remove irrelevant jobs
- Score each job out of 100
- Return ONLY relevant jobs

You must be strict and reject weak matches.

USER PROFILE:
Experience: 0-1 years
Target Roles: Software Developer, Backend Developer (Node.js), Frontend Developer, Full Stack Developer
Skills: JavaScript, Node.js, React, MongoDB, REST APIs

RULES:
- REJECT if experience > 2 years
- REJECT if title/description contains Senior, Lead, Manager
- REJECT non-technical roles
- KEEP only if at least 2 of these appear strongly: Node.js, React, JavaScript, MongoDB, Backend, Full Stack

SCORING:
- Skill match -> /40
- Keyword match -> /30
- Role relevance -> /20
- Experience fit -> /10

Only return jobs with score >= 60.

Output STRICT JSON (no markdown):
{
  "summary": {
    "input_count": number,
    "selected_count": number,
    "high": number,
    "good": number,
    "low": number
  },
  "jobs": [
    {
      "title": "string",
      "company": "string",
      "location": "string",
      "skills": ["string"],
      "description": "string",
      "apply_link": "string",
      "posted_time": "string",
      "source": "linkedin|indeed|LinkedIn|Indeed",
      "score": number,
      "group": "High|Good|Low",
      "reason": "string"
    }
  ]
}`;

function normalizeModelJson(rawText, fallbackInputCount) {
  const candidates = [];
  candidates.push(rawText);

  const unfenced = rawText
    .replace(/```json\s*/gi, "")
    .replace(/```\s*/g, "")
    .trim();
  if (unfenced !== rawText) candidates.push(unfenced);

  const firstBrace = unfenced.indexOf("{");
  const lastBrace = unfenced.lastIndexOf("}");
  if (firstBrace >= 0 && lastBrace > firstBrace) {
    candidates.push(unfenced.slice(firstBrace, lastBrace + 1));
  }

  let parsed = null;
  for (const candidate of candidates) {
    parsed = safeJsonParse(candidate);
    if (parsed) break;
  }

  if (Array.isArray(parsed)) {
    parsed = { jobs: parsed };
  }

  if (!parsed || !Array.isArray(parsed.jobs)) {
    throw new Error("OpenAI response was not valid JSON with jobs array");
  }

  const summary = parsed.summary || {};
  return {
    summary: {
      input_count: Number(summary.input_count || fallbackInputCount || 0),
      selected_count: Number(summary.selected_count || parsed.jobs.length),
      high: Number(summary.high || parsed.jobs.filter((j) => j.group === "High").length),
      good: Number(summary.good || parsed.jobs.filter((j) => j.group === "Good").length),
      low: Number(summary.low || parsed.jobs.filter((j) => j.group === "Low").length)
    },
    jobs: parsed.jobs
  };
}

export async function filterJobsWithAI(jobs = []) {
  if (!jobs.length) {
    return {
      summary: {
        input_count: 0,
        selected_count: 0,
        high: 0,
        good: 0,
        low: 0
      },
      jobs: []
    };
  }

  const response = await client.chat.completions.create({
    model: env.OPENAI_MODEL,
    temperature: 0.1,
    messages: [
      {
        role: "system",
        content: MASTER_FILTER_PROMPT
      },
      {
        role: "user",
        content: `Evaluate and filter this job list:\n${JSON.stringify(jobs)}`
      }
    ]
  });

  const content = response.choices?.[0]?.message?.content;
  const raw = (typeof content === "string" ? content : "").trim();

  if (!raw) {
    throw new Error("AI provider returned empty response");
  }

  return normalizeModelJson(raw, jobs.length);
}
