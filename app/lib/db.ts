import { getSupabaseClient, SupabaseConfigError } from "./supabaseClient";
import type { Iteration, LoopTask } from "./types";

export type DbSession = {
  id: string;
  target: string;
  status: "running" | "completed" | "stopped";
  final_output: string | null;
  created_at: string;
};

export type DbRound = {
  id: string;
  session_id: string;
  round_number: number;
  output: string | null;
  critique: string | null;
  score: number;
  created_at: string;
};

export class DbError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "DbError";
  }
}

function inferTaskFromRoundNumber(roundNumber: number): LoopTask {
  if (roundNumber === 1) return "generate";
  return roundNumber % 2 === 0 ? "critique" : "refine";
}

export function dbRoundToIteration(round: DbRound): Iteration {
  const task = inferTaskFromRoundNumber(round.round_number);
  const content =
    task === "critique" ? (round.critique ?? "") : (round.output ?? "");

  return {
    round: round.round_number,
    task,
    content,
    score: round.score,
  };
}

export async function testConnection(): Promise<void> {
  try {
    const supabase = getSupabaseClient();
    const { error } = await supabase.from("sessions").select("id").limit(1);

    if (error) {
      throw new DbError(
        error.message.includes("does not exist")
          ? "Database tables not found. Run supabase/schema.sql in your Supabase SQL Editor."
          : error.message
      );
    }
  } catch (err) {
    if (err instanceof SupabaseConfigError) throw err;
    if (err instanceof DbError) throw err;
    throw new DbError(
      err instanceof Error ? err.message : "Failed to connect to Supabase"
    );
  }
}

export async function createSession(target: string): Promise<DbSession> {
  const supabase = getSupabaseClient();
  const { data, error } = await supabase
    .from("sessions")
    .insert({ target, status: "running" })
    .select()
    .single();

  if (error || !data) {
    throw new DbError(error?.message ?? "Failed to create session");
  }

  return data as DbSession;
}

export async function saveRound(
  sessionId: string,
  iteration: Iteration
): Promise<void> {
  const supabase = getSupabaseClient();

  const row: {
    session_id: string;
    round_number: number;
    output: string | null;
    critique: string | null;
    score: number;
  } =
    iteration.task === "critique"
      ? {
          session_id: sessionId,
          round_number: iteration.round,
          output: null,
          critique: iteration.content,
          score: iteration.score,
        }
      : {
          session_id: sessionId,
          round_number: iteration.round,
          output: iteration.content,
          critique: null,
          score: iteration.score,
        };

  const { error } = await supabase.from("rounds").insert(row);

  if (error) {
    throw new DbError(error.message);
  }
}

export async function completeSession(
  sessionId: string,
  finalOutput: string
): Promise<void> {
  const supabase = getSupabaseClient();
  const { error } = await supabase
    .from("sessions")
    .update({ status: "completed", final_output: finalOutput })
    .eq("id", sessionId);

  if (error) {
    throw new DbError(error.message);
  }
}

export async function stopSession(
  sessionId: string,
  finalOutput: string
): Promise<void> {
  const supabase = getSupabaseClient();
  const { error } = await supabase
    .from("sessions")
    .update({ status: "stopped", final_output: finalOutput })
    .eq("id", sessionId);

  if (error) {
    throw new DbError(error.message);
  }
}

export async function getSessions(limit = 50): Promise<DbSession[]> {
  const supabase = getSupabaseClient();
  const { data, error } = await supabase
    .from("sessions")
    .select("*")
    .order("created_at", { ascending: false })
    .limit(limit);

  if (error) {
    throw new DbError(error.message);
  }

  return (data ?? []) as DbSession[];
}

export async function getSessionRounds(sessionId: string): Promise<DbRound[]> {
  const supabase = getSupabaseClient();
  const { data, error } = await supabase
    .from("rounds")
    .select("*")
    .eq("session_id", sessionId)
    .order("round_number", { ascending: true });

  if (error) {
    throw new DbError(error.message);
  }

  return (data ?? []) as DbRound[];
}

export async function getSessionById(
  sessionId: string
): Promise<DbSession | null> {
  const supabase = getSupabaseClient();
  const { data, error } = await supabase
    .from("sessions")
    .select("*")
    .eq("id", sessionId)
    .single();

  if (error) {
    if (error.code === "PGRST116") return null;
    throw new DbError(error.message);
  }

  return data as DbSession;
}
