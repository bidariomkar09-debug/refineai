import type { FileTask, ProjectPlan } from "./agentTypes";

export type TaskType =
  | "code_generation"
  | "code_review"
  | "code_refine"
  | "api_design"
  | "ui_component"
  | "database_schema"
  | "documentation"
  | "config_file";

export function detectFileType(filePath: string): string {
  const ext = filePath.split(".").pop()?.toLowerCase() ?? "other";
  return ext.startsWith(".") ? ext : `.${ext}`;
}

export function detectProjectType(niche: string | null, plan: ProjectPlan): string {
  if (niche?.trim()) return niche.trim();
  if (plan.niche?.trim()) return plan.niche.trim();
  return plan.name || "general";
}

export function detectTaskType(
  task: FileTask,
  filePath: string,
  filePurpose: string
): TaskType {
  const lowerPath = filePath.toLowerCase();
  const lowerPurpose = filePurpose.toLowerCase();
  const combined = `${lowerPath} ${lowerPurpose}`;

  if (task === "review") return "code_review";
  if (task === "refine") return "code_refine";

  if (
    lowerPath.includes("/api/") ||
    lowerPath.includes("route.ts") ||
    lowerPath.includes("route.tsx") ||
    combined.includes("api route")
  ) {
    return "api_design";
  }
  if (
    (lowerPath.endsWith(".tsx") || lowerPath.endsWith(".jsx")) &&
    (lowerPath.includes("/components/") || combined.includes("component"))
  ) {
    return "ui_component";
  }
  if (lowerPath.endsWith(".sql") || combined.includes("schema") || combined.includes("migration")) {
    return "database_schema";
  }
  if (lowerPath.endsWith(".md") || lowerPath.endsWith(".mdx") || combined.includes("readme")) {
    return "documentation";
  }
  if (
    lowerPath.endsWith(".json") ||
    lowerPath.endsWith(".env") ||
    lowerPath.includes("config") ||
    lowerPath.endsWith(".yaml") ||
    lowerPath.endsWith(".yml")
  ) {
    return "config_file";
  }

  return "code_generation";
}
