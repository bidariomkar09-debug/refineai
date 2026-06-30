import OpenAI from "openai";
import type { FileTask, ProjectPlan } from "./agentTypes";
import { getActivatedFineTunedModel, getUserSettings } from "./db";

export class OpenAIClientError extends Error {
  constructor(
    message: string,
    public readonly statusCode: number = 500
  ) {
    super(message);
    this.name = "OpenAIClientError";
  }
}

export function getOpenAIClient(): OpenAI {
  const apiKey = process.env.OPENAI_API_KEY;
  if (!apiKey) {
    throw new OpenAIClientError("OPENAI_API_KEY is not configured", 500);
  }
  return new OpenAI({ apiKey });
}

export function getModel(): string {
  return process.env.OPENAI_MODEL ?? "gpt-4o";
}

export async function getTemperature(): Promise<number> {
  try {
    const settings = await getUserSettings();
    return settings.temperature;
  } catch {
    return 0.7;
  }
}

export async function getActiveModel(): Promise<string> {
  try {
    const activated = await getActivatedFineTunedModel();
    if (activated?.model_id) return activated.model_id;
  } catch {
    // fall through
  }
  try {
    const settings = await getUserSettings();
    if (settings.selected_model?.startsWith("ft:")) return settings.selected_model;
  } catch {
    // fall through
  }
  return getModel();
}

function clampScore(score: unknown): number {
  const num = typeof score === "number" ? score : Number(score);
  if (Number.isNaN(num)) return 0;
  return Math.min(100, Math.max(0, Math.round(num)));
}

export async function generateJSON<T>(
  system: string,
  user: string,
  model?: string,
  temperature = 0.7
): Promise<{ data: T; tokens: number }> {
  const client = getOpenAIClient();
  const response = await client.chat.completions.create({
    model: model ?? getModel(),
    temperature,
    max_tokens: 4096,
    response_format: { type: "json_object" },
    messages: [
      { role: "system", content: system },
      { role: "user", content: user },
    ],
  });

  const content = response.choices[0]?.message?.content;
  if (!content) throw new OpenAIClientError("Empty response", 502);

  try {
    return {
      data: JSON.parse(content) as T,
      tokens: response.usage?.total_tokens ?? 0,
    };
  } catch {
    throw new OpenAIClientError("Invalid JSON response", 502);
  }
}

export type FileTaskResult = {
  code?: string;
  review?: string;
  score: number;
};

const FILE_TASK_SCHEMA = `
Respond with valid JSON only:
- write/refine: { "code": "<full file content>", "score": <0-100> }
- review: { "review": "<detailed code review>", "score": <0-100> }`;

export const FILE_TASK_SYSTEM_PROMPT = `You are RefineAI, an expert software engineer. ${FILE_TASK_SCHEMA}
Score honestly: 95+ means production-ready code with no bugs.
Output ONLY the file content in "code" field — no markdown fences inside the code string.`;

export function buildFileTaskUserPrompt(params: {
  task: FileTask;
  filePath: string;
  filePurpose: string;
  projectContext: string;
  completedFiles: string;
  currentCode?: string;
  lastReview?: string;
  round: number;
}): string {
  const userParts = [
    `[Project Context]\n${params.projectContext}`,
    `[Completed Files]\n${params.completedFiles}`,
    `[File Path]: ${params.filePath}`,
    `[File Purpose]: ${params.filePurpose}`,
    `[Round]: ${params.round}`,
    `[Task]: ${params.task}`,
  ];

  if (params.currentCode) {
    userParts.push(`[Current Code]:\n${params.currentCode}`);
  }
  if (params.lastReview) {
    userParts.push(`[Last Review]:\n${params.lastReview}`);
  }

  return userParts.join("\n\n");
}

export function describeImprovement(
  task: FileTask,
  prevCode: string,
  newCode: string
): string {
  if (task === "write") return "Initial generation";
  if (task === "review") return "Quality review";
  if (prevCode && newCode && prevCode !== newCode) {
    const prevLines = prevCode.split("\n").length;
    const newLines = newCode.split("\n").length;
    return `Refined based on critique (${prevLines} → ${newLines} lines)`;
  }
  return "Refined based on critique";
}

export async function callFileTask(params: {
  task: FileTask;
  filePath: string;
  filePurpose: string;
  projectContext: string;
  completedFiles: string;
  currentCode?: string;
  lastReview?: string;
  round: number;
  modelOverride?: string;
}): Promise<
  FileTaskResult & {
    tokens: number;
    inputContext: string;
    modelUsed: string;
    temperature: number;
  }
> {
  const inputContext = buildFileTaskUserPrompt(params);
  const modelUsed = params.modelOverride ?? (await getActiveModel());
  const temperature = await getTemperature();

  const { data, tokens } = await generateJSON<{
    code?: string;
    review?: string;
    score: number;
  }>(FILE_TASK_SYSTEM_PROMPT, inputContext, modelUsed, temperature);

  const score = clampScore(data.score);

  if (params.task === "review") {
    return {
      review: data.review ?? "",
      score,
      tokens,
      inputContext,
      modelUsed,
      temperature,
    };
  }

  return {
    code: data.code ?? params.currentCode ?? "",
    score,
    tokens,
    inputContext,
    modelUsed,
    temperature,
  };
}

export async function generateSummary(
  plan: ProjectPlan
): Promise<{ setup: string; deploy: string }> {
  const { data } = await generateJSON<{ setup: string; deploy: string }>(
    "Generate simple setup and deploy instructions for a non-technical user. JSON: { setup, deploy }",
    `Project: ${plan.name}\nStack: ${JSON.stringify(plan.techStack)}\nFiles: ${plan.files.length}`
  );
  return {
    setup: data.setup ?? "Run npm install && npm run dev",
    deploy: data.deploy ?? "Deploy to Vercel",
  };
}

export async function testApiRouteWithLLM(
  code: string,
  routePath: string
): Promise<{ passed: boolean; issues: string[] }> {
  const { data } = await generateJSON<{ passed: boolean; issues: string[] }>(
    `Review this API route code. Check: valid exports, error handling, proper HTTP methods, TypeScript syntax.
JSON: { "passed": boolean, "issues": string[] }`,
    `Route: ${routePath}\n\n${code}`
  );
  return {
    passed: data.passed ?? false,
    issues: data.issues ?? [],
  };
}

export async function revisePlan(
  currentPlan: ProjectPlan,
  userFeedback: string
): Promise<ProjectPlan> {
  const { data } = await generateJSON<ProjectPlan>(
    "Update the project plan based on user feedback. Return the full updated plan JSON with same structure.",
    `Current plan:\n${JSON.stringify(currentPlan, null, 2)}\n\nUser wants:\n${userFeedback}`
  );
  return { ...currentPlan, ...data, estimatedFiles: data.files?.length ?? currentPlan.estimatedFiles };
}
