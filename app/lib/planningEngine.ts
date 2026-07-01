import type { ProjectPlan } from "./agentTypes";
import { generateJSON } from "./agentAI";
import { detectNiche, getStackForNiche } from "./techStacks";
import { estimateBuildMinutes, linkPlanStepsToFiles } from "./planPresentation";

const PLAN_SYSTEM = `You are RefineAI, an expert software architect. Create a complete project plan from the user's idea.

Return JSON with this exact structure:
{
  "name": "Project Name",
  "description": "2-3 sentence user-friendly description of what the app does for the user. No technical jargon.",
  "introMessage": "Warm conversational opener, e.g. Got it! I'll build you a Personal AI Assistant that manages your entire day. Here's what I'm planning to create for you...",
  "niche": "detected niche",
  "techStack": {
    "frontend": "...", "backend": "...", "database": "...",
    "ai": "...", "styling": "...", "deploy": "..."
  },
  "files": [
    { "path": "app/page.tsx", "name": "page.tsx", "purpose": "Short user-friendly purpose, e.g. Main dashboard", "isApiRoute": false }
  ],
  "databaseSchema": "SQL if needed, else empty string",
  "apiRoutes": ["/api/chat"],
  "estimatedFiles": 8,
  "estimatedMinutes": 2,
  "steps": [
    { "id": "1", "label": "Set up the project foundation", "relatedPaths": ["package.json", "tsconfig.json"] },
    { "id": "2", "label": "Build your main dashboard", "relatedPaths": ["app/page.tsx"] }
  ]
}

Rules:
- steps: 5-8 conversational todo items describing WHAT will happen (not file paths in labels)
- Each step label should read like a Cursor plan todo, e.g. "Build the AI chat so you can talk naturally"
- relatedPaths must reference actual file paths from the files array
- List 6-12 files with full paths
- Include README.md always
- ALWAYS include these config files: package.json, tsconfig.json, next.config.mjs, tailwind.config.ts, postcss.config.mjs, app/layout.tsx, app/globals.css
- Mark isApiRoute true for app/api/**/route.ts files
- Use Next.js 14 App Router conventions
- Cap at 12 files maximum
- File purposes must be plain English for non-technical users
- introMessage must be warm and conversational, not technical
- estimatedMinutes should reflect file count (~15 seconds per file)`;

const REVISION_SYSTEM = `${PLAN_SYSTEM}

Update the existing plan based on user feedback. Return the full updated plan plus:
- "revisionMessage": warm conversational ack, e.g. Good idea! I'll add a Pomodoro Timer component to help you focus. I've updated the plan — here's what changed:`;

function normalizePlan(data: ProjectPlan, niche: string, suggestedStack: ReturnType<typeof getStackForNiche>): ProjectPlan {
  const fileCount = data.files?.length ?? data.estimatedFiles ?? 0;
  const normalized: ProjectPlan = {
    ...data,
    name: data.name?.trim() || "My App",
    description:
      data.description?.trim() ||
      "A custom app built with RefineAI based on your idea.",
    niche: data.niche || niche,
    techStack: { ...suggestedStack, ...data.techStack },
    estimatedFiles: fileCount,
    estimatedMinutes: data.estimatedMinutes ?? estimateBuildMinutes(fileCount),
    apiRoutes:
      data.apiRoutes ??
      data.files?.filter((f) => f.isApiRoute).map((f) => `/${f.path.replace(/\\/g, "/")}`) ??
      [],
    files: data.files?.length
      ? data.files
      : [
          { path: "package.json", name: "package.json", purpose: "Project setup", isApiRoute: false },
          { path: "app/page.tsx", name: "page.tsx", purpose: "Main app screen", isApiRoute: false },
          { path: "app/layout.tsx", name: "layout.tsx", purpose: "App layout", isApiRoute: false },
        ],
  };
  normalized.steps = linkPlanStepsToFiles(normalized);
  normalized.estimatedFiles = normalized.files.length;
  return normalized;
}

export async function generatePlan(idea: string): Promise<ProjectPlan> {
  const niche = detectNiche(idea);
  const suggestedStack = getStackForNiche(niche);

  const { data } = await generateJSON<ProjectPlan>(
    PLAN_SYSTEM,
    `User idea: ${idea}\n\nSuggested niche: ${niche}\nSuggested stack: ${JSON.stringify(suggestedStack)}`
  );

  return normalizePlan(data, niche, suggestedStack);
}

export async function generatePlanRevision(
  currentPlan: ProjectPlan,
  feedback: string
): Promise<ProjectPlan> {
  const niche = currentPlan.niche;
  const suggestedStack = getStackForNiche(niche);

  const { data } = await generateJSON<ProjectPlan>(
    REVISION_SYSTEM,
    `Current plan:\n${JSON.stringify(currentPlan)}\n\nChanges requested:\n${feedback}`
  );

  return {
    ...currentPlan,
    ...normalizePlan(data, niche, suggestedStack),
    revisionMessage: data.revisionMessage ?? currentPlan.revisionMessage,
  };
}
