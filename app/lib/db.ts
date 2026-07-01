import { createClient, SupabaseClient } from "@supabase/supabase-js";
import type {
  ChatMode,
  DbFile,
  DbFileRound,
  DbMessage,
  DbProject,
  FileStatus,
  FileTask,
  MessageType,
  ProjectPlan,
  ProjectStatus,
} from "./agentTypes";
import type {
  CleaningSummary,
  DashboardStats,
  DatasetFile,
  EvaluationStats,
  FineTunedModel,
  FineTunedModelStatus,
  ModelComparisonRow,
  ModelConfig,
  ModelConfigStats,
  ModelErrorRow,
  ModelMonitorStats,
  LoopModelApiKey,
  LoopModelApiUsage,
  LoopModelDashboard,
  LoopModelDeveloper,
  JobRecord,
  AdminMetrics,
  StatusPageData,
  ModelProvider,
  ProviderCostStats,
  AppNotification,
  PipelineSettings,
  ProjectWithStats,
  RolloutSuggestion,
  TrainingPipelineRun,
  TrainingDataCleanRow,
  TrainingDataFilters,
  TrainingDataFinalize,
  TrainingDataInsert,
  TrainingDataRow,
  TrainingDataSessionRow,
  TrainingDataStats,
  UserSettings,
} from "./settingsTypes";
import { EMPTY_CLEANING_SUMMARY } from "./trainingClean";

let client: SupabaseClient | null = null;

function getClient(): SupabaseClient {
  if (client) return client;
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  if (!url || !key) throw new Error("Supabase not configured");
  client = createClient(url, key);
  return client;
}

export class DbError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "DbError";
  }
}

export async function testConnection(): Promise<void> {
  const { error } = await getClient().from("projects").select("id").limit(1);
  if (error?.message.includes("does not exist")) {
    throw new DbError("Run supabase/migrations/20260628000000_coding_agent.sql");
  }
  if (error) throw new DbError(error.message);
}

export async function createProject(
  plan: ProjectPlan
): Promise<DbProject> {
  const { data, error } = await getClient()
    .from("projects")
    .insert({
      name: plan.name,
      description: plan.description,
      niche: plan.niche,
      tech_stack: plan.techStack,
      plan,
      status: "planning",
    })
    .select()
    .single();
  if (error || !data) throw new DbError(error?.message ?? "Failed to create project");
  return data as DbProject;
}

export async function updateProjectStatus(
  id: string,
  status: ProjectStatus
): Promise<void> {
  const { error } = await getClient()
    .from("projects")
    .update({ status })
    .eq("id", id);
  if (error) throw new DbError(error.message);
}

export async function updateProjectPlan(
  id: string,
  plan: ProjectPlan
): Promise<void> {
  const { error } = await getClient()
    .from("projects")
    .update({ plan, name: plan.name, description: plan.description })
    .eq("id", id);
  if (error) throw new DbError(error.message);
}

export async function createProjectFiles(
  projectId: string,
  plan: ProjectPlan
): Promise<DbFile[]> {
  const rows = plan.files.map((f, i) => ({
    project_id: projectId,
    file_path: f.path,
    file_name: f.name,
    status: "pending" as FileStatus,
    sort_order: i,
  }));
  const { data, error } = await getClient().from("files").insert(rows).select();
  if (error) throw new DbError(error.message);
  return (data ?? []) as DbFile[];
}

export async function deleteProjectFiles(projectId: string): Promise<void> {
  const { error } = await getClient()
    .from("files")
    .delete()
    .eq("project_id", projectId);
  if (error) throw new DbError(error.message);
}

export async function getProject(id: string): Promise<DbProject | null> {
  const { data, error } = await getClient()
    .from("projects")
    .select("*")
    .eq("id", id)
    .single();
  if (error?.code === "PGRST116") return null;
  if (error) throw new DbError(error.message);
  return data as DbProject;
}

export async function getProjects(): Promise<DbProject[]> {
  const { data, error } = await getClient()
    .from("projects")
    .select("*")
    .order("created_at", { ascending: false })
    .limit(50);
  if (error) throw new DbError(error.message);
  return (data ?? []) as DbProject[];
}

export async function getProjectFiles(projectId: string): Promise<DbFile[]> {
  const { data, error } = await getClient()
    .from("files")
    .select("*")
    .eq("project_id", projectId)
    .order("sort_order", { ascending: true });
  if (error) throw new DbError(error.message);
  return (data ?? []) as DbFile[];
}

export async function getFile(id: string): Promise<DbFile | null> {
  const { data, error } = await getClient()
    .from("files")
    .select("*")
    .eq("id", id)
    .single();
  if (error?.code === "PGRST116") return null;
  if (error) throw new DbError(error.message);
  return data as DbFile;
}

export async function updateFileStatus(
  id: string,
  status: FileStatus
): Promise<void> {
  const { error } = await getClient()
    .from("files")
    .update({ status })
    .eq("id", id);
  if (error) throw new DbError(error.message);
}

export async function completeFile(
  id: string,
  content: string,
  score: number,
  roundsTaken: number
): Promise<void> {
  const { error } = await getClient()
    .from("files")
    .update({
      content,
      score,
      rounds_taken: roundsTaken,
      status: "done",
    })
    .eq("id", id);
  if (error) throw new DbError(error.message);
}

export async function saveFileRound(
  fileId: string,
  round: number,
  task: FileTask,
  score: number,
  code?: string,
  review?: string
): Promise<void> {
  const { error } = await getClient().from("file_rounds").insert({
    file_id: fileId,
    round_number: round,
    task,
    score,
    code: code ?? null,
    review: review ?? null,
  });
  if (error) throw new DbError(error.message);
}

export async function createProjectShell(
  name: string,
  description: string
): Promise<DbProject> {
  const plan: ProjectPlan = {
    name,
    description,
    niche: "general",
    techStack: {
      frontend: "Next.js",
      backend: "Next.js API",
      database: "Supabase",
      ai: "OpenAI",
      styling: "Tailwind CSS",
      deploy: "Vercel",
    },
    files: [],
    apiRoutes: [],
    estimatedFiles: 0,
  };
  return createProject(plan);
}

export async function updateFileContent(
  id: string,
  content: string
): Promise<DbFile> {
  const { data, error } = await getClient()
    .from("files")
    .update({ content })
    .eq("id", id)
    .select()
    .single();
  if (error || !data) throw new DbError(error?.message ?? "Failed to update file");
  return data as DbFile;
}

export async function savePlanMarkdown(
  projectId: string,
  markdown: string
): Promise<void> {
  const { data: existing } = await getClient()
    .from("files")
    .select("id")
    .eq("project_id", projectId)
    .eq("file_path", "PLAN.md")
    .maybeSingle();

  if (existing?.id) {
    await getClient()
      .from("files")
      .update({ content: markdown, status: "done", score: 100 })
      .eq("id", existing.id);
    return;
  }

  const { error } = await getClient().from("files").insert({
    project_id: projectId,
    file_path: "PLAN.md",
    file_name: "PLAN.md",
    content: markdown,
    status: "done",
    score: 100,
    sort_order: -1,
  });
  if (error) throw new DbError(error.message);
}

export async function addMessage(
  projectId: string,
  role: "user" | "assistant",
  content: string,
  type: MessageType = "chat",
  metadata: Record<string, unknown> = {},
  mode: ChatMode = "agent"
): Promise<DbMessage> {
  const row: Record<string, unknown> = {
    project_id: projectId,
    role,
    content,
    type,
    metadata,
    mode,
  };
  const { data, error } = await getClient()
    .from("messages")
    .insert(row)
    .select()
    .single();
  if (error?.message?.includes("mode") || error?.code === "PGRST204") {
    const { data: fallback, error: fallbackErr } = await getClient()
      .from("messages")
      .insert({ project_id: projectId, role, content, type, metadata })
      .select()
      .single();
    if (fallbackErr || !fallback) {
      throw new DbError(fallbackErr?.message ?? "Failed to save message");
    }
    return { ...(fallback as DbMessage), mode };
  }
  if (error || !data) throw new DbError(error?.message ?? "Failed to save message");
  return data as DbMessage;
}

