#!/usr/bin/env node
/**
 * Fully autonomous plan → build → quality pass → preview → test.
 * Usage: node scripts/autonomous-build.mjs
 */

const BASE = process.env.REFINEAI_URL ?? "http://localhost:3000";
const PREVIEW_BASE = process.env.PREVIEW_URL ?? "http://localhost:3001";
const THRESHOLD = 95;
const MAX_QUALITY_ITERATIONS = 8;

const IDEA = `Build a Personal AI Assistant web app with these features:
- Schedule and manage daily tasks with priorities (high/medium/low)
- Morning briefing view that summarizes today's schedule every day
- Smart reminders for upcoming tasks
- Natural language AI chat to add, edit, and complete tasks
- Priority management and sorting
- End-of-day summary with completed vs pending tasks
- Habit tracker with daily check-ins and streaks
- Quick notes capture with search

Tech: Next.js 14 App Router, OpenAI GPT-4o for chat, Supabase for persistence (tasks, habits, notes, reminders tables), Tailwind CSS dark theme, fully mobile responsive.
Include all API routes needed for chat, tasks, habits, notes, and daily summary.`;

const log = (...args) => console.log(`[${new Date().toISOString().slice(11, 19)}]`, ...args);

async function waitForServer(maxAttempts = 30) {
  for (let i = 0; i < maxAttempts; i++) {
    try {
      const res = await fetch(`${BASE}/api/health`);
      if (res.ok) {
        const data = await res.json();
        if (data.supabase === "ok") return true;
      }
    } catch {
      // retry
    }
    await sleep(2000);
  }
  throw new Error("RefineAI server not ready");
}

function sleep(ms) {
  return new Promise((r) => setTimeout(r, ms));
}

async function consumeSSE(url, body) {
  const res = await fetch(url, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
  if (!res.ok) throw new Error(`SSE ${url} failed: ${res.status}`);
  if (!res.body) throw new Error("No response body");

  const reader = res.body.getReader();
  const decoder = new TextDecoder();
  let buffer = "";
  const events = [];

  while (true) {
    const { done, value } = await reader.read();
    if (done) break;
    buffer += decoder.decode(value, { stream: true });
    const lines = buffer.split("\n");
    buffer = lines.pop() ?? "";
    for (const line of lines) {
      if (!line.startsWith("data: ")) continue;
      try {
        events.push(JSON.parse(line.slice(6)));
      } catch {
        // skip
      }
    }
  }
  return events;
}

async function planProject() {
  log("Planning Personal AI Assistant...");
  const events = await consumeSSE(`${BASE}/api/plan`, { idea: IDEA });
  const planEvent = events.find((e) => e.type === "plan");
  if (!planEvent?.projectId) throw new Error("Plan failed — no projectId");
  log(`Plan ready: "${planEvent.data?.name}" (${planEvent.data?.files?.length ?? 0} files)`);
  return { projectId: planEvent.projectId, plan: planEvent.data };
}

async function confirmBuild(projectId) {
  const res = await fetch(`${BASE}/api/projects`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ projectId, action: "confirm" }),
  });
  if (!res.ok) throw new Error(`Confirm failed: ${res.status}`);
}

async function getProject(id) {
  const res = await fetch(`${BASE}/api/projects?id=${id}`);
  const data = await res.json();
  return data;
}

async function buildFile(projectId, file) {
  log(`  Building ${file.file_path}...`);
  const events = await consumeSSE(`${BASE}/api/build/file`, {
    fileId: file.id,
    projectId,
  });
  const complete = events.find((e) => e.type === "file_complete");
  const score = complete?.score ?? 0;
  log(`  → ${file.file_path}: ${score}%`);
  return score;
}

async function buildAllFiles(projectId) {
  const { files } = await getProject(projectId);
  const pending = files.filter(
    (f) => f.status !== "skipped" && (f.status !== "done" || f.score < THRESHOLD)
  );
  log(`Building ${pending.length} files...`);
  for (const file of pending.sort((a, b) => a.sort_order - b.sort_order)) {
    await buildFile(projectId, file);
  }
}

async function testApiRoute(code, routePath) {
  const res = await fetch(`${BASE}/api/test/api-route`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ code, routePath }),
  });
  return res.json();
}

async function testBuiltApiRoutes(projectId) {
  const { files } = await getProject(projectId);
  const apiFiles = files.filter(
    (f) => f.file_path.includes("/api/") && f.file_path.endsWith("route.ts") && f.content
  );
  log(`Testing ${apiFiles.length} API route(s)...`);
  for (const file of apiFiles) {
    const result = await testApiRoute(file.content, file.file_path);
    if (!result.passed) {
      log(`  FAIL ${file.file_path} — rebuilding...`);
      await fetch(`${BASE}/api/projects`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ projectId, fileId: file.id, action: "rebuild" }),
      });
      await buildFile(projectId, file);
    } else {
      log(`  OK ${file.file_path}`);
    }
  }
}

async function qualityPass(projectId) {
  for (let i = 1; i <= MAX_QUALITY_ITERATIONS; i++) {
    const { files } = await getProject(projectId);
    const needsWork = files.filter(
      (f) =>
        f.status !== "skipped" &&
        ((f.status === "done" && f.score < THRESHOLD) || f.status === "building" || f.status === "error")
    );
    if (needsWork.length === 0) {
      log("All files meet 95%+ threshold.");
      return true;
    }
    log(`Quality pass ${i}: ${needsWork.length} file(s) below ${THRESHOLD}%`);
    for (const file of needsWork) {
      await fetch(`${BASE}/api/projects`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ projectId, fileId: file.id, action: "rebuild" }),
      });
      await buildFile(projectId, file);
    }
  }
  return false;
}

