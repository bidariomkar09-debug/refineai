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
