export type UserSettings = {
  id: string;
  account_name: string;
  selected_model: string;
  score_threshold: number;
  max_rounds: number;
  temperature: number;
  theme: "dark" | "light";
  updated_at: string;
};

export type DashboardStats = {
  totalProjects: number;
  totalFiles: number;
  averageScore: number;
  totalLoops: number;
  recentProjects: Array<{
    id: string;
    name: string;
    status: string;
    created_at: string;
    fileCount: number;
    avgScore: number;
  }>;
  activity: Array<{
    id: string;
    message: string;
    timestamp: string;
    projectName: string;
  }>;
};

export type ProjectWithStats = {
  id: string;
  name: string;
  niche: string | null;
  status: string;
  created_at: string;
  fileCount: number;
  doneCount: number;
  avgScore: number;
};

export type DatasetFile = {
  id: string;
  file_path: string;
  file_name: string;
  content: string | null;
  score: number;
  project_id: string;
  project_name: string;
  created_at: string;
};

export type TrainingDataRow = {
  id: string;
  session_id: string | null;
  project_id: string | null;
  target: string;
  round_number: number;
  input_context: string | null;
  output: string;
  critique: string | null;
  score_before: number;
  score_after: number;
  score_improvement: number;
  improvement_summary: string | null;
  final_output: string | null;
  was_successful: boolean;
  reached_threshold: boolean;
  rounds_to_complete: number;
  model_used: string;
  temperature: number;
  tokens_used: number;
  project_type: string | null;
  file_type: string | null;
  task_type: string | null;
  created_at: string;
};

export type TrainingDataInsert = Omit<
  TrainingDataRow,
  | "id"
  | "final_output"
  | "was_successful"
  | "reached_threshold"
  | "rounds_to_complete"
  | "improvement_summary"
  | "created_at"
> & {
  final_output?: string | null;
  was_successful?: boolean;
  reached_threshold?: boolean;
  rounds_to_complete?: number;
  improvement_summary?: string | null;
};

export type TrainingDataFinalize = {
  finalOutput: string;
  wasSuccessful: boolean;
  reachedThreshold: boolean;
  roundsToComplete: number;
  improvementSummary: string;
};

export type TrainingDataFilters = {
  successful?: boolean;
  minScore?: number;
  fileType?: string;
  from?: string;
  to?: string;
};

export type TrainingDataSessionRow = {
  session_id: string;
  target: string;
  file_type: string | null;
  rounds_taken: number;
  final_score: number;
  was_successful: boolean;
  model_used: string;
  created_at: string;
};

export type TrainingDataStats = {
  totalExamples: number;
  successfulLoops: number;
  avgRoundsToComplete: number;
  fileTypeBreakdown: Array<{ type: string; count: number }>;
  thisWeekCount: number;
  qualityExamples: number;
  uniqueFileTypes: number;
  readinessPercent: number;
  milestones: {
    bronze: boolean;
    silver: boolean;
    gold: boolean;
    diamond: boolean;
  };
};

export type TrainingDataResponse = {
  stats: TrainingDataStats;
  sessions: TrainingDataSessionRow[];
};

export type TrainingDataCleanRow = {
  id?: string;
  source_id: string | null;
  session_id: string | null;
  project_id: string | null;
  target: string;
  input_context: string | null;
  output: string;
  critique: string;
  final_output: string;
  score_after: number;
  rounds_to_complete: number;
  model_used: string | null;
  file_type: string | null;
  project_type: string | null;
  task_type: string | null;
  split: "train" | "test";
  cleaned_at: string;
};

export type CleaningSummary = {
  totalRaw: number;
  afterCleaning: number;
  trainingSet: number;
  testSet: number;
  readyForFineTuning: boolean;
  cleanedAt: string | null;
};

export type FineTunedModelStatus =
  | "pending"
  | "uploading"
  | "uploaded"
  | "queued"
  | "running"
  | "succeeded"
  | "failed";

export type FineTunedModel = {
  id: string;
  model_id: string | null;
  base_model: string;
  status: FineTunedModelStatus;
  training_examples_used: number;
  openai_file_id: string | null;
  job_id: string | null;
  activated: boolean;
  error_message: string | null;
  created_at: string;
  updated_at: string;
};

export type FineTuningJobStatus = {
  jobId: string | null;
  status: FineTunedModelStatus;
  modelId: string | null;
  trainedTokens: number | null;
  estimatedFinish: string | null;
  errorMessage: string | null;
  progressPercent: number | null;
};

export type ModelComparisonResult = {
  prompt: string;
  baseModel: string;
  fineTunedModel: string;
  baseOutput: string;
  fineTunedOutput: string;
  baseScore: number;
  fineTunedScore: number;
  baseRounds: number;
  fineTunedRounds: number;
  winner: "base" | "fine_tuned" | "tie";
  roundsWinner: "base" | "fine_tuned" | "tie";
};

export type ModelComparisonRow = {
  id: string;
  test_prompt: string;
  model_a: string;
  model_b: string;
  model_a_score: number;
  model_b_score: number;
  model_a_rounds: number;
  model_b_rounds: number;
  model_a_tokens: number;
  model_b_tokens: number;
  winner: "model_a" | "model_b" | "tie";
  created_at: string;
};

export type EvaluationStats = {
  projectScores: Array<{ name: string; score: number }>;
  roundScores: Array<{ round: number; score: number }>;
  fileTypeScores: Array<{ type: string; score: number; count: number }>;
  totalRounds: number;
  totalFilesBuilt: number;
  commonIssues: string[];
};

export const AI_MODELS = [
  {
    id: "gpt-4o",
    name: "GPT-4o",
    recommended: true,
    speed: 3,
    quality: 5,
    costPer1k: 0.005,
    bestFor: "Complex apps, high-quality code generation",
  },
  {
    id: "gpt-4o-mini",
    name: "GPT-4o-mini",
    recommended: false,
    speed: 5,
    quality: 4,
    costPer1k: 0.00015,
    bestFor: "Fast iterations and simpler projects",
  },
  {
    id: "gpt-3.5-turbo",
    name: "GPT-3.5-turbo",
    recommended: false,
    speed: 5,
    quality: 3,
    costPer1k: 0.0005,
    bestFor: "Budget builds and prototyping",
  },
] as const;
