import OpenAI from "openai";
import type { LoopTask, LoopTaskResult } from "./types";

const SYSTEM_PROMPT = `You are a loop refining AI. Your job is to generate, critique, and refine your output until it perfectly matches the user's target description. After each round score yourself from 0-100. Stop when you hit 90+.

Always respond with valid JSON only, no markdown fences. Use this exact schema:
- For "generate" and "refine" tasks: { "output": "<your content>", "score": <0-100> }
- For "critique" task: { "critique": "<what is missing or wrong>", "score": <0-100> }

Score honestly based on how well the current output matches the target. Be critical during critique rounds.`;

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

function clampScore(score: unknown): number {
  const num = typeof score === "number" ? score : Number(score);
  if (Number.isNaN(num)) return 0;
  return Math.min(100, Math.max(0, Math.round(num)));
}

function parseLoopResult(raw: string, task: LoopTask): LoopTaskResult {
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
      throw new OpenAIClientError(
        "AI response missing critique field",
        502
      );
    }
    return { critique, score };
  }

  const output =
    typeof parsed.output === "string" ? parsed.output.trim() : "";
  if (!output) {
    throw new OpenAIClientError("AI response missing output field", 502);
  }
  return { output, score };
}

export type CallLoopTaskParams = {
  target: string;
  currentOutput?: string;
  lastCritique?: string;
  round: number;
  task: LoopTask;
};

export async function callLoopTask(
  params: CallLoopTaskParams
): Promise<LoopTaskResult> {
  const client = getClient();
  const model = process.env.OPENAI_MODEL ?? "gpt-4o";

  try {
    const response = await client.chat.completions.create({
      model,
      max_tokens: 2048,
      response_format: { type: "json_object" },
      messages: [
        { role: "system", content: SYSTEM_PROMPT },
        { role: "user", content: buildUserMessage(params) },
      ],
    });

    const content = response.choices[0]?.message?.content;
    if (!content) {
      throw new OpenAIClientError("Empty response from OpenAI", 502);
    }

    return parseLoopResult(content, params.task);
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
