import OpenAI from "openai";
import type { DeveloperConfig } from "./developerConfig";
import type { ApiCallSnapshot, LoopTask, LoopTaskResult, TokenUsage } from "./types";

const JSON_SCHEMA_INSTRUCTION = `
Always respond with valid JSON only, no markdown fences. Use this exact schema:
- For "generate" and "refine" tasks: { "output": "<your content>", "score": <0-100>, "round": <N>, "critique": "<optional note>" }
- For "critique" task: { "critique": "<what is missing or wrong>", "score": <0-100>, "round": <N> }`;

const TEXT_SCORE_INSTRUCTION = `
End your response with a line exactly like: SCORE: [0-100]
Put your main content before that line. Score honestly based on how well the output matches the target.`;

export class OpenAIClientError extends Error {
  constructor(
    message: string,
    public readonly statusCode: number = 500
  ) {
    super(message);
    this.name = "OpenAIClientError";
  }
}

function getClient(): OpenAI {
  const apiKey = process.env.OPENAI_API_KEY;
  if (!apiKey) {
    throw new OpenAIClientError(
      "OPENAI_API_KEY is not configured. Add it to .env.local",
      500
    );
  }
  return new OpenAI({ apiKey });
}

function buildUserMessage(params: {
  target: string;
  currentOutput?: string;
  lastCritique?: string;
  round: number;
  task: LoopTask;
}): string {
  const lines = [
    `[Target]: ${params.target}`,
    `[Round]: ${params.round}`,
    `[Task]: ${params.task}`,
  ];

  if (params.currentOutput) {
    lines.splice(1, 0, `[Current Output]: ${params.currentOutput}`);
  }

  if (params.lastCritique) {
    lines.splice(
      params.currentOutput ? 2 : 1,
      0,
      `[Last Critique]: ${params.lastCritique}`
    );
  }

  return lines.join("\n");
}

function buildSystemPrompt(
  basePrompt: string,
  jsonMode: boolean,
  task: LoopTask
): string {
  if (jsonMode) {
    return `${basePrompt}\n${JSON_SCHEMA_INSTRUCTION}\nCurrent task: ${task}`;
  }
  return `${basePrompt}\n${TEXT_SCORE_INSTRUCTION}\nCurrent task: ${task}`;
}

function clampScore(score: unknown): number {
  const num = typeof score === "number" ? score : Number(score);
  if (Number.isNaN(num)) return 0;
  return Math.min(100, Math.max(0, Math.round(num)));
}

function parseTextResult(raw: string, task: LoopTask): LoopTaskResult {
  const scoreMatch = raw.match(/SCORE:\s*(\d+)/i);
  const score = scoreMatch ? clampScore(scoreMatch[1]) : 0;
  const content = raw.replace(/\n?SCORE:\s*\d+\s*$/i, "").trim();

  if (task === "critique") {
    return { critique: content, score };
  }
  return { output: content, score };
}

function parseJsonResult(raw: string, task: LoopTask): LoopTaskResult {
  let parsed: Record<string, unknown>;
  try {
    parsed = JSON.parse(raw);
  } catch {
    throw new OpenAIClientError("Failed to parse AI response as JSON", 502);
  }

  const score = clampScore(parsed.score);

  if (task === "critique") {
    const critique =
      typeof parsed.critique === "string" ? parsed.critique.trim() : "";
    if (!critique) {
      throw new OpenAIClientError("AI response missing critique field", 502);
    }
    return { critique, score, rawContent: raw };
  }

  const output =
    typeof parsed.output === "string" ? parsed.output.trim() : "";
  if (!output) {
    throw new OpenAIClientError("AI response missing output field", 502);
  }
  return { output, score, rawContent: raw };
}

export type CallLoopTaskParams = {
  target: string;
  currentOutput?: string;
  lastCritique?: string;
  round: number;
  task: LoopTask;
  systemPrompt: string;
  model: string;
  temperature: number;
  jsonMode: boolean;
};

export type CallLoopTaskResult = LoopTaskResult & {
  usage: TokenUsage;
  apiSnapshot: ApiCallSnapshot;
};

export async function callLoopTask(
  params: CallLoopTaskParams
): Promise<CallLoopTaskResult> {
  const client = getClient();
  const userMessage = buildUserMessage(params);
  const systemContent = buildSystemPrompt(
    params.systemPrompt,
    params.jsonMode,
    params.task
  );

  const messages = [
    { role: "system" as const, content: systemContent },
    { role: "user" as const, content: userMessage },
  ];

  const apiSnapshot: ApiCallSnapshot = {
    model: params.model,
    temperature: params.temperature,
    systemPrompt: systemContent,
    messages: messages.map((m) => ({ role: m.role, content: m.content })),
    jsonMode: params.jsonMode,
    round: params.round,
    task: params.task,
  };

  try {
    const response = await client.chat.completions.create({
      model: params.model,
      temperature: params.temperature,
      max_tokens: 2048,
      ...(params.jsonMode
        ? { response_format: { type: "json_object" as const } }
        : {}),
      messages,
    });

    const content = response.choices[0]?.message?.content;
    if (!content) {
      throw new OpenAIClientError("Empty response from OpenAI", 502);
    }

    const parsed = params.jsonMode
      ? parseJsonResult(content, params.task)
      : parseTextResult(content, params.task);

    const usage: TokenUsage = {
      prompt_tokens: response.usage?.prompt_tokens ?? 0,
      completion_tokens: response.usage?.completion_tokens ?? 0,
      total_tokens: response.usage?.total_tokens ?? 0,
    };

    return {
      ...parsed,
      rawContent: content,
      usage,
      apiSnapshot,
    };
  } catch (error) {
    if (error instanceof OpenAIClientError) throw error;

    if (error instanceof OpenAI.APIError) {
      throw new OpenAIClientError(
        error.message || "OpenAI API error",
        error.status ?? 502
      );
    }

    throw new OpenAIClientError(
      error instanceof Error ? error.message : "Unknown OpenAI error",
      500
    );
  }
}

export function configFromDevConfig(config: DeveloperConfig): Pick<
  CallLoopTaskParams,
  "systemPrompt" | "model" | "temperature" | "jsonMode"
> {
  return {
    systemPrompt: config.systemPrompt,
    model: config.model,
    temperature: config.temperature,
    jsonMode: config.jsonMode,
  };
}
