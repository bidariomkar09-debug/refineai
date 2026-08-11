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
import { getMessages, getProject, getProjectPlan, updateProjectPlan, upsertProjectPlan } from "./db";
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

type VisualState = {
  questions: ClarifyingQuestion[];
  clarifications: ProjectClarifications;
  status: NonNullable<ProjectPlan["planPhase"]>;
  visual?: VisualPlanArtifacts;
  target: string;
  basePlan: ProjectPlan;
};

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

/** Prefer project_plans table; fall back to fields embedded in projects.plan JSONB. */
async function loadVisualState(projectId: string, target: string): Promise<VisualState> {
  const [row, project] = await Promise.all([getProjectPlan(projectId), getProject(projectId)]);
  const embedded = (project?.plan as ProjectPlan | undefined) ?? {
    name: target.slice(0, 60) || "New Project",
    description: target,
    niche: "general",
    techStack: getStackForNiche("general"),
    files: [],
    apiRoutes: [],
    estimatedFiles: 0,
  };

  const questions =
    (row?.questions?.length ? row.questions : embedded.clarifyingQuestions) ?? [];
  const clarifications =
    row?.clarifications && Object.keys(row.clarifications).length > 0
      ? row.clarifications
      : embedded.clarifications ?? {};
  const status =
    row?.status ??
    embedded.planPhase ??
    (questions.length ? "clarifying" : "draft");
  const visual =
    (row?.build_preview &&
    typeof row.build_preview === "object" &&
    "flowchart" in row.build_preview
      ? (row.build_preview as VisualPlanArtifacts)
      : undefined) ?? embedded.visual;

  return {
    questions: questions as ClarifyingQuestion[],
    clarifications,
    status,
    visual,
    target: row?.target || target,
    basePlan: embedded,
  };
}

async function saveVisualState(params: {
  projectId: string;
  target: string;
  questions: ClarifyingQuestion[];
  clarifications: ProjectClarifications;
  status: NonNullable<ProjectPlan["planPhase"]>;
  plan?: ProjectPlan;
  markdown?: string;
  visual?: VisualPlanArtifacts;
}): Promise<ProjectPlan> {
  await upsertProjectPlan({
    projectId: params.projectId,
    target: params.target,
    questions: params.questions,
    clarifications: params.clarifications,
    status: params.status,
    planText: params.markdown,
    flowchart: params.visual?.flowchart,
    plainEnglish: params.visual?.plainEnglish,
    buildPreview: params.visual,
  });

  const project = await getProject(params.projectId);
  const base = params.plan ?? (project?.plan as ProjectPlan) ?? {
    name: params.target.slice(0, 60) || "New Project",
    description: params.target,
    niche: detectNiche(params.target),
    techStack: getStackForNiche(detectNiche(params.target)),
    files: [],
    apiRoutes: [],
    estimatedFiles: 0,
  };

  const nextPlan: ProjectPlan = {
    ...base,
    clarifyingQuestions: params.questions,
    clarifications: params.clarifications,
    planPhase: params.status,
    visual: params.visual ?? base.visual,
  };
  await updateProjectPlan(params.projectId, nextPlan);
  return nextPlan;
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

  const userPrompt =
    params.revise && params.currentPlan
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
  const state = await loadVisualState(params.projectId, target);

  if (params.submitClarifications && params.clarificationAnswers?.length) {
    const questions =
      state.questions.length > 0
        ? state.questions
        : generateClarifyingQuestions(target, niche);
    const clarifications = mergeClarificationAnswers(
      Object.keys(state.clarifications).length
        ? state.clarifications
        : getDefaultClarifications(questions),
      params.clarificationAnswers
    );

    if (!areClarificationsComplete(questions, clarifications)) {
      await saveVisualState({
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
      currentPlan: state.basePlan.files?.length ? state.basePlan : undefined,
    });
    const visual = await buildVisualPlanArtifacts(plan, clarifications, target);
    const saved = await saveVisualState({
      projectId: params.projectId,
      target,
      questions,
      clarifications,
      status: "ready",
      plan: {
        ...plan,
        clarifications,
        visual,
        clarifyingQuestions: questions,
        planPhase: "ready",
      },
      markdown,
      visual,
    });

    return { type: "plan", markdown, plan: saved, visual };
  }

  if (state.status === "draft" || state.questions.length === 0) {
    const questions = generateClarifyingQuestions(target, niche);
    const clarifications = getDefaultClarifications(questions);
    await saveVisualState({
      projectId: params.projectId,
      target,
      questions,
      clarifications,
      status: "clarifying",
    });
    return { type: "clarifying", questions, clarifications, target };
  }

  if (state.status === "clarifying") {
    return {
      type: "clarifying",
      questions: state.questions,
      clarifications: state.clarifications,
      target,
    };
  }

  if (state.status === "ready") {
    const clarifications = state.clarifications;
    const { plan, markdown } = await generateTechnicalPlan({
      projectId: params.projectId,
      message: params.message,
      target,
      clarifications,
      currentPlan: state.basePlan.files?.length ? state.basePlan : undefined,
    });
    const visual = await buildVisualPlanArtifacts(plan, clarifications, target);
    const saved = await saveVisualState({
      projectId: params.projectId,
      target,
      questions: state.questions.length
        ? state.questions
        : generateClarifyingQuestions(target, niche),
      clarifications,
      status: "ready",
      plan: { ...plan, clarifications, visual, planPhase: "ready" },
      markdown,
      visual,
    });
    return { type: "plan", markdown, plan: saved, visual };
  }

  const questions = generateClarifyingQuestions(target, niche);
  const clarifications = getDefaultClarifications(questions);
  await saveVisualState({
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
  const niche = detectNiche(target);
  const state = await loadVisualState(params.projectId, target);
  const questions =
    state.questions.length > 0
      ? state.questions
      : generateClarifyingQuestions(target, niche);

  let clarifications =
    Object.keys(state.clarifications).length > 0
      ? state.clarifications
      : getDefaultClarifications(questions);

  if (params.clarificationAnswers?.length) {
    clarifications = mergeClarificationAnswers(clarifications, params.clarificationAnswers);
  }

  if (params.submitClarifications && !areClarificationsComplete(questions, clarifications)) {
    await saveVisualState({
      projectId: params.projectId,
      target,
      questions,
      clarifications,
      status: "clarifying",
      plan: params.currentPlan,
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
  const saved = await saveVisualState({
    projectId: params.projectId,
    target,
    questions,
    clarifications,
    status: "ready",
    plan: {
      ...plan,
      clarifications,
      visual,
      clarifyingQuestions: questions,
      planPhase: "ready",
    },
    markdown,
    visual,
  });

  return { type: "plan", markdown, plan: saved, visual };
}
