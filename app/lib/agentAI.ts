import type { FileTask, ProjectPlan } from "./agentTypes";
import { getModelConfig, getPersonalMemory, getUserSettings } from "./db";
import { formatMemoryForPrompt } from "./personalMemory";
import {
  FALLBACK_MODEL,
  generateJSON,
  generateJSONWithFallback,
  getModel,
  getOpenAIClient,
  OpenAIClientError,
  selectModelForRequest,
  selectModelIdForRequest,
} from "./openaiClient";
import { isRetriableProviderError } from "./modelProviders";
import { modelUsedLabel } from "./modelProviders";

export {
  FALLBACK_MODEL,
  generateJSON,
  getModel,
  getOpenAIClient,
  modelUsedLabel,
  OpenAIClientError,
  selectModelForRequest,
  selectModelIdForRequest,
};

export async function getTemperature(): Promise<number> {
  try {
    const settings = await getUserSettings();
    return settings.temperature;
  } catch {
    return 0.7;
  }
}

export async function getActiveModel(): Promise<string> {
  const resolved = await selectModelForRequest();
  return modelUsedLabel(resolved);
}

function clampScore(score: unknown): number {
  const num = typeof score === "number" ? score : Number(score);
  if (Number.isNaN(num)) return 0;
  return Math.min(100, Math.max(0, Math.round(num)));
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
Output ONLY the file content in "code" field — no markdown fences inside the code string.
Follow every detail in the Original user requirements section — exact names, copy, links, colors, and sections.
For App.js / main entry files: import and render ALL section components (Hero, About, Skills, Projects, Contact, Footer, etc.) — never leave a placeholder like "Hello world".
When using Tailwind CSS: use className only — do NOT import separate .css files unless you also generate that CSS file in the project.
Only import npm packages from: react, react-dom, react-icons, lucide-react, framer-motion, react-router-dom, clsx, axios.
Only use relative imports (./ or ../) for project files that exist or will exist in the plan.
Prefer React SPA structure: src/components/*.js — App.js is auto-wired.
Write production-ready code on the FIRST attempt — aim for 95+ score immediately.`;

export function buildFileTaskUserPrompt(params: {
  task: FileTask;
  filePath: string;
  filePurpose: string;
  projectContext: string;
  completedFiles: string;
  currentCode?: string;
  lastReview?: string;
  round: number;
  personalMemory?: string;
}): string {
  const userParts: string[] = [];

  if (params.personalMemory?.trim()) {
    userParts.push(params.personalMemory.trim());
  }

  userParts.push(
    `[Project Context]\n${params.projectContext}`,
    `[Completed Files]\n${params.completedFiles}`,
    `[File Path]: ${params.filePath}`,
    `[File Purpose]: ${params.filePurpose}`,
    `[Round]: ${params.round}`,
    `[Task]: ${params.task}`
  );

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
  simplified?: boolean;
  onRetry?: (message: string) => void;
}): Promise<
  FileTaskResult & {
    tokens: number;
    inputContext: string;
    memoryContext: string;
    modelUsed: string;
    temperature: number;
  }
> {
  let personalMemory = "";
  try {
    personalMemory = formatMemoryForPrompt(await getPersonalMemory());
  } catch {
    // memory is optional
  }

  const projectContext = params.simplified
    ? params.projectContext.split("\n").slice(0, 8).join("\n")
    : params.projectContext;

  const completedFiles = params.simplified
    ? params.completedFiles.slice(0, 1500)
    : params.completedFiles;

  const inputContext = buildFileTaskUserPrompt({
    ...params,
    projectContext,
    completedFiles,
    personalMemory,
  });
  const selected = await selectModelForRequest({
    explicitOverride: params.modelOverride,
  });
  const temperature = await getTemperature();

  let fallback = FALLBACK_MODEL;
  try {
    const config = await getModelConfig();
    fallback = config.fallback_model || FALLBACK_MODEL;
  } catch {
    // use default
  }

  const invoke = async () => {
    const { data, tokens, modelUsed } = await generateJSONWithFallback<{
      code?: string;
      review?: string;
      score: number;
    }>(FILE_TASK_SYSTEM_PROMPT, inputContext, selected, temperature, fallback);

    const score = clampScore(data.score);

    if (params.task === "review") {
      return {
        review: data.review ?? "",
        score,
        tokens,
        inputContext,
        memoryContext: personalMemory,
        modelUsed,
        temperature,
      };
    }

    return {
      code: data.code ?? params.currentCode ?? "",
      score,
      tokens,
      inputContext,
      memoryContext: personalMemory,
      modelUsed,
      temperature,
    };
  };

  try {
    return await invoke();
  } catch (firstErr) {
    if (!isRetriableProviderError(firstErr)) {
      const score = params.task === "review" ? 70 : 60;
      if (params.task === "review") {
        return {
          review: params.lastReview ?? "Continuing with previous review.",
          score,
          tokens: 0,
          inputContext,
          memoryContext: personalMemory,
          modelUsed: fallback,
          temperature,
        };
      }
      return {
        code: params.currentCode ?? "",
        score,
        tokens: 0,
        inputContext,
        memoryContext: personalMemory,
        modelUsed: fallback,
        temperature,
      };
    }

    params.onRetry?.("Something went wrong — retrying automatically");
    try {
      return await invoke();
    } catch (secondErr) {
      if (!isRetriableProviderError(secondErr)) {
        const score = params.task === "review" ? 70 : 60;
        if (params.task === "review") {
          return {
            review: params.lastReview ?? "Continuing with previous review.",
            score,
            tokens: 0,
            inputContext,
            memoryContext: personalMemory,
            modelUsed: fallback,
            temperature,
          };
        }
        return {
          code: params.currentCode ?? "",
          score,
          tokens: 0,
          inputContext,
          memoryContext: personalMemory,
          modelUsed: fallback,
          temperature,
        };
      }

      params.onRetry?.("Retrying with simplified context...");
      if (params.simplified) {
        const score = params.task === "review" ? 70 : 60;
        if (params.task === "review") {
          return {
            review: params.lastReview ?? "Continuing with previous review.",
            score,
            tokens: 0,
            inputContext,
            memoryContext: personalMemory,
            modelUsed: fallback,
            temperature,
          };
        }
        return {
          code: params.currentCode ?? "",
          score,
          tokens: 0,
          inputContext,
          memoryContext: personalMemory,
          modelUsed: fallback,
          temperature,
        };
      }
      return callFileTask({
        ...params,
        simplified: true,
        onRetry: params.onRetry,
      });
    }
  }
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

export async function generateText(
  system: string,
  user: string,
  temperature?: number
): Promise<{ content: string; tokens: number }> {
  const temp = temperature ?? (await getTemperature());
  const resolved = await selectModelForRequest();
  const client = getOpenAIClient();
  const response = await client.chat.completions.create({
    model: resolved.modelId,
    temperature: temp,
    max_tokens: 4096,
    messages: [
      { role: "system", content: system },
      { role: "user", content: user },
    ],
  });
  const content = response.choices[0]?.message?.content ?? "";
  return {
    content,
    tokens: response.usage?.total_tokens ?? Math.ceil(content.length / 4),
  };
}