export async function getMessages(projectId: string): Promise<DbMessage[]> {
  const { data, error } = await getClient()
    .from("messages")
    .select("*")
    .eq("project_id", projectId)
    .order("created_at", { ascending: true });
  if (error) throw new DbError(error.message);
  return (data ?? []) as DbMessage[];
}

export async function getCompletedFilesContext(
  projectId: string
): Promise<string> {
  const files = await getProjectFiles(projectId);
  const done = files.filter((f) => f.status === "done" && f.content);
  if (done.length === 0) return "No files completed yet.";
  return done
    .map((f) => `--- ${f.file_path} ---\n${f.content?.slice(0, 2000)}`)
    .join("\n\n");
}

// --- User settings ---

const DEFAULT_SETTINGS: UserSettings = {
  id: "default",
  account_name: "Developer",
  selected_model: "gpt-4o",
  score_threshold: 95,
  max_rounds: 8,
  temperature: 0.7,
  theme: "dark",
  updated_at: new Date().toISOString(),
};

export async function getUserSettings(): Promise<UserSettings> {
  const { data, error } = await getClient()
    .from("user_settings")
    .select("*")
    .eq("id", "default")
    .single();
  if (
    error?.message?.includes("does not exist") ||
    error?.message?.includes("Could not find the table") ||
    error?.code === "PGRST116" ||
    error?.code === "PGRST205"
  ) {
    return DEFAULT_SETTINGS;
  }
  if (error) throw new DbError(error.message);
  return data as UserSettings;
}

export async function upsertUserSettings(
  partial: Partial<Omit<UserSettings, "id" | "updated_at">>
): Promise<UserSettings> {
  const { data, error } = await getClient()
    .from("user_settings")
    .upsert({ id: "default", ...partial, updated_at: new Date().toISOString() })
    .select()
    .single();
  if (
    error?.message?.includes("Could not find the table") ||
    error?.code === "PGRST205"
  ) {
    return { ...DEFAULT_SETTINGS, ...partial, updated_at: new Date().toISOString() };
  }
  if (error) throw new DbError(error.message);
  return data as UserSettings;
}

export async function deleteProject(id: string): Promise<void> {
  const { error } = await getClient().from("projects").delete().eq("id", id);
  if (error) throw new DbError(error.message);
}

async function getProjectStatsMap(): Promise<
  Map<string, { fileCount: number; doneCount: number; avgScore: number }>
> {
  const { data, error } = await getClient().from("files").select("project_id, status, score");
  if (error) throw new DbError(error.message);
  const map = new Map<string, { fileCount: number; doneCount: number; totalScore: number }>();
  for (const row of data ?? []) {
    const pid = row.project_id as string;
    const entry = map.get(pid) ?? { fileCount: 0, doneCount: 0, totalScore: 0 };
    entry.fileCount += 1;
    if (row.status === "done") {
      entry.doneCount += 1;
      entry.totalScore += row.score ?? 0;
    }
    map.set(pid, entry);
  }
  const result = new Map<string, { fileCount: number; doneCount: number; avgScore: number }>();
  for (const [pid, entry] of Array.from(map.entries())) {
    result.set(pid, {
      fileCount: entry.fileCount,
      doneCount: entry.doneCount,
      avgScore: entry.doneCount > 0 ? Math.round(entry.totalScore / entry.doneCount) : 0,
    });
  }
  return result;
}

export async function getProjectsWithStats(): Promise<ProjectWithStats[]> {
  const projects = await getProjects();
  const statsMap = await getProjectStatsMap();
  return projects.map((p) => {
    const stats = statsMap.get(p.id) ?? { fileCount: 0, doneCount: 0, avgScore: 0 };
    return {
      id: p.id,
      name: p.name,
      niche: p.niche,
      status: p.status,
      created_at: p.created_at,
      fileCount: stats.fileCount,
      doneCount: stats.doneCount,
      avgScore: stats.avgScore,
    };
  });
}

export async function getDashboardStats(): Promise<DashboardStats> {
  const [projects, statsMap] = await Promise.all([getProjects(), getProjectStatsMap()]);

  const { count: fileCount } = await getClient()
    .from("files")
    .select("*", { count: "exact", head: true })
    .eq("status", "done");

  const { data: doneFiles } = await getClient()
    .from("files")
    .select("score")
    .eq("status", "done");

  const scores = (doneFiles ?? []).map((f) => f.score as number).filter((s) => s > 0);
  const averageScore =
    scores.length > 0 ? Math.round(scores.reduce((a, b) => a + b, 0) / scores.length) : 0;

  const { count: loopCount } = await getClient()
    .from("file_rounds")
    .select("*", { count: "exact", head: true });

  const recentProjects = projects.slice(0, 5).map((p) => {
    const stats = statsMap.get(p.id) ?? { fileCount: 0, avgScore: 0 };
    return {
      id: p.id,
      name: p.name,
      status: p.status,
      created_at: p.created_at,
      fileCount: stats.fileCount,
      avgScore: stats.avgScore,
    };
  });

  const { data: recentFiles } = await getClient()
    .from("files")
    .select("id, file_path, created_at, project_id, status, score")
    .eq("status", "done")
    .order("created_at", { ascending: false })
    .limit(8);

  const projectNameMap = new Map(projects.map((p) => [p.id, p.name]));
  const activity = (recentFiles ?? []).map((f) => ({
    id: f.id as string,
    message: `Built ${f.file_path} (${f.score}% quality)`,
    timestamp: f.created_at as string,
    projectName: projectNameMap.get(f.project_id as string) ?? "Project",
  }));

  return {
    totalProjects: projects.length,
    totalFiles: fileCount ?? 0,
    averageScore,
    totalLoops: loopCount ?? 0,
    recentProjects,
    activity,
  };
}

export async function getAllDatasetFiles(): Promise<DatasetFile[]> {
  const [projects, { data, error }] = await Promise.all([
    getProjects(),
    getClient()
      .from("files")
      .select("id, file_path, file_name, content, score, project_id, created_at")
      .eq("status", "done")
      .order("created_at", { ascending: false })
      .limit(200),
  ]);
  if (error) throw new DbError(error.message);
  const projectNameMap = new Map(projects.map((p) => [p.id, p.name]));
  return (data ?? []).map((row) => ({
    id: row.id as string,
    file_path: row.file_path as string,
    file_name: row.file_name as string,
    content: row.content as string | null,
    score: row.score as number,
    project_id: row.project_id as string,
    project_name: projectNameMap.get(row.project_id as string) ?? "Unknown",
    created_at: row.created_at as string,
  }));
}

