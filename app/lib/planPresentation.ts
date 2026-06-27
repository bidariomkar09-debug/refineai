import type { DbFile, PlannedFile, ProjectPlan, TechStack } from "./agentTypes";

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
