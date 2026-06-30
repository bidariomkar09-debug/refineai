import type { TrainingDataRow } from "./settingsTypes";

const OPENAI_SYSTEM_PROMPT =
  "You are a loop refining AI. Generate high-quality code, review it honestly, and refine based on critique until production-ready.";

export type LlamaAlpacaExample = {
  instruction: string;
  input: string;
  output: string;
};

export function toLlamaAlpacaFromClean(row: {
  target: string;
  input_context: string | null;
  final_output: string;
  output?: string;
}): LlamaAlpacaExample {
  return {
    instruction: `Generate, critique and refine code for: ${row.target}`,
    input: row.input_context ?? "",
    output: row.final_output || row.output || "",
  };
}

export function toLlamaAlpacaJSONL(
  rows: Array<{
    target: string;
    input_context: string | null;
    final_output: string;
    output?: string;
  }>
): string {
  return rows.map((row) => JSON.stringify(toLlamaAlpacaFromClean(row))).join("\n");
}

export type OpenAIFineTuningExample = {
  messages: Array<{ role: "system" | "user" | "assistant"; content: string }>;
};

export type HuggingFaceExample = {
  input: string;
  context: string;
  output: string;
  critique: string | null;
  refined: string | null;
  score: number;
  successful: boolean;
};

export type HuggingFaceDataset = {
  data: HuggingFaceExample[];
};

export type TrainingDataExport = {
  meta: {
    count: number;
    exported_at: string;
  };
  raw: TrainingDataRow[];
  openai_finetuning: OpenAIFineTuningExample[];
  huggingface: HuggingFaceDataset;
};

function taskLabel(taskType: string | null): string {
  switch (taskType) {
    case "code_review":
      return "critique the code";
    case "code_refine":
      return "critique and refine";
    default:
      return "critique and refine";
  }
}

export function toOpenAIFineTuning(rows: TrainingDataRow[]): OpenAIFineTuningExample[] {
  return rows.map((row) => ({
    messages: [
      { role: "system", content: OPENAI_SYSTEM_PROMPT },
      {
        role: "user",
        content: `[TARGET]: ${row.target}\n[ROUND]: ${row.round_number}\n[PREVIOUS OUTPUT]: ${row.output}\n[TASK]: ${taskLabel(row.task_type)}`,
      },
      {
        role: "assistant",
        content: `${row.final_output ?? row.output}\n[SCORE]: ${row.score_after}`,
      },
    ],
  }));
}

export function toOpenAIJSONL(rows: TrainingDataRow[]): string {
  return toOpenAIFineTuning(rows)
    .map((example) => JSON.stringify(example))
    .join("\n");
}

export function toHuggingFaceDataset(rows: TrainingDataRow[]): HuggingFaceDataset {
  return {
    data: rows.map((row) => ({
      input: row.target,
      context: row.input_context ?? "",
      output: row.output,
      critique: row.critique,
      refined: row.final_output,
      score: row.score_after,
      successful: row.was_successful,
    })),
  };
}

function escapeCsv(value: string | number | boolean | null | undefined): string {
  if (value === null || value === undefined) return "";
  const str = String(value);
  if (str.includes(",") || str.includes('"') || str.includes("\n")) {
    return `"${str.replace(/"/g, '""')}"`;
  }
  return str;
}

const CSV_COLUMNS: Array<keyof TrainingDataRow> = [
  "id",
  "session_id",
  "project_id",
  "target",
  "round_number",
  "input_context",
  "output",
  "critique",
  "score_before",
  "score_after",
  "score_improvement",
  "improvement_summary",
  "final_output",
  "was_successful",
  "reached_threshold",
  "rounds_to_complete",
  "model_used",
  "temperature",
  "tokens_used",
  "project_type",
  "file_type",
  "task_type",
  "created_at",
];

export function toCSV(rows: TrainingDataRow[]): string {
  const header = CSV_COLUMNS.join(",");
  const lines = rows.map((row) =>
    CSV_COLUMNS.map((col) => escapeCsv(row[col] as string | number | boolean | null)).join(",")
  );
  return [header, ...lines].join("\n");
}

export function buildTrainingDataExport(rows: TrainingDataRow[]): TrainingDataExport {
  return {
    meta: {
      count: rows.length,
      exported_at: new Date().toISOString(),
    },
    raw: rows,
    openai_finetuning: toOpenAIFineTuning(rows),
    huggingface: toHuggingFaceDataset(rows),
  };
}
