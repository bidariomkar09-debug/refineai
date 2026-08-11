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

export type ClarifyingQuestion = {
  id: string;
  question: string;
  options: string[];
  default: string;
};

export type ProjectClarifications = Record<string, string>;

export type VisualPlanArtifacts = {
  headline: string;
  outcomeBullets: string[];
  deliverables: string[];
  buildSteps: string[];
  plainEnglish: string;
  flowchart: string;
  clarifications: ProjectClarifications;
};

export type DbProjectPlan = {
  id: string;
  project_id: string;
  target: string;
  plan_text: string | null;
  flowchart: string | null;
  plain_english: string | null;
  build_preview: VisualPlanArtifacts | Record<string, unknown>;
  questions: ClarifyingQuestion[];
  clarifications: ProjectClarifications;
  status: "draft" | "clarifying" | "ready" | "building" | "built";
  created_at: string;
  updated_at: string;
};

export type ClarificationAnswer = { id: string; value: string };

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
  | "skipped"
  | "needs_fix"
  | "best_effort";

export type BuildCheckpoint = {
  currentFileId?: string;
  completedFileIds?: string[];
  buildStartedAt?: string;
};

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
    planQuestionOptions?: string[];
    clarifyingQuestions?: ClarifyingQuestion[];
    visualPlan?: VisualPlanArtifacts;
    clarificationsComplete?: boolean;
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
  build_checkpoint?: BuildCheckpoint | Record<string, unknown>;
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
  ai_score?: number;
  runtime_verified?: boolean;
  runtime_errors?: string[];
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
  input_context?: string | null;
  memory_context?: string | null;
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
  memoryContext?: string;
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
  | { type: "status"; message: string; retry?: boolean }
  | { type: "retry"; message: string }
  | { type: "plan"; data: ProjectPlan; projectId: string }
  | { type: "round"; data: FileRoundEvent }
  | { type: "file_start"; filePath: string; fileName: string }
  | {
      type: "file_complete";
      fileId: string;
      score: number;
      aiScore?: number;
      status?: FileStatus;
      runtimeVerified?: boolean;
      runtimeErrors?: string[];
      trainingExamples?: number;
    }
  | { type: "complete"; data: BuildCompleteEvent }
  | { type: "summary"; data: ProjectPlan & { projectId: string } }
  | { type: "error"; message: string }
  | { type: "message"; content: string; mode?: ChatMode }
  | { type: "plan_question"; content: string; options: string[]; projectId: string }
  | {
      type: "plan_clarifying";
      questions: ClarifyingQuestion[];
      clarifications?: ProjectClarifications;
      projectId: string;
    }
  | {
      type: "plan_ready";
      data: {
        plan: ProjectPlan;
        markdown: string;
        visual: VisualPlanArtifacts;
      };
      projectId: string;
    }
  | { type: "debug"; data: DebugProposal; content: string; projectId: string };
