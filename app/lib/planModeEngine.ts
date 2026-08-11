import type {
  ClarificationAnswer,
  ClarifyingQuestion,
  ProjectClarifications,
  ProjectPlan,
  VisualPlanArtifacts,
} from "./agentTypes";
import { PLAN_MODE_SYSTEM_PROMPT } from "./chatModes";
import { generateJSON, generateText } from "./agentAI";
import { detectNiche, getStackForNiche } from "./techStacks";
import { estimateBuildMinutes, linkPlanStepsToFiles, normalizeApiRoutes } from "./planPresentation";
import { getMessages, getProjectPlan, upsertProjectPlan } from "./db";
import {
  areClarificationsComplete,
  buildVisualPlanArtifacts,
  formatClarificationsForPrompt,
  generateClarifyingQuestions,
  getDefaultClarifications,
  mergeClarificationAnswers,
} from "./visualPlanEngine";

export type PlanModeResult =
  | {
      type: "clarifying";
      questions: ClarifyingQuestion[];
      clarifications: ProjectClarifications;
      target: string;
    }
  | { type: "plan"; markdown: string; plan: ProjectPlan; visual: VisualPlanArtifacts };

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

async function resolveTarget(projectId: string, message: string): Promise<string> {
  const history = await getMessages(projectId);
  const firstUser = history.find((m) => m.role === "user");
  return firstUser?.content?.trim() || message.trim();
}

async function generateTechnicalPlan(params: {
  projectId: string;
  message: string;
  target: string;
  clarifications: ProjectClarifications;
  currentPlan?: ProjectPlan;
  revise?: boolean;
}): Promise<{ plan: ProjectPlan; markdown: string }> {
  const history = await getMessages(params.projectId);
  const planMessages = history.filter(
    (m) => m.mode === "plan" || (m.metadata as { planMode?: boolean })?.planMode
  );
  const niche = detectNiche(params.target);
  const clarificationBlock = formatClarificationsForPrompt(params.clarifications);
  const allHistory = planMessages.map((m) => `${m.role}: ${m.content}`).join("\n");

  const systemPrompt = params.revise
    ? `${PLAN_JSON_SYSTEM}\n\nUpdate the existing plan based on user feedback and clarifications.`
    : PLAN_JSON_SYSTEM;

  const userPrompt = params.revise && params.currentPlan
    ? `Current plan:\n${JSON.stringify(params.currentPlan, null, 2)}\n\n${clarificationBlock}\n\nUser feedback:\n${params.message}`
    : `Conversation:\n${allHistory}\n\nLatest user input:\n${params.message}\n\nProject target: ${params.target}\n\n${clarificationBlock}\n\nNiche hint: ${niche}`;

  const { data } = await generateJSON<
    ProjectPlan & { markdown?: string; risks?: string[]; complexity?: string }
  >(systemPrompt, userPrompt);

  const plan = normalizePlan(
    params.revise && params.currentPlan ? { ...params.currentPlan, ...data } : data,
    niche
  );

  let markdown = data.markdown ?? "";
  if (!markdown) {
    const { content } = await generateText(
      PLAN_MODE_SYSTEM_PROMPT,
      `Write a detailed markdown plan for:\n${JSON.stringify(plan, null, 2)}\n\nUser preferences:\n${clarificationBlock}\n\nInclude risks: ${(data.risks ?? []).join(", ")}\nComplexity: ${data.complexity ?? "medium"}`
    );
    markdown = content;
  }

  return { plan, markdown };
}

