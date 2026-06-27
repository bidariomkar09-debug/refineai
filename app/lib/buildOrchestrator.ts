import type { DbFile, ProjectPlan, SSEEvent } from "./agentTypes";
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
      if (file.status === "skipped" || file.status === "done") continue;

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

      callbacks.onStatus(USER_MESSAGES.buildingFile(file.file_name));
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

      const res = await fetch(`/api/projects?id=${projectId}`);
      const data = await res.json();
      const freshFiles = (data.files ?? []) as DbFile[];
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
        await fetchStream(
          "/api/build/file",
          { fileId: apiFile.id, projectId },
          (event) => {
            if (event.type === "status") callbacks.onStatus(event.message);
            else if (event.type === "round") callbacks.onRound(apiFile.id, event);
          },
          signal
        );
      }
    }

    if (signal?.aborted) return;

    callbacks.onStatus(USER_MESSAGES.almostDone);

    const summaryRes = await fetch("/api/projects", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ projectId }),
    });
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
