import type { ProjectPlan } from "./agentTypes";
import { PLAN_MODE_SYSTEM_PROMPT } from "./chatModes";
import { generateJSON, generateText } from "./agentAI";
import { detectNiche, getStackForNiche } from "./techStacks";
import { estimateBuildMinutes, linkPlanStepsToFiles, normalizeApiRoutes } from "./planPresentation";
import { getMessages } from "./db";

type PlanModeResult =
  | { type: "question"; content: string; options: string[] }
  | { type: "plan"; markdown: string; plan: ProjectPlan };

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
    apiRoutes: normalizeApiRoutes(
      data.apiRoutes ??
        files.filter((f) => f.isApiRoute).map((f) => `/${f.path.replace(/\\/g, "/")}`)
    ),
  };
  normalized.steps = linkPlanStepsToFiles(normalized);
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
