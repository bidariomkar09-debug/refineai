export type TechStack = {
  frontend: string;
  backend: string;
  database: string;
  ai: string;
  styling: string;
  deploy: string;
};

export type PlannedFile = {
  path: string;
  name: string;
  purpose: string;
  isApiRoute: boolean;
};

export type PlanStep = {
  id: string;
  label: string;
  relatedPaths?: string[];
};

export type ProjectPlan = {
  name: string;
  description: string;
  niche: string;
  techStack: TechStack;
  files: PlannedFile[];
  databaseSchema?: string;
  apiRoutes: string[];
  estimatedFiles: number;
  setupInstructions?: string;
  deployInstructions?: string;
  introMessage?: string;
  revisionMessage?: string;
  estimatedMinutes?: number;
  steps?: PlanStep[];
};

export type FileStatus =
  | "pending"
  | "building"
  | "done"
  | "error"
  | "skipped";

export type ProjectStatus =
  | "planning"
  | "building"
  | "complete"
  | "error"
  | "paused";

export type BuildPhase =
  | "idle"
  | "planning"
  | "awaiting_confirm"
  | "building"
  | "testing"
  | "complete";

export type FileTask = "write" | "review" | "refine";

export type MessageRole = "user" | "assistant";
export type MessageType = "chat" | "plan" | "confirm" | "progress" | "complete";

export type ChatMode = "agent" | "ask" | "plan" | "debug";

export type DebugProposal = {
  analysis: string;
  rootCause: string;
  fileId: string;
  filePath: string;
  fixedContent: string;
  debugSnippet?: string;
};

export type DbMessage = {
  id: string;
  project_id: string;
  role: MessageRole;
  content: string;
  type: MessageType;
  mode?: ChatMode;
  metadata: Record<string, unknown>;
  created_at: string;
};

export type ChatMessage = {
  id: string;
  role: MessageRole;
  content: string;
  type: MessageType;
  mode?: ChatMode;
  metadata?: {
    plan?: ProjectPlan;
    planMarkdown?: string;
    debugProposal?: DebugProposal;
    showPlanActions?: boolean;
    showDebugActions?: boolean;
    [key: string]: unknown;
  };
};
export type DbProject = {
  id: string;
  name: string;
  description: string;
  niche: string | null;
  tech_stack: TechStack | Record<string, string>;
  plan: ProjectPlan | Record<string, unknown>;
  status: ProjectStatus;
  created_at: string;
};

export type DbFile = {
  id: string;
  project_id: string;
  file_path: string;
  file_name: string;
  content: string | null;
  status: FileStatus;
  score: number;
  rounds_taken: number;
  sort_order: number;
  created_at: string;
};

export type DbFileRound = {
  id: string;
  file_id: string;
  round_number: number;
  code: string | null;
  review: string | null;
  score: number;
  task: FileTask;
  created_at: string;
};

export type FileRoundEvent = {
  round: number;
  task: FileTask;
  score: number;
  code?: string;
  review?: string;
  critique?: string;
  inputContext: string;
  modelUsed: string;
  scoreBefore: number;
  scoreImprovement: number;
  tokensUsed: number;
  temperature: number;
  output: string;
  improvement: string;
};

export type BuildCompleteEvent = {
  score: number;
  content: string;
  roundsTaken: number;
};

export const FILE_SCORE_THRESHOLD = 95;
export const FILE_MAX_ROUNDS = 8;
export const FILE_ABSOLUTE_MAX_ROUNDS = 24;

export function meetsQualityThreshold(score: number): boolean {
  return score >= FILE_SCORE_THRESHOLD;
}

export type SSEEvent =
  | { type: "status"; message: string }
  | { type: "plan"; data: ProjectPlan; projectId: string }
  | { type: "round"; data: FileRoundEvent }
  | { type: "file_start"; filePath: string; fileName: string }
  | { type: "file_complete"; fileId: string; score: number }
  | { type: "complete"; data: BuildCompleteEvent }
  | { type: "summary"; data: ProjectPlan & { projectId: string } }
  | { type: "error"; message: string }
  | { type: "message"; content: string; mode?: ChatMode }
  | { type: "plan_question"; content: string; projectId: string }
  | {
      type: "plan_ready";
      data: { plan: ProjectPlan; markdown: string };
      projectId: string;
    }
  | { type: "debug"; data: DebugProposal; content: string; projectId: string };
