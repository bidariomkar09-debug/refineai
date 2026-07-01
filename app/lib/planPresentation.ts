import type { DbFile, PlannedFile, PlanStep, ProjectPlan, TechStack } from "./agentTypes";
import type { ExplorerFile } from "@/app/lib/mergeProjectFiles";

const TECH_STACK_ORDER: (keyof TechStack)[] = [
  "frontend",
  "ai",
  "database",
  "styling",
  "backend",
  "deploy",
];

export function formatTechStackLine(techStack: TechStack): string {
  const parts = TECH_STACK_ORDER.map((key) => techStack[key]?.trim()).filter(Boolean);
  const unique = Array.from(new Set(parts));
  return unique.join(" · ");
}

export function parseDatabaseTables(schema?: string): string[] {
  if (!schema?.trim()) return [];
  const tables = new Set<string>();
  const createRegex =
    /CREATE\s+TABLE\s+(?:IF\s+NOT\s+EXISTS\s+)?(?:public\.)?["']?(\w+)["']?/gi;
  let match = createRegex.exec(schema);
  while (match) {
    if (match[1]) tables.add(match[1].toLowerCase());
    match = createRegex.exec(schema);
  }
  if (tables.size === 0) {
    const wordRegex = /\b(\w+)\s*(?:\(|,|;)/g;
    let wordMatch = wordRegex.exec(schema);
    while (wordMatch) {
      const word = wordMatch[1]?.toLowerCase();
      if (word && !["create", "table", "if", "not", "exists", "public"].includes(word)) {
        tables.add(word);
      }
      wordMatch = wordRegex.exec(schema);
    }
  }
  return Array.from(tables);
}

export function formatDatabaseTables(schema?: string): string {
  const tables = parseDatabaseTables(schema);
  if (tables.length === 0) return "";
  return tables.join(" · ");
}

export function formatApiRoutes(routes: string[]): string {
  if (routes.length === 0) return "";
  return routes
    .map((route) => {
      const normalized = route.startsWith("/") ? route : `/${route}`;
      return normalized.replace(/\/route\.ts$/i, "").replace(/\/+$/, "") || normalized;
    })
    .join(" · ");
}

export function estimateBuildMinutes(fileCount: number, planMinutes?: number): number {
  if (planMinutes && planMinutes > 0) return planMinutes;
  return Math.max(1, Math.ceil((fileCount * 15) / 60));
}

export function truncateFileList<T>(files: T[], max = 10): { visible: T[]; remaining: number } {
  if (files.length <= max) return { visible: files, remaining: 0 };
  return { visible: files.slice(0, max), remaining: files.length - max };
}

export function getFriendlyBuildMessage(
  file: Pick<PlannedFile, "path" | "purpose"> | Pick<DbFile, "file_path" | "file_name">
): string {
  const path = "path" in file ? file.path : file.file_path;
  const purpose = "purpose" in file ? file.purpose : "";
  const lowerPath = path.toLowerCase();
  const lowerPurpose = purpose.toLowerCase();

  if (lowerPath.includes("readme")) {
    return "Finishing up the README so you know how to run it...";
  }
  if (lowerPath.includes("package.json")) {
    return "Setting up your project dependencies...";
  }
  if (lowerPath.includes("globals.css") || lowerPath.includes("tailwind")) {
    return "Applying your theme and styling...";
  }
  if (lowerPath.includes("layout.tsx")) {
    return "Building the app shell and layout...";
  }
  if (lowerPath.includes("page.tsx") && !lowerPath.includes("api/")) {
    return "Starting with your main dashboard...";
  }
  if (lowerPath.includes("/api/") || lowerPath.includes("route.ts")) {
    if (lowerPurpose.includes("chat") || lowerPath.includes("chat")) {
      return "Building the AI chat so you can talk to it...";
    }
    if (lowerPurpose.includes("task") || lowerPath.includes("task")) {
      return "Setting up your task manager...";
    }
    if (lowerPurpose.includes("habit") || lowerPath.includes("habit")) {
      return "Almost there — adding the habit tracker...";
    }
    return "Connecting your backend APIs...";
  }
  if (lowerPurpose) {
    const cleaned = purpose.replace(/\.$/, "");
    return `Building ${cleaned.charAt(0).toLowerCase()}${cleaned.slice(1)}...`;
  }
  const fileName = path.split("/").pop() ?? path;
  return `Working on ${fileName}...`;
}

export function getAverageScore(files: DbFile[]): number {
  const scored = files.filter((f) => f.status === "done" && f.score > 0);
  if (scored.length === 0) return 0;
  const total = scored.reduce((sum, f) => sum + f.score, 0);
  return Math.round(total / scored.length);
}

export function getPlanSummaryMessage(plan: ProjectPlan): string {
  const steps = getPlanSteps(plan).length;
  const files = plan.files?.length ?? 0;
  return `Here's your plan for ${plan.name} — ${steps} steps, ${files} files. Review it in the Plan tab, then click Build when you're ready.`;
}

export function getPlanIntro(plan: ProjectPlan): string {
  if (plan.introMessage?.trim()) return plan.introMessage.trim();
  return `Got it! I'll build you a ${plan.name}. Here's what I'm planning to create for you...`;
}

export function getRevisionIntro(plan: ProjectPlan): string {
  if (plan.revisionMessage?.trim()) return plan.revisionMessage.trim();
  return "I've updated the plan based on your feedback — here's what changed:";
}

export function findPlannedFile(
  plan: ProjectPlan | null,
  filePath: string
): PlannedFile | undefined {
  if (!plan) return undefined;
  const normalized = filePath.replace(/\\/g, "/");
  return plan.files.find((f) => f.path.replace(/\\/g, "/") === normalized);
}

export type StepStatus = "pending" | "active" | "done";

function normalizePath(path: string): string {
  return path.replace(/\\/g, "/");
}

function purposeToStepLabel(purpose: string, path: string): string {
  const lowerPath = path.toLowerCase();
  if (lowerPath.includes("readme")) return "Write the setup guide";
  if (lowerPath.includes("package.json")) return "Set up project dependencies";
  if (lowerPath.includes("globals.css")) return "Apply theme and styling";
  if (lowerPath.includes("layout.tsx")) return "Create the app shell and layout";
  if (lowerPath.includes("/api/") && lowerPath.includes("chat")) {
    return "Build the AI chat so you can talk naturally";
  }
  if (purpose.trim()) {
    const cleaned = purpose.replace(/\.$/, "");
    return cleaned.charAt(0).toUpperCase() + cleaned.slice(1);
  }
  const name = path.split("/").pop()?.replace(/\.[^.]+$/, "") ?? path;
  return `Build ${name.replace(/([A-Z])/g, " $1").trim()}`;
}

function isConfigFile(path: string): boolean {
  const p = path.toLowerCase();
  return (
    p.includes("package.json") ||
    p.includes("tsconfig") ||
    p.includes("next.config") ||
    p.includes("tailwind.config") ||
    p.includes("postcss.config")
  );
}

export function derivePlanSteps(plan: ProjectPlan): PlanStep[] {
  const steps: PlanStep[] = [];
  const paths = plan.files.map((f) => normalizePath(f.path));

  const configPaths = plan.files.filter((f) => isConfigFile(f.path)).map((f) => f.path);
  if (configPaths.length > 0) {
    steps.push({
      id: "foundation",
      label: "Set up the project foundation",
      relatedPaths: configPaths,
    });
  }

  const layoutPaths = plan.files
    .filter((f) => {
      const p = f.path.toLowerCase();
      return p.includes("layout.tsx") || p.includes("globals.css");
    })
    .map((f) => f.path);
  if (layoutPaths.length > 0) {
    steps.push({
      id: "shell",
      label: "Create the app layout and theme",
      relatedPaths: layoutPaths,
    });
  }

  const pagePaths = plan.files
    .filter((f) => f.path.endsWith("page.tsx") && !f.path.includes("/api/"))
    .map((f) => f.path);
  if (pagePaths.length > 0) {
    steps.push({
      id: "dashboard",
      label: "Build your main dashboard",
      relatedPaths: pagePaths,
    });
  }

  const componentFiles = plan.files.filter((f) => f.path.includes("/components/"));
  for (const file of componentFiles) {
    steps.push({
      id: `component-${file.path}`,
      label: purposeToStepLabel(file.purpose, file.path),
      relatedPaths: [file.path],
    });
  }

  const apiPaths = plan.files
    .filter((f) => f.isApiRoute || f.path.includes("/api/"))
    .map((f) => f.path);
  if (apiPaths.length > 0) {
    steps.push({
      id: "apis",
      label: "Connect your backend and AI endpoints",
      relatedPaths: apiPaths,
    });
  }

  if (plan.databaseSchema?.trim()) {
    steps.push({
      id: "database",
      label: "Set up your database tables",
      relatedPaths: [],
    });
  }

  const readmePaths = plan.files
    .filter((f) => f.path.toLowerCase().includes("readme"))
    .map((f) => f.path);
  if (readmePaths.length > 0) {
    steps.push({
      id: "readme",
      label: "Write the setup guide so you can run it easily",
      relatedPaths: readmePaths,
    });
  }

  const covered = new Set(
    steps.flatMap((s) => (s.relatedPaths ?? []).map(normalizePath))
  );
  const uncovered = plan.files.filter((f) => !covered.has(normalizePath(f.path)));
  for (const file of uncovered) {
    steps.push({
      id: `file-${file.path}`,
      label: purposeToStepLabel(file.purpose, file.path),
      relatedPaths: [file.path],
    });
  }

  if (steps.length === 0 && paths.length > 0) {
    return plan.files.slice(0, 8).map((f, i) => ({
      id: `step-${i}`,
      label: purposeToStepLabel(f.purpose, f.path),
      relatedPaths: [f.path],
    }));
  }

  return steps;
}

const STEP_STOP_WORDS = new Set([
  "the",
  "a",
  "an",
  "and",
  "or",
  "with",
  "for",
  "to",
  "in",
  "on",
  "your",
  "create",
  "build",
  "add",
  "implement",
  "develop",
  "style",
  "set",
  "up",
  "section",
  "component",
  "test",
  "deploy",
]);

function extractStepKeywords(text: string): string[] {
  return text
    .toLowerCase()
    .replace(/[^a-z0-9\s]/g, " ")
    .split(/\s+/)
    .filter((w) => w.length > 2 && !STEP_STOP_WORDS.has(w));
}

function fileSearchText(file: PlannedFile): string {
  return `${file.path} ${file.name} ${file.purpose}`.toLowerCase();
}

function scoreStepFileMatch(stepLabel: string, file: PlannedFile): number {
  const keywords = extractStepKeywords(stepLabel);
  if (keywords.length === 0) return 0;

  const haystack = fileSearchText(file);
  const pathBase =
    file.path
      .split("/")
      .pop()
      ?.replace(/\.[^.]+$/, "")
      .toLowerCase() ?? "";

  let score = 0;
  for (const kw of keywords) {
    if (haystack.includes(kw)) score += 1;
    if (pathBase.includes(kw)) score += 2;
  }
  return score;
}

function isFoundationStep(label: string): boolean {
  const lower = label.toLowerCase();
  return (
    lower.includes("tailwind") ||
    lower.includes("react project") ||
    lower.includes("foundation") ||
    lower.includes("dependencies") ||
    lower.includes("setup") ||
    lower.includes("set up")
  );
}

function isDeployStep(label: string): boolean {
  const lower = label.toLowerCase();
  return lower.includes("deploy") || lower.includes("responsiveness") || lower.includes("test");
}

/** Map AI-generated step labels to actual planned file paths for progress tracking. */
export function linkPlanStepsToFiles(plan: ProjectPlan): PlanStep[] {
  const baseSteps =
    plan.steps && plan.steps.length > 0 ? plan.steps : derivePlanSteps(plan);
  const files = plan.files ?? [];
  const assigned = new Set<string>();

  const takeFile = (file: PlannedFile): string => {
    assigned.add(normalizePath(file.path));
    return file.path;
  };

  return baseSteps.map((step) => {
    const validPaths = (step.relatedPaths ?? []).filter((p) =>
      files.some((f) => pathsMatch(f.path, p))
    );
    if (validPaths.length > 0) {
      validPaths.forEach((p) => {
        const match = files.find((f) => pathsMatch(f.path, p));
        if (match) assigned.add(normalizePath(match.path));
      });
      return { ...step, relatedPaths: validPaths };
    }

    if (isFoundationStep(step.label)) {
      const configFiles = files.filter(
        (f) =>
          !assigned.has(normalizePath(f.path)) &&
          (isConfigFile(f.path) ||
            f.path.toLowerCase().includes("tailwind") ||
            f.path.toLowerCase().includes("index.css") ||
            f.path.toLowerCase().includes("globals.css") ||
            /(^|\/)app\.(jsx?|tsx?)$/i.test(f.path))
      );
      if (configFiles.length > 0) {
        return { ...step, relatedPaths: configFiles.map(takeFile) };
      }
    }

    if (isDeployStep(step.label)) {
      const deployFiles = files.filter(
        (f) =>
          !assigned.has(normalizePath(f.path)) &&
          (f.path.toLowerCase().includes("readme") ||
            f.path.toLowerCase().includes("plan.md"))
      );
      if (deployFiles.length > 0) {
        return { ...step, relatedPaths: deployFiles.map(takeFile) };
      }
    }

    let best: { file: PlannedFile; score: number } | null = null;
    for (const file of files) {
      if (assigned.has(normalizePath(file.path))) continue;
      const score = scoreStepFileMatch(step.label, file);
      if (score > 0 && (!best || score > best.score)) {
        best = { file, score };
      }
    }
    if (best) {
      return { ...step, relatedPaths: [takeFile(best.file)] };
    }

    const next = files.find((f) => !assigned.has(normalizePath(f.path)));
    if (next) {
      return { ...step, relatedPaths: [takeFile(next)] };
    }

    return step;
  });
}

function pathsMatch(filePath: string, stepPath: string): boolean {
  const f = normalizePath(filePath);
  const s = normalizePath(stepPath);
  if (f === s) return true;
  if (f.endsWith(`/${s}`)) return true;
  const fBase = f.split("/").pop() ?? f;
  const sBase = s.split("/").pop() ?? s;
  return fBase === sBase;
}

export function getPlanSteps(plan: ProjectPlan): PlanStep[] {
  return linkPlanStepsToFiles(plan);
}

export function getStepStatus(
  step: PlanStep,
  liveFiles?: ExplorerFile[]
): StepStatus {
  if (!liveFiles || liveFiles.length === 0) return "pending";

  const paths = (step.relatedPaths ?? []).map(normalizePath);
  if (paths.length === 0) {
    const doneCount = liveFiles.filter(
      (f) => f.status === "done" || f.status === "skipped"
    ).length;
    if (doneCount === liveFiles.length) return "done";
    const building = liveFiles.some((f) => f.status === "building");
    if (building && step.id === "database") return "active";
    if (doneCount > liveFiles.length * 0.6) return "done";
    return "pending";
  }

  const related = liveFiles.filter((f) =>
    paths.some((p) => pathsMatch(f.file_path, p))
  );
  if (related.length === 0) return "pending";
  if (related.some((f) => f.status === "building")) return "active";
  if (related.every((f) => f.status === "done" || f.status === "skipped")) {
    return "done";
  }
  if (related.some((f) => f.status === "done" || f.status === "building")) {
    return "active";
  }
  return "pending";
}

export function countStepsByStatus(
  steps: PlanStep[],
  liveFiles?: ExplorerFile[]
): { done: number; total: number } {
  const total = steps.length;
  if (!liveFiles) return { done: 0, total };
  const done = steps.filter((s) => getStepStatus(s, liveFiles) === "done").length;
  return { done, total };
}

export function getActiveStepLabel(
  steps: PlanStep[],
  liveFiles?: ExplorerFile[]
): string | null {
  const active = steps.find((s) => getStepStatus(s, liveFiles) === "active");
  return active?.label ?? null;
}