async function finalizeProject(projectId) {
  const res = await fetch(`${BASE}/api/projects`, {
    method: "PATCH",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ projectId }),
  });
  if (!res.ok) throw new Error(`Finalize failed: ${res.status}`);
  return res.json();
}

async function startPreview(projectId) {
  log("Starting preview on port 3001...");
  const res = await fetch(`${BASE}/api/preview/start`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ projectId }),
  });
  if (!res.ok || !res.body) throw new Error(`Preview start failed: ${res.status}`);

  const reader = res.body.getReader();
  const decoder = new TextDecoder();
  let buffer = "";
  let status = "idle";

  while (true) {
    const { done, value } = await reader.read();
    if (done) break;
    buffer += decoder.decode(value, { stream: true });
    const lines = buffer.split("\n");
    buffer = lines.pop() ?? "";
    for (const line of lines) {
      if (!line.startsWith("data: ")) continue;
      try {
        const event = JSON.parse(line.slice(6));
        if (event.type === "status" && event.data?.status) {
          status = event.data.status;
          if (status === "running") {
            log("Preview is running!");
            return true;
          }
          if (status === "error") {
            log("Preview error:", event.data.error);
            return false;
          }
        }
      } catch {
        // skip
      }
    }
  }
  return status === "running";
}

async function testPreviewApp() {
  await sleep(3000);
  const routes = ["/", "/api/tasks", "/api/chat", "/api/habits", "/api/notes", "/api/summary"];
  const results = {};
  for (const route of routes) {
    try {
      const res = await fetch(`${PREVIEW_BASE}${route}`, {
        method: route.includes("/api/chat") ? "POST" : "GET",
        headers: route.includes("/api/chat") ? { "Content-Type": "application/json" } : {},
        body: route.includes("/api/chat") ? JSON.stringify({ message: "Add task: buy groceries" }) : undefined,
      });
      results[route] = res.status;
      log(`  Preview ${route}: ${res.status}`);
    } catch (e) {
      results[route] = "error";
      log(`  Preview ${route}: error`);
    }
  }
  return results;
}

async function testRefineAIApis() {
  const routes = [
    { path: "/api/health", method: "GET" },
    { path: "/api/projects", method: "GET" },
    { path: "/api/preview/status", method: "GET" },
  ];
  const results = {};
  for (const { path, method } of routes) {
    const res = await fetch(`${BASE}${path}`, { method });
    results[path] = res.status;
    log(`  RefineAI ${path}: ${res.status}`);
  }
  return results;
}

async function printFinalReport(projectId) {
  const { project, files } = await getProject(projectId);
  const done = files.filter((f) => f.status === "done");
  const below = done.filter((f) => f.score < THRESHOLD);
  const avg =
    done.length > 0
      ? Math.round(done.reduce((s, f) => s + f.score, 0) / done.length)
      : 0;

  const report = {
    projectId,
    name: project?.name,
    status: project?.status,
    fileCount: files.length,
    doneCount: done.length,
    avgScore: avg,
    belowThreshold: below.map((f) => ({ path: f.file_path, score: f.score })),
    files: done
      .sort((a, b) => a.file_path.localeCompare(b.file_path))
      .map((f) => ({ path: f.file_path, score: f.score })),
    previewUrl: PREVIEW_BASE,
    refineUrl: BASE,
    completedAt: new Date().toISOString(),
  };

  const fs = await import("fs/promises");
  const path = await import("path");
  const reportPath = path.join(process.cwd(), "BUILD_REPORT.json");
  await fs.writeFile(reportPath, JSON.stringify(report, null, 2));
  log("Report written to BUILD_REPORT.json");
  return report;
}

async function main() {
  log("=== Autonomous Personal AI Assistant Build ===");
  await waitForServer();
  log("RefineAI server ready.");

  const { projectId, plan } = await planProject();
  await confirmBuild(projectId);
  await buildAllFiles(projectId);
  await testBuiltApiRoutes(projectId);
  const qualityOk = await qualityPass(projectId);
  if (!qualityOk) {
    log("WARNING: Some files still below threshold after max iterations.");
  }
  await finalizeProject(projectId);

  log("Testing RefineAI API routes...");
  await testRefineAIApis();

  const previewOk = await startPreview(projectId);
  if (previewOk) {
    log("Testing preview app routes...");
    await testPreviewApp();
  } else {
    log("Preview failed to start — attempting sync/fix...");
    await fetch(`${BASE}/api/preview/sync`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ projectId }),
    });
    await sleep(5000);
    await testPreviewApp();
  }

  const report = await printFinalReport(projectId);
  log("\n=== BUILD COMPLETE ===");
  log(`Project: ${report.name}`);
  log(`Files: ${report.doneCount}/${report.fileCount} | Avg score: ${report.avgScore}%`);
  log(`Preview: ${PREVIEW_BASE}`);
  log(`RefineAI: ${BASE}`);
  if (report.belowThreshold.length > 0) {
    log("Below threshold:", report.belowThreshold);
    process.exit(1);
  }
}

main().catch((err) => {
  console.error("BUILD FAILED:", err);
  process.exit(1);
});