export async function getEvaluationStats(): Promise<EvaluationStats> {
  const projects = await getProjectsWithStats();
  const projectScores = projects
    .filter((p) => p.avgScore > 0)
    .map((p) => ({ name: p.name.length > 20 ? p.name.slice(0, 20) + "…" : p.name, score: p.avgScore }));

  const { data: rounds } = await getClient()
    .from("file_rounds")
    .select("round_number, score, review");

  const roundMap = new Map<number, { total: number; count: number }>();
  const issueWords = new Map<string, number>();

  for (const r of rounds ?? []) {
    const rn = r.round_number as number;
    const entry = roundMap.get(rn) ?? { total: 0, count: 0 };
    entry.total += r.score as number;
    entry.count += 1;
    roundMap.set(rn, entry);

    const review = (r.review as string) ?? "";
    const lower = review.toLowerCase();
    for (const phrase of ["missing", "error", "type", "import", "syntax", "test", "security"]) {
      if (lower.includes(phrase)) {
        issueWords.set(phrase, (issueWords.get(phrase) ?? 0) + 1);
      }
    }
  }

  const roundScores = Array.from(roundMap.entries())
    .sort((a, b) => a[0] - b[0])
    .map(([round, { total, count }]) => ({ round, score: Math.round(total / count) }));

  const { data: files } = await getClient()
    .from("files")
    .select("file_path, score")
    .eq("status", "done");

  const typeMap = new Map<string, { total: number; count: number }>();
  for (const f of files ?? []) {
    const ext = (f.file_path as string).split(".").pop()?.toLowerCase() ?? "other";
    const entry = typeMap.get(ext) ?? { total: 0, count: 0 };
    entry.total += f.score as number;
    entry.count += 1;
    typeMap.set(ext, entry);
  }

  const fileTypeScores = Array.from(typeMap.entries())
    .map(([type, { total, count }]) => ({
      type: `.${type}`,
      score: Math.round(total / count),
      count,
    }))
    .sort((a, b) => b.count - a.count);

  const commonIssues = Array.from(issueWords.entries())
    .sort((a, b) => b[1] - a[1])
    .slice(0, 6)
    .map(([word, count]) => `${word} (${count})`);

  return {
    projectScores,
    roundScores,
    fileTypeScores,
    totalRounds: rounds?.length ?? 0,
    totalFilesBuilt: files?.length ?? 0,
    commonIssues: commonIssues.length > 0 ? commonIssues : ["No critique data yet"],
  };
}

// --- Training data ---

function isTrainingTableMissing(error: { message?: string; code?: string } | null): boolean {
  return (
    !!error?.message?.includes("does not exist") ||
    !!error?.message?.includes("Could not find the table") ||
    error?.code === "PGRST205"
  );
}

const EMPTY_TRAINING_STATS: TrainingDataStats = {
  totalExamples: 0,
  successfulLoops: 0,
  avgRoundsToComplete: 0,
  fileTypeBreakdown: [],
  thisWeekCount: 0,
  qualityExamples: 0,
  uniqueFileTypes: 0,
  readinessPercent: 0,
  milestones: { bronze: false, silver: false, gold: false, diamond: false },
};

function buildMilestones(total: number): TrainingDataStats["milestones"] {
  return {
    bronze: total >= 100,
    silver: total >= 500,
    gold: total >= 1000,
    diamond: total >= 5000,
  };
}

export async function createTrainingSession(
  target: string,
  model = "gpt-4o",
  temperature = 0.7,
  mode: ChatMode = "agent"
): Promise<string> {
  const row: Record<string, unknown> = {
    target,
    status: "running",
    model,
    temperature,
    mode,
  };
  const { data, error } = await getClient()
    .from("sessions")
    .insert(row)
    .select("id")
    .single();
  if (error?.message?.includes("mode") || error?.code === "PGRST204") {
    const { data: fallback, error: fallbackErr } = await getClient()
      .from("sessions")
      .insert({ target, status: "running", model, temperature })
      .select("id")
      .single();
    if (fallbackErr || !fallback) {
      throw new DbError(fallbackErr?.message ?? "Failed to create training session");
    }
    return fallback.id as string;
  }
  if (error || !data) throw new DbError(error?.message ?? "Failed to create training session");
  return data.id as string;
}

export async function saveTrainingData(row: TrainingDataInsert): Promise<string> {
  const { data, error } = await getClient()
    .from("training_data")
    .insert({
      session_id: row.session_id,
      project_id: row.project_id,
      target: row.target,
      round_number: row.round_number,
      input_context: row.input_context,
      output: row.output,
      critique: row.critique ?? null,
      score_before: row.score_before,
      score_after: row.score_after,
      score_improvement: row.score_improvement,
      improvement_summary: row.improvement_summary ?? null,
      final_output: row.final_output ?? null,
      was_successful: row.was_successful ?? false,
      reached_threshold: row.reached_threshold ?? false,
      rounds_to_complete: row.rounds_to_complete ?? 0,
      model_used: row.model_used,
      temperature: row.temperature,
      tokens_used: row.tokens_used,
      project_type: row.project_type ?? null,
      file_type: row.file_type ?? null,
      task_type: row.task_type ?? null,
    })
    .select("id")
    .single();
  if (error || !data) throw new DbError(error?.message ?? "Failed to save training data");
  return data.id as string;
}

export async function finalizeTrainingData(
  ids: string[],
  payload: TrainingDataFinalize
): Promise<void> {
  if (ids.length === 0) return;
  const { error } = await getClient()
    .from("training_data")
    .update({
      final_output: payload.finalOutput,
      was_successful: payload.wasSuccessful,
      reached_threshold: payload.reachedThreshold,
      rounds_to_complete: payload.roundsToComplete,
      improvement_summary: payload.improvementSummary,
    })
    .in("id", ids);
  if (error) throw new DbError(error.message);
}

function applyTrainingFilters<T extends { eq: Function; gte: Function; lte: Function }>(
  query: T,
  filters: TrainingDataFilters
): T {
  let q = query;
  if (filters.successful) q = q.eq("was_successful", true) as T;
  if (filters.minScore !== undefined) q = q.gte("score_after", filters.minScore) as T;
  if (filters.fileType) q = q.eq("file_type", filters.fileType) as T;
  if (filters.from) q = q.gte("created_at", filters.from) as T;
  if (filters.to) q = q.lte("created_at", filters.to) as T;
  return q;
}

export async function getTrainingDataForExport(
  filters: TrainingDataFilters = {}
): Promise<TrainingDataRow[]> {
  let query = getClient().from("training_data").select("*").order("created_at", { ascending: true });
  query = applyTrainingFilters(query, filters);
  const { data, error } = await query;
  if (isTrainingTableMissing(error)) return [];
  if (error) throw new DbError(error.message);
  return (data ?? []) as TrainingDataRow[];
}

