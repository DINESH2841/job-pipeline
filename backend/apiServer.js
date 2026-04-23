import express from "express";
import cors from "cors";
import { spawn } from "node:child_process";
import { fileURLToPath } from "node:url";
import path from "node:path";
import {
  fetchHistoryForApi,
  fetchJobsForApi,
  fetchLogsForApi,
  fetchRawJobsForApi,
  markHistoryLinkApplied,
  updateHistoryEntryFromDashboard
} from "./services/supabaseStore.js";

const app = express();
const port = Number(process.env.PORT || 4000);
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Configure CORS for production
const allowedOrigins = process.env.CORS_ORIGIN 
  ? process.env.CORS_ORIGIN.split(',').map(origin => origin.trim())
  : ['http://localhost:5173', 'http://localhost:3000'];

app.use(cors({
  origin: (origin, callback) => {
    if (!origin || allowedOrigins.includes(origin) || process.env.NODE_ENV !== 'production') {
      callback(null, true);
    } else {
      callback(new Error('CORS not allowed'));
    }
  },
  credentials: true
}));

app.use(express.json());

app.get("/health", (_req, res) => {
  res.json({ ok: true, service: "job-pipeline-api" });
});

app.get("/api/jobs", async (_req, res) => {
  try {
    const data = await fetchJobsForApi();
    return res.json(data);
  } catch (error) {
    return res.status(500).json({
      ok: false,
      error: { message: error.message || "Failed to fetch jobs" }
    });
  }
});

app.get("/api/history", async (_req, res) => {
  try {
    const data = await fetchHistoryForApi();
    return res.json(data);
  } catch (error) {
    return res.status(500).json({
      ok: false,
      error: { message: error.message || "Failed to fetch history" }
    });
  }
});

app.get("/api/logs", async (_req, res) => {
  try {
    const data = await fetchLogsForApi();
    return res.json(data);
  } catch (error) {
    return res.status(500).json({
      ok: false,
      error: { message: error.message || "Failed to fetch logs" }
    });
  }
});

app.get("/api/raw-data", async (_req, res) => {
  try {
    const data = await fetchRawJobsForApi();
    return res.json(data);
  } catch (error) {
    return res.status(500).json({
      ok: false,
      error: { message: error.message || "Failed to fetch raw data" }
    });
  }
});

let isRunning = false;

app.post("/api/pipeline/run", async (_req, res) => {
  if (isRunning) {
    return res.status(409).json({
      ok: false,
      error: "Pipeline run already in progress"
    });
  }

  isRunning = true;
  const startedAt = Date.now();

  try {
    const child = spawn("node", ["index.js"], {
      cwd: __dirname,
      shell: true,
      env: process.env
    });

    let stdout = "";
    let stderr = "";

    child.stdout.on("data", (chunk) => {
      stdout += chunk.toString();
    });

    child.stderr.on("data", (chunk) => {
      stderr += chunk.toString();
    });

    const code = await new Promise((resolve) => {
      child.on("close", resolve);
    });

    const durationMs = Date.now() - startedAt;

    if (code !== 0) {
      return res.status(500).json({
        ok: false,
        code,
        durationMs,
        message: "Pipeline execution failed",
        stderr: stderr.slice(-4000)
      });
    }

    return res.json({
      ok: true,
      code,
      durationMs,
      message: "Pipeline execution completed",
      output: stdout.slice(-4000)
    });
  } catch (error) {
    return res.status(500).json({
      ok: false,
      message: error.message || "Failed to start pipeline"
    });
  } finally {
    isRunning = false;
  }
});

app.post("/api/history/mark-applied", async (req, res) => {
  try {
    const result = await markHistoryLinkApplied(req.body || {});
    return res.json(result);
  } catch (error) {
    return res.status(400).json({
      ok: false,
      error: {
        message: error.message || "Failed to mark job as applied"
      }
    });
  }
});

app.post("/api/history/update", async (req, res) => {
  try {
    const result = await updateHistoryEntryFromDashboard(req.body || {});
    return res.json(result);
  } catch (error) {
    return res.status(400).json({
      ok: false,
      error: {
        message: error.message || "Failed to update history row"
      }
    });
  }
});

app.post("/api/applications", async (req, res) => {
  try {
    const result = await markHistoryLinkApplied(req.body || {});
    return res.json(result);
  } catch (error) {
    return res.status(400).json({
      ok: false,
      error: {
        message: error.message || "Failed to create application"
      }
    });
  }
});

app.listen(port, () => {
  console.log(`[api] server running on http://localhost:${port}`);
});
