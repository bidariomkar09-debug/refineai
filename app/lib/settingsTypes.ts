export type UserSettings = {
  id: string;
  account_name: string;
  selected_model: string;
  score_threshold: number;
  max_rounds: number;
  temperature: number;
  theme: "dark" | "light";
  timezone?: string;
  dogfood_log?: DogfoodLogEntry[];
  updated_at: string;
};

export type DogfoodLogEntry = {
  projectId: string;
  prompt: string;
  note: string;
  createdAt: string;
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

export type ModelConfig = {
  id: string;
  active_model: string;
  fallback_model: string;
  rollout_percentage: number;
  is_custom_model_enabled: boolean;
  custom_model_id: string | null;
  suggested_rollout_percentage: number | null;
  rollout_suggestion_dismissed_at: string | null;
  updated_at: string;
};

export type ModelErrorRow = {
  id: string;
  attempted_model: string;
  fallback_model: string;
  error_message: string | null;
  created_at: string;
};

export type ModelMonitorStats = {
  gpt4oRequests: number;
  customModelRequests: number;
  customSuccessRate: number;
  customAvgScore: number;
  gpt4oAvgScore: number;
  fallbackTriggers: number;
  underperforming: boolean;
  customModelId: string | null;
  rolloutPercentage: number;
  isCustomEnabled: boolean;
};

export type ModelConfigStats = {
  customHandled: number;
  totalRecent: number;
  successfulCustom: number;
};

export type RolloutSuggestion = {
  show: boolean;
  currentPercentage: number;
  suggestedPercentage: number;
  message: string;
};

export type PipelineComparisonResult = {
  metrics?: Array<{ metric: string; modelA: string; modelB: string; winner: string }>;
  verdict?: string;
  verdictDetail?: string;
  metricWins?: number;
  categoryWins?: number;
  totalScoreDimensions?: number;
  testWins?: number;
  performanceDelta?: number;
  versionLabel?: string;
  rejectReason?: string;
  _internal?: {
    fineTuneRecordId?: string;
    testIndex?: number;
    comparisons?: unknown[];
  };
};

export type TrainingPipelineRun = {
  id: string;
  pipeline_run_number: number;
  status: string;
  stage: string;
  new_examples_collected: number;
  total_examples_used: number;
  previous_model_id: string | null;
  new_model_id: string | null;
  comparison_result: PipelineComparisonResult | null;
  was_promoted: boolean;
  started_at: string;
  completed_at: string | null;
};

export type PipelineSettings = {
  id: string;
  auto_training_paused: boolean;
  require_manual_approval: boolean;
  updated_at: string;
};

export type PipelineTriggerStatus = {
  shouldTrigger: boolean;
  newExamplesSinceLastRun: number;
  examplesNeeded: number;
  daysSinceLastRun: number;
  daysUntilEligible: number;
  isPaused: boolean;
  isStable: boolean;
  hasActiveRun: boolean;
  reason: string;
};

export type AppNotification = {
  id: string;
  type: string;
  title: string;
  message: string;
  read: boolean;
  metadata: Record<string, unknown> | null;
  created_at: string;
};

export type ModelProviderType = "openai" | "replicate" | "runpod" | "custom";

export type ModelProvider = {
  id: string;
  provider_name: string;
  provider_type: ModelProviderType;
  endpoint_url: string | null;
  api_key_encrypted: string | null;
  model_name: string | null;
  is_active: boolean;
  cost_per_1k_tokens: number | null;
  avg_latency_ms: number | null;
  created_at: string;
};

export type ResolvedModel = {
  modelId: string;
  providerType: ModelProviderType;
  providerId?: string;
  provider?: ModelProvider;
};

export type ProviderCostStats = {
  openaiRequests: number;
  selfHostedRequests: number;
  openaiCost: number;
  selfHostedCost: number;
  totalSaved: number;
  projectedAnnualSavings: number;
  openaiAvgLatencyMs: number;
  selfHostedAvgLatencyMs: number;
  openaiAvgScore: number;
  selfHostedAvgScore: number;
  selfHostedUptimePercent: number;
  openaiCostPer1k: number;
  selfHostedCostPer1k: number;
};

export type LoopModelDeveloper = {
  id: string;
  name: string;
  email: string | null;
  plan: "free" | "pro" | "enterprise";
  created_at: string;
};

export type LoopModelApiKey = {
  id: string;
  developer_id: string;
  key_prefix: string;
  name: string;
  is_active: boolean;
  last_used_at: string | null;
  created_at: string;
};

export type LoopModelApiUsage = {
  id: string;
  api_key_id: string | null;
  developer_id: string | null;
  endpoint: string;
  model_used: string | null;
  tokens_used: number;
  latency_ms: number | null;
  status: string;
  created_at: string;
};

export type LoopModelDashboard = {
  totalRequests: number;
  totalTokens: number;
  externalDevelopers: number;
  activeApiKeys: number;
  revenueThisMonth: number;
  refineaiSubscriberRevenue: number;
  apiInfrastructureRevenue: number;
  projectedAnnualApiRevenue: number;
  requestsToday: number;
  topModels: Array<{ model: string; requests: number }>;
};

export type LoopModelPublicModel = {
  id: string;
  name: string;
  description: string;
  context_window: number;
  pricing_per_1k_tokens: number;
};

export type JobRecord = {
  id: string;
  job_type: string;
  status: string;
  payload: Record<string, unknown> | null;
  result: Record<string, unknown> | null;
  error: string | null;
  created_at: string;
  completed_at: string | null;
};

export type StatusPageData = {
  overall: "operational" | "degraded" | "outage";
  uptime90Days: number;
  apiUptime: number;
  loopApiUptime: number;
  incidents: Array<{
    id: string;
    title: string;
    status: string;
    impact: string | null;
    started_at: string;
    resolved_at: string | null;
  }>;
};

export type AdminMetrics = {
  mrr: number;
  mrrTrend: Array<{ month: string; mrr: number }>;
  churnRate: number;
  newSignupsThisWeek: number;
  activeUsersDaily: number;
  activeUsersWeekly: number;
  activeUsersMonthly: number;
  topApiCustomers: Array<{ name: string; requests: number; tokens: number }>;
  supportTicketsThisWeek: number;
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
