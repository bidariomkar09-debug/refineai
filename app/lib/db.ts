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
  DashboardStats,
  DatasetFile,
  EvaluationStats,
  ProjectWithStats,
  UserSettings,
} from "./settingsTypes";

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
  if (error?.message?.includes("does not exist") || error?.code === "PGRST116") {
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
