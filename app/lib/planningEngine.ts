import type { ProjectPlan } from "./agentTypes";
import { generateJSON } from "./agentAI";
import { detectNiche, getStackForNiche } from "./techStacks";

const PLAN_SYSTEM = `You are RefineAI, an expert software architect. Create a complete project plan from the user's idea.

Return JSON with this exact structure:
{
  "name": "Project Name",
  "description": "One sentence description",
  "niche": "detected niche",
  "techStack": {
    "frontend": "...", "backend": "...", "database": "...",
    "ai": "...", "styling": "...", "deploy": "..."
  },
  "files": [
    { "path": "app/page.tsx", "name": "page.tsx", "purpose": "...", "isApiRoute": false }
  ],
  "databaseSchema": "SQL if needed, else empty string",
  "apiRoutes": ["/api/chat"],
  "estimatedFiles": 8
}

Rules:
- List 6-12 files with full paths
- Include README.md always
- Mark isApiRoute true for app/api/**/route.ts files
- Use Next.js 14 App Router conventions
- Cap at 12 files maximum`;

export async function generatePlan(idea: string): Promise<ProjectPlan> {
  const niche = detectNiche(idea);
  const suggestedStack = getStackForNiche(niche);

  const { data } = await generateJSON<ProjectPlan>(
    PLAN_SYSTEM,
    `User idea: ${idea}\n\nSuggested niche: ${niche}\nSuggested stack: ${JSON.stringify(suggestedStack)}`
  );

  return {
    ...data,
    niche: data.niche || niche,
    techStack: { ...suggestedStack, ...data.techStack },
    estimatedFiles: data.files?.length ?? data.estimatedFiles ?? 0,
    apiRoutes: data.apiRoutes ?? data.files?.filter((f) => f.isApiRoute).map((f) => `/${f.path.replace(/\\/g, "/")}`) ?? [],
  };
}

export async function generatePlanRevision(
  currentPlan: ProjectPlan,
  feedback: string
): Promise<ProjectPlan> {
  const { data } = await generateJSON<ProjectPlan>(
    PLAN_SYSTEM + "\nUpdate the existing plan based on user feedback. Return full updated plan.",
    `Current plan:\n${JSON.stringify(currentPlan)}\n\nChanges requested:\n${feedback}`
  );
  return {
    ...currentPlan,
    ...data,
    estimatedFiles: data.files?.length ?? currentPlan.estimatedFiles,
  };
}
