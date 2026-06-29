import { FILE_TASK_SYSTEM_PROMPT } from "./agentAI";
import type { TrainingDataRow } from "./settingsTypes";

export type OpenAIFineTuningExample = {
  messages: Array<{ role: "system" | "user" | "assistant"; content: string }>;
};

export type HuggingFaceDataset = {
  features: Record<string, string>;
  data: Array<Record<string, string | number | boolean | null>>;
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

export function toOpenAIFineTuning(rows: TrainingDataRow[]): OpenAIFineTuningExample[] {
  return rows.map((row) => ({
    messages: [
      { role: "system", content: FILE_TASK_SYSTEM_PROMPT },
      { role: "user", content: row.input_context },
      { role: "assistant", content: row.output },
    ],
  }));
}

export function toHuggingFaceDataset(rows: TrainingDataRow[]): HuggingFaceDataset {
  return {
    features: {
      instruction: "string",
      input: "string",
      output: "string",
      critique: "string",
      score_before: "int32",
      score_after: "int32",
      improvement: "string",
      was_successful: "bool",
      model_used: "string",
      session_id: "string",
      round_number: "int32",
    },
    data: rows.map((row) => ({
      instruction: row.target,
      input: row.input_context,
      output: row.output,
      critique: row.critique,
      score_before: row.score_before,
      score_after: row.score_after,
      improvement: row.improvement,
      was_successful: row.was_successful,
      model_used: row.model_used,
      session_id: row.session_id,
      round_number: row.round_number,
    })),
  };
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
