import type { ProjectPlan } from "./agentTypes";
import { generateJSON } from "./agentAI";
import { getPersonalMemory } from "./db";
import { formatMemoryForPrompt } from "./personalMemory";
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
- List 4-8 files with full paths (speed target: ~60s total build)
- Include README.md always
- description MUST preserve ALL user-specified content: exact copy/text, section names, links, contact info, colors, layout notes, and design requirements as a structured bullet list
- If user asks for React + Tailwind (or portfolio/landing without Next.js): use Create React App style paths (src/App.js, src/index.js, src/components/*.js) — do NOT use Next.js app/ router or tsconfig/next.config files
- DEFAULT for portfolios, landing pages, and simple sites: React SPA (src/App.js + src/components/*.js) — this guarantees in-browser preview works
- If user explicitly asks for Next.js or full-stack app: use Next.js 14 App Router (app/page.tsx, app/layout.tsx, etc.) and include package.json, tsconfig.json, next.config.mjs, tailwind.config.ts, postcss.config.mjs, app/globals.css
- Mark isApiRoute true for app/api/**/route.ts files
- Cap at 8 files maximum for React SPA; cap at 12 for Next.js full-stack
- File purposes must be plain English for non-technical users
- introMessage must be warm and conversational, not technical
- estimatedMinutes should reflect file count (~8 seconds per component file)
- For portfolio sites: plan one file per major section (Hero, About, Skills, Projects, Contact, Footer) in src/components/*.js ONLY — do NOT include src/App.js (auto-generated), package.json, or index.js (preview scaffold handles these)`;

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

  let memoryBlock = "";
  try {
    memoryBlock = formatMemoryForPrompt(await getPersonalMemory());
  } catch {
    // memory is optional
  }

  const userPrompt = [
    memoryBlock,
    `User idea: ${idea}`,
    `Suggested niche: ${niche}`,
    `Suggested stack: ${JSON.stringify(suggestedStack)}`,
  ]
    .filter(Boolean)
    .join("\n\n");

  const { data } = await generateJSON<ProjectPlan>(PLAN_SYSTEM, userPrompt);

  return normalizePlan(data, niche, suggestedStack);
}

export async function generatePlanRevision(
  currentPlan: ProjectPlan,
  feedback: string
): Promise<ProjectPlan> {
  const niche = currentPlan.niche;
  const suggestedStack = getStackForNiche(niche);

  let memoryBlock = "";
  try {
    memoryBlock = formatMemoryForPrompt(await getPersonalMemory());
  } catch {
    // memory is optional
  }

  const userPrompt = [
    memoryBlock,
    `Current plan:\n${JSON.stringify(currentPlan)}`,
    `Changes requested:\n${feedback}`,
  ]
    .filter(Boolean)
    .join("\n\n");

  const { data } = await generateJSON<ProjectPlan>(REVISION_SYSTEM, userPrompt);

  return {
    ...currentPlan,
    ...normalizePlan(data, niche, suggestedStack),
    revisionMessage: data.revisionMessage ?? currentPlan.revisionMessage,
  };
}