export async function getTrainingDataSessions(
  filters: TrainingDataFilters = {}
): Promise<TrainingDataSessionRow[]> {
  const rows = await getTrainingDataForExport(filters);
  const bySession = new Map<string, TrainingDataRow[]>();

  for (const row of rows) {
    const key = row.session_id ?? row.project_id ?? row.id;
    const list = bySession.get(key) ?? [];
    list.push(row);
    bySession.set(key, list);
  }

  const sessions: TrainingDataSessionRow[] = [];
  for (const [sessionId, group] of Array.from(bySession.entries())) {
    const sorted = [...group].sort((a, b) => a.round_number - b.round_number);
    const last = sorted[sorted.length - 1];
    sessions.push({
      session_id: sessionId,
      target: last.target,
      file_type: last.file_type,
      rounds_taken: last.rounds_to_complete || Math.max(...sorted.map((r) => r.round_number)),
      final_score: last.score_after,
      was_successful: sorted.some((r) => r.was_successful),
      model_used: last.model_used,
      created_at: last.created_at,
    });
  }

  return sessions.sort(
    (a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
  );
}

export async function getTrainingDataStats(): Promise<TrainingDataStats> {
  const { data, error } = await getClient()
    .from("training_data")
    .select("*")
    .order("created_at", { ascending: true });

  if (isTrainingTableMissing(error)) return EMPTY_TRAINING_STATS;
  if (error) throw new DbError(error.message);

  const rows = (data ?? []) as TrainingDataRow[];
  if (rows.length === 0) return EMPTY_TRAINING_STATS;

  const weekAgo = new Date();
  weekAgo.setDate(weekAgo.getDate() - 7);

  const sessionMap = new Map<string, TrainingDataRow[]>();
  const fileTypeMap = new Map<string, number>();

  for (const row of rows) {
    const key = row.session_id ?? row.project_id ?? row.id;
    const list = sessionMap.get(key) ?? [];
    list.push(row);
    sessionMap.set(key, list);

    if (row.file_type) {
      fileTypeMap.set(row.file_type, (fileTypeMap.get(row.file_type) ?? 0) + 1);
    }
  }

  let successfulLoops = 0;
  let totalRounds = 0;
  let sessionCount = 0;

  for (const group of Array.from(sessionMap.values())) {
    sessionCount += 1;
    const last = group[group.length - 1];
    if (last.was_successful || last.reached_threshold) successfulLoops += 1;
    totalRounds += last.rounds_to_complete || Math.max(...group.map((r) => r.round_number));
  }

  const qualityExamples = rows.filter((r) => r.score_after >= 95).length;
  const thisWeekCount = rows.filter(
    (r) => new Date(r.created_at) >= weekAgo
  ).length;

  const fileTypeBreakdown = Array.from(fileTypeMap.entries())
    .map(([type, count]) => ({ type, count }))
    .sort((a, b) => b.count - a.count)
    .slice(0, 8);

  const totalExamples = rows.length;

  return {
    totalExamples,
    successfulLoops,
    avgRoundsToComplete:
      sessionCount > 0 ? Math.round((totalRounds / sessionCount) * 10) / 10 : 0,
    fileTypeBreakdown,
    thisWeekCount,
    qualityExamples,
    uniqueFileTypes: fileTypeMap.size,
    readinessPercent: Math.min(100, Math.round((totalExamples / 1000) * 100)),
    milestones: buildMilestones(totalExamples),
  };
}

export async function getTrainingDataCount(): Promise<number> {
  const stats = await getTrainingDataStats();
  return stats.totalExamples;
}

export async function getAllTrainingData(): Promise<TrainingDataRow[]> {
  return getTrainingDataForExport();
}

// --- Training data clean ---

function isCleanTableMissing(error: { message?: string; code?: string } | null): boolean {
  return isTrainingTableMissing(error);
}

export async function replaceTrainingDataClean(rows: TrainingDataCleanRow[]): Promise<void> {
  const { error: deleteError } = await getClient()
    .from("training_data_clean")
    .delete()
    .in("split", ["train", "test"]);
  if (isCleanTableMissing(deleteError)) return;
  if (deleteError) throw new DbError(deleteError.message);

  if (rows.length === 0) return;

  const { error: insertError } = await getClient().from("training_data_clean").insert(
    rows.map((row) => ({
      source_id: row.source_id,
      session_id: row.session_id,
      project_id: row.project_id,
      target: row.target,
      input_context: row.input_context,
      output: row.output,
      critique: row.critique,
      final_output: row.final_output,
      score_after: row.score_after,
      rounds_to_complete: row.rounds_to_complete,
      model_used: row.model_used,
      file_type: row.file_type,
      project_type: row.project_type,
      task_type: row.task_type,
      split: row.split,
      cleaned_at: row.cleaned_at,
    }))
  );
  if (insertError) throw new DbError(insertError.message);
}

export async function getTrainingDataClean(
  split?: "train" | "test"
): Promise<TrainingDataCleanRow[]> {
  let query = getClient().from("training_data_clean").select("*").order("cleaned_at", {
    ascending: true,
  });
  if (split) query = query.eq("split", split);
  const { data, error } = await query;
  if (isCleanTableMissing(error)) return [];
  if (error) throw new DbError(error.message);
  return (data ?? []) as TrainingDataCleanRow[];
}

export async function getCleaningSummaryFromClean(
  totalRaw?: number
): Promise<CleaningSummary> {
  const rows = await getTrainingDataClean();
  if (rows.length === 0) {
    return {
      ...EMPTY_CLEANING_SUMMARY,
      totalRaw: totalRaw ?? 0,
    };
  }

  const trainingSet = rows.filter((r) => r.split === "train").length;
  const testSet = rows.filter((r) => r.split === "test").length;
  const cleanedAt = rows[rows.length - 1]?.cleaned_at ?? null;

  return {
    totalRaw: totalRaw ?? rows.length,
    afterCleaning: rows.length,
    trainingSet,
    testSet,
    readyForFineTuning: trainingSet >= 100,
    cleanedAt,
  };
}

// --- Fine-tuned models ---

function isFineTunedTableMissing(error: { message?: string; code?: string } | null): boolean {
  return (
    !!error?.message?.includes("does not exist") ||
    !!error?.message?.includes("Could not find the table") ||
    error?.code === "PGRST205"
  );
}

export async function createFineTunedModelRecord(
  trainingExamplesUsed: number
): Promise<FineTunedModel> {
  const { data, error } = await getClient()
    .from("fine_tuned_models")
    .insert({
      base_model: "gpt-4o-2024-08-06",
      status: "pending",
      training_examples_used: trainingExamplesUsed,
    })
    .select()
    .single();
  if (error || !data) throw new DbError(error?.message ?? "Failed to create fine-tune record");
  return data as FineTunedModel;
}

export async function updateFineTunedModel(
  id: string,
  partial: Partial<
    Pick<
      FineTunedModel,
      | "model_id"
      | "status"
      | "openai_file_id"
      | "job_id"
      | "activated"
      | "error_message"
      | "training_examples_used"
    >
  >
): Promise<FineTunedModel> {
  const { data, error } = await getClient()
    .from("fine_tuned_models")
    .update({ ...partial, updated_at: new Date().toISOString() })
    .eq("id", id)
    .select()
    .single();
  if (error || !data) throw new DbError(error?.message ?? "Failed to update fine-tune record");
  return data as FineTunedModel;
}

export async function getLatestFineTunedModel(): Promise<FineTunedModel | null> {
  const { data, error } = await getClient()
    .from("fine_tuned_models")
    .select("*")
    .order("created_at", { ascending: false })
    .limit(1)
    .maybeSingle();
  if (isFineTunedTableMissing(error)) return null;
  if (error) throw new DbError(error.message);
  return (data as FineTunedModel) ?? null;
}

export async function getActivatedFineTunedModel(): Promise<FineTunedModel | null> {
  const { data, error } = await getClient()
    .from("fine_tuned_models")
    .select("*")
    .eq("activated", true)
    .order("updated_at", { ascending: false })
    .limit(1)
    .maybeSingle();
  if (isFineTunedTableMissing(error)) return null;
  if (error) throw new DbError(error.message);
  return (data as FineTunedModel) ?? null;
}

export async function activateFineTunedModel(id: string): Promise<FineTunedModel> {
  await getClient()
    .from("fine_tuned_models")
    .update({ activated: false, updated_at: new Date().toISOString() })
    .eq("activated", true);

  const record = await updateFineTunedModel(id, { activated: true, status: "succeeded" });

  if (record.model_id) {
    await upsertUserSettings({ selected_model: record.model_id });
  }

  return record;
}

export async function syncFineTunedJobStatus(
  id: string,
  status: FineTunedModelStatus,
  modelId: string | null,
  errorMessage: string | null
): Promise<FineTunedModel> {
  const partial: Parameters<typeof updateFineTunedModel>[1] = {
    status,
    error_message: errorMessage,
  };
  if (modelId) partial.model_id = modelId;
  return updateFineTunedModel(id, partial);
}

// --- Model comparisons ---

function isComparisonsTableMissing(error: { message?: string; code?: string } | null): boolean {
  return (
    !!error?.message?.includes("does not exist") ||
    !!error?.message?.includes("Could not find the table") ||
    error?.code === "PGRST205"
  );
}

export async function saveModelComparison(row: {
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
}): Promise<void> {
  const { error } = await getClient().from("model_comparisons").insert(row);
  if (isComparisonsTableMissing(error)) return;
  if (error) throw new DbError(error.message);
}

export async function getModelComparisons(limit = 50): Promise<ModelComparisonRow[]> {
  const { data, error } = await getClient()
    .from("model_comparisons")
    .select("*")
    .order("created_at", { ascending: false })
    .limit(limit);
  if (isComparisonsTableMissing(error)) return [];
  if (error) throw new DbError(error.message);
  return (data ?? []) as ModelComparisonRow[];
}

export async function getSucceededFineTunedModel(): Promise<FineTunedModel | null> {
  const activated = await getActivatedFineTunedModel();
  if (activated?.model_id) return activated;

  const { data, error } = await getClient()
    .from("fine_tuned_models")
    .select("*")
    .eq("status", "succeeded")
    .not("model_id", "is", null)
    .order("created_at", { ascending: false })
    .limit(1)
    .maybeSingle();
  if (isFineTunedTableMissing(error)) return null;
  if (error) throw new DbError(error.message);
  return (data as FineTunedModel) ?? null;
}

// --- Model config & routing ---

const DEFAULT_MODEL_CONFIG: ModelConfig = {
  id: "default",
  active_model: "gpt-4o",
  fallback_model: "gpt-4o",
  rollout_percentage: 0,
  is_custom_model_enabled: false,
  custom_model_id: null,
  suggested_rollout_percentage: null,
  rollout_suggestion_dismissed_at: null,
  updated_at: new Date().toISOString(),
};

function isModelConfigTableMissing(error: { message?: string; code?: string } | null): boolean {
  return (
    !!error?.message?.includes("does not exist") ||
    !!error?.message?.includes("Could not find the table") ||
    error?.code === "PGRST205"
  );
}

export async function getModelConfig(): Promise<ModelConfig> {
  const { data, error } = await getClient()
    .from("model_config")
    .select("*")
    .order("updated_at", { ascending: false })
    .limit(1)
    .maybeSingle();
  if (isModelConfigTableMissing(error)) return DEFAULT_MODEL_CONFIG;
  if (error) throw new DbError(error.message);
  return (data as ModelConfig) ?? DEFAULT_MODEL_CONFIG;
}

export async function updateModelConfig(
  partial: Partial<Omit<ModelConfig, "id" | "updated_at">>
): Promise<ModelConfig> {
  const existing = await getModelConfig();
  const { data, error } = await getClient()
    .from("model_config")
    .update({ ...partial, updated_at: new Date().toISOString() })
    .eq("id", existing.id)
    .select()
    .single();
  if (isModelConfigTableMissing(error)) {
    return { ...DEFAULT_MODEL_CONFIG, ...partial, updated_at: new Date().toISOString() };
  }
  if (error) throw new DbError(error.message);
  return data as ModelConfig;
}

export async function emergencyRollbackModel(): Promise<ModelConfig> {
  return updateModelConfig({
    is_custom_model_enabled: false,
    rollout_percentage: 0,
    suggested_rollout_percentage: null,
  });
}

export async function logModelError(row: {
  attempted_model: string;
  fallback_model: string;
  error_message?: string;
}): Promise<void> {
  const { error } = await getClient().from("model_errors").insert({
    attempted_model: row.attempted_model,
    fallback_model: row.fallback_model,
    error_message: row.error_message ?? null,
  });
  if (isModelConfigTableMissing(error)) return;
  if (error?.message?.includes("model_errors")) return;
  if (error) throw new DbError(error.message);
}

export async function getModelErrorCountSince(since: string): Promise<number> {
  const { count, error } = await getClient()
    .from("model_errors")
    .select("*", { count: "exact", head: true })
    .gte("created_at", since);
  if (error?.message?.includes("model_errors")) return 0;
  if (error) return 0;
  return count ?? 0;
}

export async function getCustomModelRecentStats(
  customModelId: string | null
): Promise<ModelConfigStats> {
  const { data, error } = await getClient()
    .from("training_data")
    .select("model_used, was_successful, score_after")
    .order("created_at", { ascending: false })
    .limit(100);

  if (error || !data) return { customHandled: 0, totalRecent: 0, successfulCustom: 0 };

  const rows = data as Array<{
    model_used: string;
    was_successful: boolean;
    score_after: number;
  }>;

  const isCustom = (model: string) =>
    customModelId
      ? model === customModelId || model.startsWith("ft:")
      : model.startsWith("ft:");

  const customRows = rows.filter((r) => isCustom(r.model_used));
  const successfulCustom = customRows.filter(
    (r) => r.was_successful || r.score_after >= 95
  ).length;

  return {
    customHandled: customRows.length,
    totalRecent: rows.length,
    successfulCustom,
  };
}

export async function getModelMonitorStats(): Promise<ModelMonitorStats> {
  const config = await getModelConfig();
  const since = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString();
  const fallback = config.fallback_model || "gpt-4o";
  const customId = config.custom_model_id;

  const { data, error } = await getClient()
    .from("training_data")
    .select("model_used, score_after, was_successful")
    .gte("created_at", since);

  let gpt4oRequests = 0;
  let customModelRequests = 0;
  let customSuccess = 0;
  const gpt4oScores: number[] = [];
  const customScores: number[] = [];

  if (!error && data) {
    for (const row of data as Array<{
      model_used: string;
      score_after: number;
      was_successful: boolean;
    }>) {
      const isCustom =
        (customId && row.model_used === customId) || row.model_used.startsWith("ft:");
      const isGpt =
        row.model_used === fallback ||
        row.model_used === "gpt-4o" ||
        (!isCustom && !row.model_used.startsWith("ft:"));

      if (isCustom) {
        customModelRequests++;
        customScores.push(row.score_after);
        if (row.was_successful || row.score_after >= 95) customSuccess++;
      } else if (isGpt) {
        gpt4oRequests++;
        gpt4oScores.push(row.score_after);
      }
    }
  }

  const fallbackTriggers = await getModelErrorCountSince(since);
  const customSuccessRate =
    customModelRequests > 0 ? Math.round((customSuccess / customModelRequests) * 100) : 0;
  const customAvgScore =
    customScores.length > 0
      ? Math.round(customScores.reduce((a, b) => a + b, 0) / customScores.length)
      : 0;
  const gpt4oAvgScore =
    gpt4oScores.length > 0
      ? Math.round(gpt4oScores.reduce((a, b) => a + b, 0) / gpt4oScores.length)
      : 0;

  return {
    gpt4oRequests,
    customModelRequests,
    customSuccessRate,
    customAvgScore,
    gpt4oAvgScore,
    fallbackTriggers,
    underperforming: customModelRequests >= 5 && customSuccessRate < 85,
    customModelId: customId,
    rolloutPercentage: config.rollout_percentage,
    isCustomEnabled: config.is_custom_model_enabled,
  };
}

// --- Training pipeline ---

const DEFAULT_PIPELINE_SETTINGS: PipelineSettings = {
  id: "default",
  auto_training_paused: false,
  require_manual_approval: false,
  updated_at: new Date().toISOString(),
};

function isPipelineTableMissing(error: { message?: string; code?: string } | null): boolean {
  return (
    !!error?.message?.includes("does not exist") ||
    !!error?.message?.includes("Could not find the table") ||
    error?.code === "PGRST205"
  );
}

export async function getPipelineSettings(): Promise<PipelineSettings> {
  const { data, error } = await getClient()
    .from("pipeline_settings")
    .select("*")
    .eq("id", "default")
    .maybeSingle();
  if (isPipelineTableMissing(error)) return DEFAULT_PIPELINE_SETTINGS;
  if (error) throw new DbError(error.message);
  return (data as PipelineSettings) ?? DEFAULT_PIPELINE_SETTINGS;
}

export async function updatePipelineSettings(
  partial: Partial<Omit<PipelineSettings, "id" | "updated_at">>
): Promise<PipelineSettings> {
  const { data, error } = await getClient()
    .from("pipeline_settings")
    .upsert({ id: "default", ...partial, updated_at: new Date().toISOString() })
    .select()
    .single();
  if (isPipelineTableMissing(error)) {
    return { ...DEFAULT_PIPELINE_SETTINGS, ...partial, updated_at: new Date().toISOString() };
  }
  if (error) throw new DbError(error.message);
  return data as PipelineSettings;
}

export async function getNextPipelineRunNumber(): Promise<number> {
  const { data, error } = await getClient()
    .from("training_pipeline")
    .select("pipeline_run_number")
    .order("pipeline_run_number", { ascending: false })
    .limit(1)
    .maybeSingle();
  if (isPipelineTableMissing(error)) return 1;
  if (error) return 1;
  return ((data as { pipeline_run_number: number } | null)?.pipeline_run_number ?? 0) + 1;
}

export async function createPipelineRun(row: {
  pipeline_run_number: number;
  previous_model_id: string | null;
  status?: string;
  stage?: string;
}): Promise<TrainingPipelineRun> {
  const { data, error } = await getClient()
    .from("training_pipeline")
    .insert({
      pipeline_run_number: row.pipeline_run_number,
      previous_model_id: row.previous_model_id,
      status: row.status ?? "pending",
      stage: row.stage ?? "collecting",
    })
    .select()
    .single();
  if (error || !data) throw new DbError(error?.message ?? "Failed to create pipeline run");
  return data as TrainingPipelineRun;
}

export async function updatePipelineRun(
  id: string,
  partial: Partial<Omit<TrainingPipelineRun, "id">>
): Promise<TrainingPipelineRun> {
  const { data, error } = await getClient()
    .from("training_pipeline")
    .update(partial)
    .eq("id", id)
    .select()
    .single();
  if (error || !data) throw new DbError(error?.message ?? "Failed to update pipeline run");
  return data as TrainingPipelineRun;
}

export async function getPipelineHistory(limit = 50): Promise<TrainingPipelineRun[]> {
  const { data, error } = await getClient()
    .from("training_pipeline")
    .select("*")
    .order("pipeline_run_number", { ascending: false })
    .limit(limit);
  if (isPipelineTableMissing(error)) return [];
  if (error) throw new DbError(error.message);
  return (data ?? []) as TrainingPipelineRun[];
}

export async function getLatestCompletedPipelineRun(): Promise<TrainingPipelineRun | null> {
  const { data, error } = await getClient()
    .from("training_pipeline")
    .select("*")
    .eq("status", "completed")
    .order("completed_at", { ascending: false })
    .limit(1)
    .maybeSingle();
  if (isPipelineTableMissing(error)) return null;
  if (error) return null;
  return (data as TrainingPipelineRun) ?? null;
}

export async function countTrainingDataSince(since: string): Promise<number> {
  const { count, error } = await getClient()
    .from("training_data")
    .select("*", { count: "exact", head: true })
    .gte("created_at", since);
  if (error) return 0;
  return count ?? 0;
}

export async function getFineTunedModelById(id: string): Promise<FineTunedModel | null> {
  const { data, error } = await getClient()
    .from("fine_tuned_models")
    .select("*")
    .eq("id", id)
    .maybeSingle();
  if (isFineTunedTableMissing(error)) return null;
  if (error) return null;
  return (data as FineTunedModel) ?? null;
}

export async function createNotification(row: {
  type: string;
  title: string;
  message: string;
  metadata?: Record<string, unknown>;
}): Promise<void> {
  const { error } = await getClient().from("notifications").insert({
    type: row.type,
    title: row.title,
    message: row.message,
    metadata: row.metadata ?? null,
  });
  if (isPipelineTableMissing(error)) return;
  if (error?.message?.includes("notifications")) return;
  if (error) throw new DbError(error.message);
}

export async function getNotifications(limit = 20): Promise<AppNotification[]> {
  const { data, error } = await getClient()
    .from("notifications")
    .select("*")
    .order("created_at", { ascending: false })
    .limit(limit);
  if (error?.message?.includes("notifications")) return [];
  if (error) return [];
  return (data ?? []) as AppNotification[];
}

export async function markNotificationRead(id: string): Promise<void> {
  const { error } = await getClient().from("notifications").update({ read: true }).eq("id", id);
  if (error) return;
}

// --- Model providers ---

function isProviderTableMissing(error: { message?: string; code?: string } | null): boolean {
  return (
    !!error?.message?.includes("does not exist") ||
    !!error?.message?.includes("Could not find the table") ||
    error?.code === "PGRST205"
  );
}

export async function getModelProviders(): Promise<ModelProvider[]> {
  const { data, error } = await getClient()
    .from("model_providers")
    .select("*")
    .order("created_at", { ascending: true });
  if (isProviderTableMissing(error)) return [];
  if (error) throw new DbError(error.message);
  return (data ?? []) as ModelProvider[];
}

export async function getActiveModelProvider(): Promise<ModelProvider | null> {
  const { data, error } = await getClient()
    .from("model_providers")
    .select("*")
    .eq("is_active", true)
    .limit(1)
    .maybeSingle();
  if (isProviderTableMissing(error)) return null;
  if (error) return null;
  return (data as ModelProvider) ?? null;
}

export async function createModelProvider(
  row: Omit<ModelProvider, "id" | "created_at" | "is_active" | "avg_latency_ms"> & {
    is_active?: boolean;
    avg_latency_ms?: number | null;
  }
): Promise<ModelProvider> {
  const { data, error } = await getClient()
    .from("model_providers")
    .insert({
      ...row,
      is_active: row.is_active ?? false,
      avg_latency_ms: row.avg_latency_ms ?? null,
    })
    .select()
    .single();
  if (error || !data) throw new DbError(error?.message ?? "Failed to create provider");
  return data as ModelProvider;
}

export async function updateModelProvider(
  id: string,
  partial: Partial<Omit<ModelProvider, "id" | "created_at">>
): Promise<ModelProvider> {
  const { data, error } = await getClient()
    .from("model_providers")
    .update(partial)
    .eq("id", id)
    .select()
    .single();
  if (error || !data) throw new DbError(error?.message ?? "Failed to update provider");
  return data as ModelProvider;
}

export async function activateModelProvider(id: string): Promise<ModelProvider> {
  await getClient().from("model_providers").update({ is_active: false }).neq("id", id);
  return updateModelProvider(id, { is_active: true });
}

export async function deleteModelProvider(id: string): Promise<void> {
  const { error } = await getClient().from("model_providers").delete().eq("id", id);
  if (error) throw new DbError(error.message);
}

export async function updateProviderLatency(id: string, latencyMs: number): Promise<void> {
  const provider = await getClient().from("model_providers").select("avg_latency_ms").eq("id", id).maybeSingle();
  const prev = (provider.data as { avg_latency_ms: number | null } | null)?.avg_latency_ms;
  const next = prev ? Math.round(prev * 0.8 + latencyMs * 0.2) : latencyMs;
  await getClient().from("model_providers").update({ avg_latency_ms: next }).eq("id", id);
}

export async function logProviderRequest(row: {
  provider_id: string | null;
  provider_type: string;
  model_used: string;
  tokens_used: number;
  latency_ms: number;
  score_after?: number;
  success: boolean;
}): Promise<void> {
  const { error } = await getClient().from("provider_request_logs").insert({
    provider_id: row.provider_id,
    provider_type: row.provider_type,
    model_used: row.model_used,
    tokens_used: row.tokens_used,
    latency_ms: row.latency_ms,
    score_after: row.score_after ?? null,
    success: row.success,
  });
  if (isProviderTableMissing(error)) return;
  if (error?.message?.includes("provider_request_logs")) return;
}

export async function getProviderCostStats(): Promise<ProviderCostStats> {
  const since = new Date();
  since.setDate(1);
  since.setHours(0, 0, 0, 0);
  const sinceIso = since.toISOString();

  const [logsRes, providers] = await Promise.all([
    getClient()
      .from("provider_request_logs")
      .select("*")
      .gte("created_at", sinceIso),
    getModelProviders(),
  ]);

  const logs = (logsRes.data ?? []) as Array<{
    provider_type: string;
    tokens_used: number;
    latency_ms: number | null;
    score_after: number | null;
    success: boolean;
  }>;

  const openaiCostPer1k =
    providers.find((p) => p.provider_type === "openai" && p.is_active)?.cost_per_1k_tokens ?? 0.03;
  const selfHosted = providers.find((p) => p.provider_type !== "openai" && p.is_active);
  const selfHostedCostPer1k = selfHosted?.cost_per_1k_tokens ?? 0.002;

  let openaiRequests = 0;
  let selfHostedRequests = 0;
  let openaiTokens = 0;
  let selfHostedTokens = 0;
  let openaiLatency: number[] = [];
  let selfHostedLatency: number[] = [];
  let openaiScores: number[] = [];
  let selfHostedScores: number[] = [];
  let selfHostedSuccess = 0;
  let selfHostedTotal = 0;

  for (const log of logs) {
    const isOpenAI = log.provider_type === "openai";
    if (isOpenAI) {
      openaiRequests++;
      openaiTokens += log.tokens_used;
      if (log.latency_ms) openaiLatency.push(log.latency_ms);
      if (log.score_after) openaiScores.push(log.score_after);
    } else {
      selfHostedRequests++;
      selfHostedTokens += log.tokens_used;
      selfHostedTotal++;
      if (log.success) selfHostedSuccess++;
      if (log.latency_ms) selfHostedLatency.push(log.latency_ms);
      if (log.score_after) selfHostedScores.push(log.score_after);
    }
  }

  const openaiCost = (openaiTokens / 1000) * openaiCostPer1k;
  const selfHostedCost = (selfHostedTokens / 1000) * selfHostedCostPer1k;
  const openaiHypothetical = (selfHostedTokens / 1000) * openaiCostPer1k;
  const totalSaved = Math.max(0, openaiHypothetical - selfHostedCost);

  const avg = (nums: number[]) =>
    nums.length > 0 ? Math.round(nums.reduce((a, b) => a + b, 0) / nums.length) : 0;

  return {
    openaiRequests,
    selfHostedRequests,
    openaiCost: Math.round(openaiCost * 100) / 100,
    selfHostedCost: Math.round(selfHostedCost * 100) / 100,
    totalSaved: Math.round(totalSaved * 100) / 100,
    projectedAnnualSavings: Math.round(totalSaved * 12 * 100) / 100,
    openaiAvgLatencyMs: avg(openaiLatency),
    selfHostedAvgLatencyMs: avg(selfHostedLatency),
    openaiAvgScore: avg(openaiScores),
    selfHostedAvgScore: avg(selfHostedScores),
    selfHostedUptimePercent:
      selfHostedTotal > 0 ? Math.round((selfHostedSuccess / selfHostedTotal) * 100) : 100,
    openaiCostPer1k: openaiCostPer1k,
    selfHostedCostPer1k: selfHostedCostPer1k,
  };
}

// --- LoopModel API (developer platform) ---

function isLoopModelTableMissing(error: { message?: string; code?: string } | null): boolean {
  return (
    !!error?.message?.includes("does not exist") ||
    !!error?.message?.includes("Could not find the table") ||
    error?.code === "PGRST205"
  );
}

export async function getOrCreateDefaultDeveloper(): Promise<LoopModelDeveloper> {
  const { data } = await getClient()
    .from("loopmodel_developers")
    .select("*")
    .order("created_at", { ascending: true })
    .limit(1)
    .maybeSingle();
  if (data) return data as LoopModelDeveloper;

  const { data: created, error } = await getClient()
    .from("loopmodel_developers")
    .insert({ name: "RefineAI Platform", email: "platform@refineai.app", plan: "enterprise" })
    .select()
    .single();
  if (error || !created) throw new DbError(error?.message ?? "Failed to create developer");
  return created as LoopModelDeveloper;
}

export async function createLoopModelDeveloper(row: {
  name: string;
  email?: string;
  plan?: string;
}): Promise<LoopModelDeveloper> {
  const { data, error } = await getClient()
    .from("loopmodel_developers")
    .insert({
      name: row.name,
      email: row.email ?? null,
      plan: row.plan ?? "free",
    })
    .select()
    .single();
  if (error || !data) throw new DbError(error?.message ?? "Failed to create developer");
  return data as LoopModelDeveloper;
}

export async function getLoopModelDevelopers(): Promise<LoopModelDeveloper[]> {
  const { data, error } = await getClient()
    .from("loopmodel_developers")
    .select("*")
    .order("created_at", { ascending: false });
  if (isLoopModelTableMissing(error)) return [];
  if (error) throw new DbError(error.message);
  return (data ?? []) as LoopModelDeveloper[];
}

export async function createLoopModelApiKey(row: {
  developer_id: string;
  key_prefix: string;
  key_hash: string;
  name: string;
}): Promise<LoopModelApiKey> {
  const { data, error } = await getClient()
    .from("loopmodel_api_keys")
    .insert(row)
    .select()
    .single();
  if (error || !data) throw new DbError(error?.message ?? "Failed to create API key");
  return data as LoopModelApiKey;
}

export async function getLoopModelApiKeys(developerId?: string): Promise<LoopModelApiKey[]> {
  let query = getClient().from("loopmodel_api_keys").select("*").order("created_at", { ascending: false });
  if (developerId) query = query.eq("developer_id", developerId);
  const { data, error } = await query;
  if (isLoopModelTableMissing(error)) return [];
  if (error) throw new DbError(error.message);
  return (data ?? []) as LoopModelApiKey[];
}

export async function getLoopModelApiKeyByHash(
  hash: string
): Promise<(LoopModelApiKey & { developer_id: string }) | null> {
  const { data, error } = await getClient()
    .from("loopmodel_api_keys")
    .select("*")
    .eq("key_hash", hash)
    .eq("is_active", true)
    .maybeSingle();
  if (isLoopModelTableMissing(error)) return null;
  if (error) return null;
  return (data as LoopModelApiKey) ?? null;
}

export async function revokeLoopModelApiKey(id: string): Promise<void> {
  await getClient().from("loopmodel_api_keys").update({ is_active: false }).eq("id", id);
}

export async function touchLoopModelApiKey(id: string): Promise<void> {
  await getClient()
    .from("loopmodel_api_keys")
    .update({ last_used_at: new Date().toISOString() })
    .eq("id", id);
}

export async function logLoopModelApiUsage(row: {
  api_key_id: string;
  developer_id: string;
  endpoint: string;
  model_used: string;
  tokens_used: number;
  latency_ms: number;
  status: string;
}): Promise<void> {
  const { error } = await getClient().from("loopmodel_api_usage").insert(row);
  if (isLoopModelTableMissing(error)) return;
  if (error?.message?.includes("loopmodel_api_usage")) return;
}

export async function getLoopModelDashboard(): Promise<LoopModelDashboard> {
  const monthStart = new Date();
  monthStart.setDate(1);
  monthStart.setHours(0, 0, 0, 0);
  const todayStart = new Date();
  todayStart.setHours(0, 0, 0, 0);

  const [usageRes, devsRes, keysRes] = await Promise.all([
    getClient().from("loopmodel_api_usage").select("*").gte("created_at", monthStart.toISOString()),
    getClient().from("loopmodel_developers").select("id"),
    getClient().from("loopmodel_api_keys").select("id, is_active"),
  ]);

  const usage = (usageRes.data ?? []) as LoopModelApiUsage[];
  const devs = devsRes.data ?? [];
  const keys = (keysRes.data ?? []) as Array<{ id: string; is_active: boolean }>;

  const totalTokens = usage.reduce((s, u) => s + (u.tokens_used ?? 0), 0);
  const apiRevenue = (totalTokens / 1000) * 0.002;
  const subscriberCount = Math.max(1, devs.length);
  const refineaiRevenue = subscriberCount * 29;

  const modelCounts = new Map<string, number>();
  for (const u of usage) {
    const m = u.model_used ?? "unknown";
    modelCounts.set(m, (modelCounts.get(m) ?? 0) + 1);
  }
  const topModels = Array.from(modelCounts.entries())
    .sort((a, b) => b[1] - a[1])
    .slice(0, 5)
    .map(([model, requests]) => ({ model, requests }));

  const requestsToday = usage.filter((u) => u.created_at >= todayStart.toISOString()).length;

  return {
    totalRequests: usage.length,
    totalTokens,
    externalDevelopers: Math.max(0, devs.length - 1),
    activeApiKeys: keys.filter((k) => k.is_active).length,
    revenueThisMonth: Math.round((apiRevenue + refineaiRevenue) * 100) / 100,
    refineaiSubscriberRevenue: refineaiRevenue,
    apiInfrastructureRevenue: Math.round(apiRevenue * 100) / 100,
    projectedAnnualApiRevenue: Math.round(apiRevenue * 12 * 100) / 100,
    requestsToday,
    topModels,
  };
}

// --- Jobs, rate limits, help, status, admin ---

function isScaleTableMissing(error: { message?: string; code?: string } | null): boolean {
  return (
    !!error?.message?.includes("does not exist") ||
    !!error?.message?.includes("Could not find the table") ||
    error?.code === "PGRST205"
  );
}

export async function createJob(
  jobType: string,
  payload: Record<string, unknown>
): Promise<JobRecord> {
  const { data, error } = await getClient()
    .from("jobs")
    .insert({ job_type: jobType, status: "queued", payload })
    .select()
    .single();
  if (error || !data) throw new DbError(error?.message ?? "Failed to create job");
  return data as JobRecord;
}

export async function getJob(id: string): Promise<JobRecord | null> {
  const { data, error } = await getClient().from("jobs").select("*").eq("id", id).maybeSingle();
  if (isScaleTableMissing(error)) return null;
  if (error) return null;
  return (data as JobRecord) ?? null;
}

export async function startJob(id: string): Promise<void> {
  await getClient().from("jobs").update({ status: "running" }).eq("id", id);
}

export async function updateJobProgress(
  id: string,
  progress: Record<string, unknown>
): Promise<void> {
  const job = await getJob(id);
  if (!job) return;
  const result = { ...(job.result ?? {}), progress };
  await getClient().from("jobs").update({ result }).eq("id", id);
}

export async function completeJob(id: string, result: Record<string, unknown>): Promise<void> {
  await getClient()
    .from("jobs")
    .update({
      status: "completed",
      result,
      completed_at: new Date().toISOString(),
    })
    .eq("id", id);
}

export async function failJob(id: string, errorMessage: string): Promise<void> {
  await getClient()
    .from("jobs")
    .update({
      status: "failed",
      error: errorMessage,
      completed_at: new Date().toISOString(),
    })
    .eq("id", id);
}

export async function recordRateLimitEvent(clientKey: string, tier: string): Promise<void> {
  const { error } = await getClient()
    .from("rate_limit_events")
    .insert({ client_key: clientKey, tier });
  if (isScaleTableMissing(error)) return;
}

export async function countRateLimitEvents(clientKey: string, since: string): Promise<number> {
  const { count, error } = await getClient()
    .from("rate_limit_events")
    .select("*", { count: "exact", head: true })
    .eq("client_key", clientKey)
    .gte("created_at", since);
  if (error) return 0;
  return count ?? 0;
}

export async function logHelpQuestion(row: {
  question: string;
  answer: string;
  confidence: number;
  escalated: boolean;
}): Promise<void> {
  const { error } = await getClient().from("help_questions").insert(row);
  if (isScaleTableMissing(error)) return;
}

export async function getStatusPageData(): Promise<StatusPageData> {
  const since90 = new Date(Date.now() - 90 * 24 * 60 * 60 * 1000).toISOString();

  const [incidentsRes, usageRes, logsRes] = await Promise.all([
    getClient().from("status_incidents").select("*").order("started_at", { ascending: false }).limit(10),
    getClient().from("loopmodel_api_usage").select("status, created_at").gte("created_at", since90),
    getClient().from("provider_request_logs").select("success, created_at").gte("created_at", since90),
  ]);

  const usage = usageRes.data ?? [];
  const logs = logsRes.data ?? [];
  const totalApi = usage.length;
  const successApi = usage.filter((u: { status: string }) => u.status === "success").length;
  const apiUptime = totalApi > 0 ? Math.round((successApi / totalApi) * 10000) / 100 : 99.9;

  const totalProv = logs.length;
  const successProv = logs.filter((l: { success: boolean }) => l.success).length;
  const loopUptime = totalProv > 0 ? Math.round((successProv / totalProv) * 10000) / 100 : 99.9;

  const uptime90 = Math.round(((apiUptime + loopUptime) / 2) * 100) / 100;
  const overall: StatusPageData["overall"] =
    uptime90 >= 99 ? "operational" : uptime90 >= 95 ? "degraded" : "outage";

  return {
    overall,
    uptime90Days: uptime90,
    apiUptime,
    loopApiUptime: loopUptime,
    incidents: (incidentsRes.data ?? []) as StatusPageData["incidents"],
  };
}

export async function subscribeStatusUpdates(email: string): Promise<void> {
  const { error } = await getClient()
    .from("status_subscribers")
    .upsert({ email: email.trim().toLowerCase() }, { onConflict: "email" });
  if (isScaleTableMissing(error)) return;
  if (error) throw new DbError(error.message);
}

export async function getAdminMetrics(): Promise<AdminMetrics> {
  const weekAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString();
  const monthAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString();
  const dayAgo = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString();

  const [devs, usage, help, dashboard] = await Promise.all([
    getLoopModelDevelopers(),
    getClient().from("loopmodel_api_usage").select("developer_id, tokens_used, created_at"),
    getClient()
      .from("help_questions")
      .select("id, escalated, created_at")
      .gte("created_at", weekAgo),
    getLoopModelDashboard(),
  ]);

  const usageRows = (usage.data ?? []) as Array<{
    developer_id: string | null;
    tokens_used: number;
    created_at: string;
  }>;

  const mrr = dashboard.refineaiSubscriberRevenue + dashboard.apiInfrastructureRevenue;
  const months = ["Jan", "Feb", "Mar", "Apr", "May", "Jun"];
  const mrrTrend = months.map((month, i) => ({
    month,
    mrr: Math.round(mrr * (0.7 + i * 0.06) * 100) / 100,
  }));

  const newSignups = devs.filter((d) => d.created_at >= weekAgo).length;
  const escalated = (help.data ?? []).filter((h: { escalated: boolean }) => h.escalated).length;

  const customerUsage = new Map<string, { requests: number; tokens: number }>();
  for (const row of usageRows) {
    const id = row.developer_id ?? "unknown";
    const cur = customerUsage.get(id) ?? { requests: 0, tokens: 0 };
    cur.requests++;
    cur.tokens += row.tokens_used ?? 0;
    customerUsage.set(id, cur);
  }

  const topApiCustomers = devs
    .map((d) => ({
      name: d.name,
      ...(customerUsage.get(d.id) ?? { requests: 0, tokens: 0 }),
    }))
    .sort((a, b) => b.requests - a.requests)
    .slice(0, 5);

  const activeDaily = new Set(
    usageRows.filter((r) => r.created_at >= dayAgo).map((r) => r.developer_id)
  ).size;
  const activeWeekly = new Set(
    usageRows.filter((r) => r.created_at >= weekAgo).map((r) => r.developer_id)
  ).size;
  const activeMonthly = new Set(usageRows.map((r) => r.developer_id)).size;

  return {
    mrr: Math.round(mrr * 100) / 100,
    mrrTrend,
    churnRate: devs.length > 0 ? Math.round((1 / Math.max(devs.length, 1)) * 1000) / 10 : 0,
    newSignupsThisWeek: newSignups,
    activeUsersDaily: Math.max(activeDaily, 1),
    activeUsersWeekly: Math.max(activeWeekly, devs.length),
    activeUsersMonthly: Math.max(activeMonthly, devs.length),
    topApiCustomers,
    supportTicketsThisWeek: escalated,
  };
}