export async function runPlanModeStep(params: {
  projectId: string;
  message: string;
  clarificationAnswers?: ClarificationAnswer[];
  submitClarifications?: boolean;
}): Promise<PlanModeResult> {
  const target = await resolveTarget(params.projectId, params.message);
  const niche = detectNiche(target);
  let projectPlan = await getProjectPlan(params.projectId);

  if (params.submitClarifications && params.clarificationAnswers?.length) {
    const questions =
      (projectPlan?.questions as ClarifyingQuestion[]) ??
      generateClarifyingQuestions(target, niche);
    const clarifications = mergeClarificationAnswers(
      (projectPlan?.clarifications as ProjectClarifications) ?? getDefaultClarifications(questions),
      params.clarificationAnswers
    );

    if (!areClarificationsComplete(questions, clarifications)) {
      await upsertProjectPlan({
        projectId: params.projectId,
        target,
        questions,
        clarifications,
        status: "clarifying",
      });
      return { type: "clarifying", questions, clarifications, target };
    }

    const { plan, markdown } = await generateTechnicalPlan({
      projectId: params.projectId,
      message: params.message,
      target,
      clarifications,
    });
    const visual = await buildVisualPlanArtifacts(plan, clarifications, target);

    await upsertProjectPlan({
      projectId: params.projectId,
      target,
      questions,
      clarifications,
      status: "ready",
      planText: markdown,
      flowchart: visual.flowchart,
      plainEnglish: visual.plainEnglish,
      buildPreview: visual,
    });

    return { type: "plan", markdown, plan, visual };
  }

  if (!projectPlan || projectPlan.status === "draft" || !projectPlan.questions?.length) {
    const questions = generateClarifyingQuestions(target, niche);
    const clarifications = getDefaultClarifications(questions);
    await upsertProjectPlan({
      projectId: params.projectId,
      target,
      questions,
      clarifications,
      status: "clarifying",
    });
    return { type: "clarifying", questions, clarifications, target };
  }

  if (projectPlan.status === "clarifying") {
    const questions = projectPlan.questions as ClarifyingQuestion[];
    const clarifications =
      (projectPlan.clarifications as ProjectClarifications) ??
      getDefaultClarifications(questions);
    return { type: "clarifying", questions, clarifications, target };
  }

  if (projectPlan.status === "ready" && projectPlan.build_preview) {
    const clarifications = projectPlan.clarifications as ProjectClarifications;
    const { plan, markdown } = await generateTechnicalPlan({
      projectId: params.projectId,
      message: params.message,
      target,
      clarifications,
    });
    const visual = await buildVisualPlanArtifacts(plan, clarifications, target);
    return { type: "plan", markdown, plan, visual };
  }

  const questions = generateClarifyingQuestions(target, niche);
  const clarifications = getDefaultClarifications(questions);
  await upsertProjectPlan({
    projectId: params.projectId,
    target,
    questions,
    clarifications,
    status: "clarifying",
  });
  return { type: "clarifying", questions, clarifications, target };
}

export async function revisePlanMode(params: {
  projectId: string;
  message: string;
  currentPlan: ProjectPlan;
  clarificationAnswers?: ClarificationAnswer[];
  submitClarifications?: boolean;
}): Promise<PlanModeResult> {
  const target = await resolveTarget(params.projectId, params.message);
  const projectPlan = await getProjectPlan(params.projectId);
  const questions =
    (projectPlan?.questions as ClarifyingQuestion[]) ??
    generateClarifyingQuestions(target, detectNiche(target));

  let clarifications =
    (projectPlan?.clarifications as ProjectClarifications) ??
    getDefaultClarifications(questions);

  if (params.clarificationAnswers?.length) {
    clarifications = mergeClarificationAnswers(clarifications, params.clarificationAnswers);
  }

  if (params.submitClarifications && !areClarificationsComplete(questions, clarifications)) {
    await upsertProjectPlan({
      projectId: params.projectId,
      target,
      questions,
      clarifications,
      status: "clarifying",
    });
    return { type: "clarifying", questions, clarifications, target };
  }

  const { plan, markdown } = await generateTechnicalPlan({
    projectId: params.projectId,
    message: params.message,
    target,
    clarifications,
    currentPlan: params.currentPlan,
    revise: true,
  });
  const visual = await buildVisualPlanArtifacts(plan, clarifications, target);

  await upsertProjectPlan({
    projectId: params.projectId,
    target,
    questions,
    clarifications,
    status: "ready",
    planText: markdown,
    flowchart: visual.flowchart,
    plainEnglish: visual.plainEnglish,
    buildPreview: visual,
  });

  return { type: "plan", markdown, plan, visual };
}
