import express from "express";
import cors from "cors";
import { spawn } from "node:child_process";

const app = express();
const port = Number(process.env.PORT || 4000);

app.use(cors());
app.use(express.json());

app.get("/health", (_req, res) => {
  res.json({ ok: true, service: "job-pipeline-api" });
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
      cwd: process.cwd(),
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

app.listen(port, () => {
  console.log(`[api] server running on http://localhost:${port}`);
});
