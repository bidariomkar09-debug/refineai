import { createClient, SupabaseClient } from "@supabase/supabase-js";
import type {
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
  ProjectWithStats,
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

export async function addMessage(
  projectId: string,
  role: "user" | "assistant",
  content: string,
  type: MessageType = "chat",
  metadata: Record<string, unknown> = {}
): Promise<DbMessage> {
  const { data, error } = await getClient()
    .from("messages")
    .insert({ project_id: projectId, role, content, type, metadata })
    .select()
    .single();
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
  temperature = 0.7
): Promise<string> {
  const { data, error } = await getClient()
    .from("sessions")
    .insert({
      target,
      status: "running",
      model,
      temperature,
    })
    .select("id")
    .single();
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
