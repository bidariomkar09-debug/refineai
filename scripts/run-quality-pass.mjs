#!/usr/bin/env node
/**
 * Re-run build loop on all files below FILE_SCORE_THRESHOLD (95).
 * Usage: node scripts/run-quality-pass.mjs [projectId]
 */

const BASE = process.env.REFINEAI_URL ?? "http://localhost:3000";
const THRESHOLD = 95;
const MAX_ITERATIONS = 5;

const projectId = process.argv[2] ?? (await listProjects()).find((p) => p.status === "complete")?.id;

if (!projectId) {
  console.error("No project ID provided and no complete project found.");
  process.exit(1);
}

async function listProjects() {
  const res = await fetch(`${BASE}/api/projects`);
  const data = await res.json();
  return data.projects ?? [];
}

async function getFiles(id) {
  const res = await fetch(`${BASE}/api/projects?id=${id}`);
  const data = await res.json();
  return data.files ?? [];
}

async function rebuildFile(fileId) {
  await fetch(`${BASE}/api/projects`, {
    method: "PATCH",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ projectId, fileId, action: "rebuild" }),
  });

  const res = await fetch(`${BASE}/api/build/file`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ fileId, projectId }),
  });

  if (!res.ok || !res.body) {
    throw new Error(`Build failed for ${fileId}: ${res.status}`);
  }

  const reader = res.body.getReader();
  const decoder = new TextDecoder();
  let buffer = "";
  let lastScore = 0;

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
        if (event.type === "file_complete") lastScore = event.score;
        if (event.type === "round") process.stdout.write(".");
      } catch {
        // skip
      }
    }
  }
  process.stdout.write("\n");
  return lastScore;
}

function subThreshold(files) {
  return files.filter(
    (f) =>
      f.status !== "skipped" &&
      ((f.status === "done" && f.score < THRESHOLD) || f.status === "building")
  );
}

console.log(`Quality pass for project ${projectId} (threshold ${THRESHOLD}%)`);

for (let iteration = 1; iteration <= MAX_ITERATIONS; iteration++) {
  const files = await getFiles(projectId);
  const needsWork = subThreshold(files);

  if (needsWork.length === 0) {
    console.log("\nAll files meet quality threshold.");
    files
      .filter((f) => f.status === "done")
      .sort((a, b) => a.file_path.localeCompare(b.file_path))
      .forEach((f) => console.log(`  ${f.score}%  ${f.file_path}`));
    process.exit(0);
  }

  console.log(`\nPass ${iteration}: ${needsWork.length} file(s) below ${THRESHOLD}%`);

  for (const file of needsWork) {
    process.stdout.write(`  ${file.file_path} (${file.score}%) `);
    const score = await rebuildFile(file.id);
    console.log(`→ ${score}%`);
  }
}

const finalFiles = await getFiles(projectId);
const remaining = subThreshold(finalFiles);
if (remaining.length > 0) {
  console.error("\nSome files still below threshold:");
  remaining.forEach((f) => console.error(`  ${f.score}%  ${f.file_path}`));
  process.exit(1);
}
