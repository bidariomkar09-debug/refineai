import { toFile } from "openai/uploads";
import { getOpenAIClient, OpenAIClientError } from "./agentAI";
import type { FineTuningJobStatus, ModelComparisonResult } from "./settingsTypes";

export const FINE_TUNE_BASE_MODEL = "gpt-4o-2024-08-06";
export const FINE_TUNE_SUFFIX = "refineai-loop-v1";
export const COMPARISON_BASE_MODEL = "gpt-4o";

export async function uploadFineTuningFile(
  jsonlContent: string,
  filename = "refineai-clean-finetuning.jsonl"
): Promise<string> {
  const client = getOpenAIClient();
  const file = await toFile(Buffer.from(jsonlContent, "utf-8"), filename, {
    type: "application/jsonl",
  });
  const uploaded = await client.files.create({
    file,
    purpose: "fine-tune",
  });
  if (!uploaded.id) throw new OpenAIClientError("Upload failed: no file id", 502);
  return uploaded.id;
}

export async function createFineTuningJob(
  fileId: string
): Promise<{ jobId: string; status: string }> {
  const client = getOpenAIClient();
  const job = await client.fineTuning.jobs.create({
    training_file: fileId,
    model: FINE_TUNE_BASE_MODEL,
    suffix: FINE_TUNE_SUFFIX,
  });
  if (!job.id) throw new OpenAIClientError("Failed to create fine-tuning job", 502);
  return { jobId: job.id, status: job.status };
}

export function mapOpenAIJobStatus(
  openaiStatus: string
): FineTuningJobStatus["status"] {
  switch (openaiStatus) {
    case "validating_files":
    case "queued":
      return "queued";
    case "running":
      return "running";
    case "succeeded":
      return "succeeded";
    case "failed":
    case "cancelled":
      return "failed";
    default:
      return "running";
  }
}

export async function fetchFineTuningJobStatus(jobId: string): Promise<FineTuningJobStatus> {
  const client = getOpenAIClient();
  const job = await client.fineTuning.jobs.retrieve(jobId);
  const events = await client.fineTuning.jobs.listEvents(jobId, { limit: 20 });

  let progressPercent: number | null = null;
  const progressEvent = events.data.find((e) => e.type === "metrics" || e.message?.includes("%"));
  if (progressEvent?.data && typeof progressEvent.data === "object") {
    const data = progressEvent.data as { train_loss?: number; step?: number; total_steps?: number };
    if (data.total_steps && data.step) {
      progressPercent = Math.min(100, Math.round((data.step / data.total_steps) * 100));
    }
  }

  if (job.status === "running" && job.trained_tokens && job.estimated_finish) {
    const created = new Date(job.created_at * 1000).getTime();
    const estimated = job.estimated_finish * 1000;
    const now = Date.now();
    if (estimated > created) {
      progressPercent = progressPercent ?? Math.min(95, Math.round(((now - created) / (estimated - created)) * 100));
    }
  }

  if (job.status === "succeeded") progressPercent = 100;

  return {
    jobId: job.id,
    status: mapOpenAIJobStatus(job.status),
    modelId: job.fine_tuned_model,
    trainedTokens: job.trained_tokens ?? null,
    estimatedFinish: job.estimated_finish
      ? new Date(job.estimated_finish * 1000).toISOString()
      : null,
    errorMessage: job.error?.message ?? null,
    progressPercent,
  };
}

function roundsFromScore(score: number): number {
  if (score >= 95) return 1;
  return Math.max(2, Math.ceil((95 - score) / 5) + 1);
}

async function scoreOutput(prompt: string, output: string): Promise<number> {
  const client = getOpenAIClient();
  const response = await client.chat.completions.create({
    model: COMPARISON_BASE_MODEL,
    temperature: 0,
    response_format: { type: "json_object" },
    messages: [
      {
        role: "system",
        content:
          'Score code/output quality 0-100. JSON only: { "score": number }',
      },
      {
        role: "user",
        content: `Task:\n${prompt}\n\nOutput:\n${output}`,
      },
    ],
  });
  const content = response.choices[0]?.message?.content;
  if (!content) return 0;
  try {
    const parsed = JSON.parse(content) as { score?: number };
    return Math.min(100, Math.max(0, Math.round(parsed.score ?? 0)));
  } catch {
    return 0;
  }
}

async function generateWithModel(model: string, prompt: string): Promise<string> {
  const client = getOpenAIClient();
  const response = await client.chat.completions.create({
    model,
    temperature: 0.7,
    messages: [
      {
        role: "system",
        content:
          "You are RefineAI, an expert software engineer. Produce production-ready code.",
      },
      { role: "user", content: prompt },
    ],
  });
  return response.choices[0]?.message?.content ?? "";
}

export async function compareModels(
  prompt: string,
  fineTunedModelId: string
): Promise<ModelComparisonResult> {
  const [baseOutput, fineTunedOutput] = await Promise.all([
    generateWithModel(COMPARISON_BASE_MODEL, prompt),
    generateWithModel(fineTunedModelId, prompt),
  ]);

  const [baseScore, fineTunedScore] = await Promise.all([
    scoreOutput(prompt, baseOutput),
    scoreOutput(prompt, fineTunedOutput),
  ]);

  const baseRounds = roundsFromScore(baseScore);
  const fineTunedRounds = roundsFromScore(fineTunedScore);

  let winner: ModelComparisonResult["winner"] = "tie";
  if (fineTunedScore > baseScore) winner = "fine_tuned";
  else if (baseScore > fineTunedScore) winner = "base";

  let roundsWinner: ModelComparisonResult["roundsWinner"] = "tie";
  if (fineTunedRounds < baseRounds) roundsWinner = "fine_tuned";
  else if (baseRounds < fineTunedRounds) roundsWinner = "base";

  return {
    prompt,
    baseModel: COMPARISON_BASE_MODEL,
    fineTunedModel: fineTunedModelId,
    baseOutput,
    fineTunedOutput,
    baseScore,
    fineTunedScore,
    baseRounds,
    fineTunedRounds,
    winner,
    roundsWinner,
  };
}

export function formatOpenAIError(err: unknown): string {
  if (err instanceof OpenAIClientError) return err.message;
  if (err instanceof Error) return err.message;
  return "OpenAI request failed";
}
