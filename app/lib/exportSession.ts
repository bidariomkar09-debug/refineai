import type { DeveloperConfig } from "./developerConfig";
import type { LoopStats } from "./types";

export type ExportSessionData = {
  target: string;
  iterations: import("./types").Iteration[];
  finalOutput: string;
  score: number;
  stats: LoopStats | null;
  config: DeveloperConfig;
  sessionId?: string | null;
  exportedAt: string;
};

export function exportSessionAsJson(data: Omit<ExportSessionData, "exportedAt">): void {
  const payload: ExportSessionData = {
    ...data,
    exportedAt: new Date().toISOString(),
  };

  const blob = new Blob([JSON.stringify(payload, null, 2)], {
    type: "application/json",
  });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = `refineai-session-${Date.now()}.json`;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}
