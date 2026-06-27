export type LoopTask = "generate" | "critique" | "refine";

export type LoopStatus =
  | "idle"
  | "generating"
  | "critiquing"
  | "refining"
  | "complete"
  | "stopped"
  | "error";

export type Iteration = {
  round: number;
  task: LoopTask;
  content: string;
  score: number;
};

export type LoopTaskResult = {
  output?: string;
  critique?: string;
  score: number;
};

export type LoopEndReason = "target_met" | "stopped" | "max_rounds";

export type LoopResult = {
  iterations: Iteration[];
  finalOutput: string;
  score: number;
  reason: LoopEndReason;
};

export const MAX_ROUNDS = 12;
export const TARGET_SCORE = 90;

export const STATUS_LABELS: Record<LoopStatus, string> = {
  idle: "Ready",
  generating: "Generating...",
  critiquing: "Critiquing...",
  refining: "Refining...",
  complete: "Complete",
  stopped: "Stopped",
  error: "Error",
};

export const TASK_LABELS: Record<LoopTask, string> = {
  generate: "Generate",
  critique: "Critique",
  refine: "Refine",
};

export type SessionStatus = "running" | "completed" | "stopped";

export type ViewMode = "live" | "history";

export function taskToStatus(task: LoopTask): LoopStatus {
  switch (task) {
    case "generate":
      return "generating";
    case "critique":
      return "critiquing";
    case "refine":
      return "refining";
  }
}
