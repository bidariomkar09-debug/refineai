import {
  FILE_SCORE_THRESHOLD,
  meetsQualityThreshold,
  type DbFile,
  type ProjectPlan,
  type SSEEvent,
} from "./agentTypes";
import { fetchStream } from "./streamClient";
import { USER_MESSAGES } from "./userMessages";

export type OrchestratorCallbacks = {
  onStatus: (message: string) => void;
  onFileStart: (file: DbFile) => void;
  onRound: (fileId: string, round: SSEEvent & { type: "round" }) => void;
  onFileComplete: (fileId: string, score: number) => void;
  onComplete: (summaryPlan: ProjectPlan) => void;
};

export type OrchestratorControls = {
  pause: () => void;
  resume: () => void;
  skipCurrent: () => void;
  isPaused: () => boolean;
};

const QUALITY_PASS_MAX_ITERATIONS = 5;

async function fetchProjectFiles(projectId: string): Promise<DbFile[]> {
  const res = await fetch(`/api/projects?id=${projectId}`);
  const data = await res.json();
  return (data.files ?? []) as DbFile[];
}

function getSubThresholdFiles(files: DbFile[]): DbFile[] {
  return files.filter(
    (f) =>
      f.status !== "skipped" &&
      ((f.status === "done" && !meetsQualityThreshold(f.score)) ||
        f.status === "building")
  );
}

async function rebuildFile(
  projectId: string,
  file: DbFile,
  callbacks: Pick<
    OrchestratorCallbacks,
    "onStatus" | "onFileStart" | "onRound" | "onFileComplete"
  >,
  signal?: AbortSignal
): Promise<void> {
  await fetch("/api/projects", {
    method: "PATCH",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ projectId, fileId: file.id, action: "rebuild" }),
  });

  callbacks.onFileStart(file);

  await fetchStream(
    "/api/build/file",
    { fileId: file.id, projectId },
    (event) => {
      if (event.type === "status") {
        callbacks.onStatus(event.message);
      } else if (event.type === "round") {
        callbacks.onRound(file.id, event);
      } else if (event.type === "file_complete") {
        callbacks.onFileComplete(event.fileId, event.score);
      }
    },
    signal
  );
}

export async function runQualityPass(
  projectId: string,
  callbacks: Pick<
    OrchestratorCallbacks,
    "onStatus" | "onFileStart" | "onRound" | "onFileComplete"
  >,
  signal?: AbortSignal
): Promise<boolean> {
  for (let iteration = 0; iteration < QUALITY_PASS_MAX_ITERATIONS; iteration++) {
    if (signal?.aborted) return false;

    const freshFiles = await fetchProjectFiles(projectId);
    const subThreshold = getSubThresholdFiles(freshFiles);

    if (subThreshold.length === 0) {
      return freshFiles.every(
        (f) =>
          f.status === "skipped" ||
          (f.status === "done" && meetsQualityThreshold(f.score))
      );
    }

    callbacks.onStatus(USER_MESSAGES.fixing);

    for (const file of subThreshold) {
      if (signal?.aborted) return false;
      await rebuildFile(projectId, file, callbacks, signal);
    }
  }

  const finalFiles = await fetchProjectFiles(projectId);
  return finalFiles.every(
    (f) =>
      f.status === "skipped" ||
      (f.status === "done" && meetsQualityThreshold(f.score))
  );
}

export function startBuild(
  projectId: string,
  files: DbFile[],
  callbacks: OrchestratorCallbacks,
  signal?: AbortSignal
): OrchestratorControls {
  let paused = false;
  let skipCurrent = false;
  let pauseResolve: (() => void) | null = null;

  const waitIfPaused = () =>
    new Promise<void>((resolve) => {
      if (!paused) {
        resolve();
        return;
      }
      pauseResolve = resolve;
    });

  const apiFiles = files.filter(
    (f) => f.file_path.includes("/api/") && f.file_path.endsWith("route.ts")
  );

  (async () => {
    for (const file of files) {
      if (signal?.aborted) break;
      if (file.status === "skipped") continue;
      if (file.status === "done" && meetsQualityThreshold(file.score)) continue;

      await waitIfPaused();
      if (skipCurrent) {
        skipCurrent = false;
        await fetch(`/api/projects`, {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ projectId, fileId: file.id, action: "skip" }),
        });
        continue;
      }

      callbacks.onFileStart(file);

      await fetchStream(
        "/api/build/file",
        { fileId: file.id, projectId },
        (event) => {
          if (event.type === "status") {
            callbacks.onStatus(event.message);
          } else if (event.type === "round") {
            callbacks.onRound(file.id, event);
          } else if (event.type === "file_complete") {
            callbacks.onFileComplete(event.fileId, event.score);
          }
        },
        signal
      );
    }

    if (signal?.aborted) return;

    callbacks.onStatus(USER_MESSAGES.testing);
    for (const apiFile of apiFiles) {
      if (signal?.aborted) break;

      const freshFiles = await fetchProjectFiles(projectId);
      const built = freshFiles.find((f) => f.id === apiFile.id);
      if (!built?.content) continue;

      const testResult = await fetch("/api/test/api-route", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          code: built.content,
          routePath: apiFile.file_path,
        }),
      }).then((r) => r.json());

      if (!testResult.passed) {
        callbacks.onStatus(USER_MESSAGES.fixing);
        await rebuildFile(projectId, apiFile, callbacks, signal);
      }
    }

    if (signal?.aborted) return;

    try {
      await fetch("/api/projects/wire-app", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ projectId }),
      });
    } catch {
      // preview wiring is best-effort
    }

    await runQualityPass(projectId, callbacks, signal);

    if (signal?.aborted) return;

    callbacks.onStatus(USER_MESSAGES.almostDone);

    const summaryRes = await fetch("/api/projects", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ projectId }),
    });

    if (!summaryRes.ok) {
      callbacks.onStatus(USER_MESSAGES.fixing);
      await runQualityPass(projectId, callbacks, signal);
      const retryRes = await fetch("/api/projects", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ projectId }),
      });
      if (!retryRes.ok) return;
      const retryData = await retryRes.json();
      const summaryPlan = (retryData.plan ?? {}) as ProjectPlan;
      callbacks.onStatus(USER_MESSAGES.complete);
      callbacks.onComplete(summaryPlan);
      return;
    }

    const summaryData = await summaryRes.json();
    const summaryPlan = (summaryData.plan ?? {}) as ProjectPlan;

    callbacks.onStatus(USER_MESSAGES.complete);
    callbacks.onComplete(summaryPlan);
  })();

  return {
    pause: () => {
      paused = true;
      fetch("/api/projects", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ projectId, status: "paused" }),
      }).catch(() => {});
    },
    resume: () => {
      paused = false;
      pauseResolve?.();
      pauseResolve = null;
      fetch("/api/projects", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ projectId, status: "building" }),
      }).catch(() => {});
    },
    skipCurrent: () => {
      skipCurrent = true;
    },
    isPaused: () => paused,
  };
}

export { meetsQualityThreshold };
