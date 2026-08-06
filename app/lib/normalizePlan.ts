import type { ProjectPlan } from "./agentTypes";
import { normalizeApiRoutes } from "./planPresentation";

/** Coerce stored plan JSON into a safe shape so UI never crashes on missing fields. */
export function normalizeLoadedPlan(raw: unknown): ProjectPlan | null {
  if (!raw || typeof raw !== "object") return null;

  const plan = raw as ProjectPlan;
  if (!plan.name || typeof plan.name !== "string") return null;

  return {
    ...plan,
    name: plan.name,
    description: plan.description ?? "",
    niche: plan.niche ?? "general",
    techStack: plan.techStack ?? {
      frontend: "React",
      backend: "None",
      database: "None",
      ai: "None",
      styling: "Tailwind CSS",
      deploy: "Vercel",
    },
    files: Array.isArray(plan.files) ? plan.files : [],
    apiRoutes: normalizeApiRoutes(plan.apiRoutes),
    estimatedFiles: plan.estimatedFiles ?? (Array.isArray(plan.files) ? plan.files.length : 0),
    steps: Array.isArray(plan.steps) ? plan.steps : [],
  };
}

export function safePlanIntro(plan: ProjectPlan | null | undefined): string {
  if (!plan?.name) return "Here's your project plan.";
  if (plan.introMessage?.trim()) return plan.introMessage.trim();
  return `Got it! I'll build you a ${plan.name}. Here's what I'm planning to create for you...`;
}

export function safePlanSummary(plan: ProjectPlan | null | undefined): string {
  if (!plan?.name) return "Here's your plan — review it in the Plan tab, then click Build when you're ready.";
  const files = plan.files?.length ?? 0;
  const steps = plan.steps?.length ?? 0;
  return `Here's your plan for ${plan.name} — ${steps} steps, ${files} files. Review it in the Plan tab, then click Build when you're ready.`;
}
