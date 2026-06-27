import { MAX_ROUNDS, TARGET_SCORE } from "./developerConfig";

export type { DeveloperConfig, AppMode, ModelId } from "./developerConfig";
export { TARGET_SCORE, MAX_ROUNDS };

export type LoopTask = "generate" | "critique" | "refine";

export type LoopStatus =
  | "idle"
  | "generating"
  | "critiquing"
  | "refining"
  | "complete"
  | "stopped"
  | "error";

export type ApiCallSnapshot = {
  model: string;
  temperature: number;
  systemPrompt: string;
  messages: { role: string; content: string }[];
  jsonMode: boolean;
  round: number;
  task: LoopTask;
};

export type TokenUsage = {
  prompt_tokens: number;
  completion_tokens: number;
  total_tokens: number;
};

export type Iteration = {
  round: number;
  task: LoopTask;
  content: string;
  score: number;
  rawJson?: string;
  apiCall?: ApiCallSnapshot;
  tokensUsed?: number;
};

export type LoopTaskResult = {
  output?: string;
  critique?: string;
  score: number;
  rawContent?: string;
  usage?: TokenUsage;
  apiSnapshot?: ApiCallSnapshot;
};

export type LoopEndReason = "target_met" | "stopped" | "max_rounds";

export type LoopStats = {
  totalRounds: number;
  totalTokens: number;
  avgScoreDelta: number;
  timeTakenSec: number;
  model: string;
};

export type LoopResult = {
  iterations: Iteration[];
  finalOutput: string;
  score: number;
  reason: LoopEndReason;
  stats: LoopStats;
};

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
