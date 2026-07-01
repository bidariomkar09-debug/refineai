import type { ProjectPlan } from "./agentTypes";
import { PLAN_MODE_SYSTEM_PROMPT } from "./chatModes";
import { generateJSON, generateText } from "./agentAI";
import { detectNiche, getStackForNiche } from "./techStacks";
import { estimateBuildMinutes, derivePlanSteps } from "./planPresentation";
import { getMessages } from "./db";

type PlanModeResult =
  | { type: "question"; content: string; options: string[] }
  | { type: "plan"; markdown: string; plan: ProjectPlan };

const CLARIFY_SYSTEM = `${PLAN_MODE_SYSTEM_PROMPT}

You are in the clarifying phase. Ask ONE focused question to better understand requirements.
Respond with JSON only:
{
  "type": "question",
  "content": "your question here",
  "options": ["specific option 1", "specific option 2", "specific option 3"]
}
Rules for options:
- Provide exactly 3 or 4 concrete, mutually distinct answer choices tailored to the project.
- Each option should be a complete answer the user can pick with one click (not vague).
- Do NOT include "other" or "something else" — the UI adds that automatically.
If you already have enough information (3+ user answers in history), respond with:
{ "type": "ready", "content": "ready to plan" }`;

function normalizeQuestionOptions(options: unknown, question: string): string[] {
  const raw = Array.isArray(options)
    ? options.filter((o): o is string => typeof o === "string" && o.trim().length > 0)
    : [];
  const unique = Array.from(new Set(raw.map((o) => o.trim()))).slice(0, 4);
  if (unique.length >= 2) return unique;

  const q = question.toLowerCase();
  if (q.includes("animation") || q.includes("effect") || q.includes("hover")) {
    return [
      "Subtle fade-ins and slide transitions on scroll",
      "Interactive hover states on buttons and cards",
      "Page transitions and micro-interactions throughout",
    ];
  }
  if (q.includes("color") || q.includes("theme") || q.includes("style")) {
    return [
      "Dark mode with accent highlights",
      "Light, clean minimal design",
      "Bold, colorful brand-focused palette",
    ];
  }
  if (q.includes("feature") || q.includes("function")) {
    return [
      "Core MVP features only — keep it simple",
      "Full feature set with all listed requirements",
      "Phased approach — MVP first, extras later",
    ];
  }
  return [
    "Yes, include this in the project",
    "No, skip this for now",
    "Only a simplified version",
  ];
}

const PLAN_JSON_SYSTEM = `You are a senior software architect. Create a complete project plan.
Return JSON:
{
  "name": "Project Name",
  "description": "description",
  "niche": "niche",
  "techStack": { "frontend": "", "backend": "", "database": "", "ai": "", "styling": "", "deploy": "" },
  "files": [{ "path": "", "name": "", "purpose": "", "isApiRoute": false }],
  "databaseSchema": "",
  "apiRoutes": [],
  "estimatedFiles": 8,
  "estimatedMinutes": 3,
  "steps": [{ "id": "1", "label": "", "relatedPaths": [] }],
  "markdown": "Full markdown plan with sections: What will be built, Files to create, Tech stack reasoning, Risks/tradeoffs, Estimated complexity",
  "risks": ["risk1"],
  "complexity": "low|medium|high"
}`;

function normalizePlan(data: ProjectPlan, niche: string): ProjectPlan {
  const stack = getStackForNiche(niche);
  const files = data.files?.length ? data.files : [];
  const normalized: ProjectPlan = {
    ...data,
    niche: data.niche || niche,
    techStack: { ...stack, ...data.techStack },
    files,
    estimatedFiles: files.length,
    estimatedMinutes: data.estimatedMinutes ?? estimateBuildMinutes(files.length),
    apiRoutes:
      data.apiRoutes ??
      files.filter((f) => f.isApiRoute).map((f) => `/${f.path.replace(/\\/g, "/")}`),
  };
  if (!normalized.steps?.length) normalized.steps = derivePlanSteps(normalized);
  return normalized;
}

export async function runPlanModeStep(params: {
  projectId: string;
  message: string;
}): Promise<PlanModeResult> {
  const history = await getMessages(params.projectId);
  const planMessages = history.filter(
    (m) => m.mode === "plan" || (m.metadata as { planMode?: boolean })?.planMode
  );
  const userAnswers = planMessages.filter((m) => m.role === "user").length;

  if (userAnswers < 3) {
    const historyText = planMessages
      .map((m) => `${m.role}: ${m.content}`)
      .join("\n");
    const { data } = await generateJSON<{ type: string; content: string; options?: string[] }>(
      CLARIFY_SYSTEM,
      `History:\n${historyText}\n\nUser message:\n${params.message}\n\nUser answers so far: ${userAnswers}`
    );
    if (data.type === "question" && userAnswers < 2) {
      return {
        type: "question",
        content: data.content,
        options: normalizeQuestionOptions(data.options, data.content),
      };
    }
    if (data.type === "question" && userAnswers < 3) {
      return {
        type: "question",
        content: data.content,
        options: normalizeQuestionOptions(data.options, data.content),
      };
    }
  }

  const niche = detectNiche(params.message);
  const allHistory = planMessages.map((m) => `${m.role}: ${m.content}`).join("\n");
  const { data } = await generateJSON<
    ProjectPlan & { markdown?: string; risks?: string[]; complexity?: string }
  >(
    PLAN_JSON_SYSTEM,
    `Conversation:\n${allHistory}\n\nLatest user input:\n${params.message}\n\nNiche hint: ${niche}`
  );

  const plan = normalizePlan(data, niche);
  let markdown = data.markdown ?? "";
  if (!markdown) {
    const { content } = await generateText(
      PLAN_MODE_SYSTEM_PROMPT,
      `Write a detailed markdown plan for:\n${JSON.stringify(plan, null, 2)}\n\nInclude risks: ${(data.risks ?? []).join(", ")}\nComplexity: ${data.complexity ?? "medium"}`
    );
    markdown = content;
  }

  return { type: "plan", markdown, plan };
}

export async function revisePlanMode(params: {
  projectId: string;
  message: string;
  currentPlan: ProjectPlan;
}): Promise<PlanModeResult> {
  const { data } = await generateJSON<
    ProjectPlan & { markdown?: string }
  >(
    `${PLAN_JSON_SYSTEM}\n\nUpdate the existing plan based on user feedback.`,
    `Current plan:\n${JSON.stringify(params.currentPlan, null, 2)}\n\nUser feedback:\n${params.message}`
  );
  const plan = normalizePlan({ ...params.currentPlan, ...data }, params.currentPlan.niche);
  const markdown =
    data.markdown ??
    (await generateText(
      PLAN_MODE_SYSTEM_PROMPT,
      `Revise this plan markdown based on feedback:\n${params.message}\n\nPlan:\n${JSON.stringify(plan, null, 2)}`
    )).content;
  return { type: "plan", markdown, plan };
}
