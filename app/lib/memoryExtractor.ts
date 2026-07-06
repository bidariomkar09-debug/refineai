import type { DbFile, DbMessage, DbProject, ProjectPlan } from "./agentTypes";
import type { PastProjectSummary, PersonalMemory } from "./personalMemoryTypes";
import { mergePersonalMemory, normalizePersonalMemory } from "./personalMemory";

const LIBRARY_PATTERNS: Array<{ pattern: RegExp; label: string }> = [
  { pattern: /lucide-react/, label: "Uses lucide-react icons" },
  { pattern: /react-icons/, label: "Uses react-icons" },
  { pattern: /framer-motion/, label: "Uses framer-motion animations" },
  { pattern: /react-router-dom/, label: "Uses react-router-dom routing" },
  { pattern: /clsx/, label: "Uses clsx for class names" },
  { pattern: /axios/, label: "Uses axios for HTTP" },
];

const STYLE_PATTERNS: Array<{ pattern: RegExp; label: string }> = [
  { pattern: /className=["'][^"']*\b(flex|grid)\b/, label: "Flex/grid Tailwind layouts" },
  { pattern: /className=["'][^"']*\brounded-(xl|2xl|3xl)\b/, label: "Rounded card UI" },
  { pattern: /className=["'][^"']*\b(dark:|bg-gray-9|bg-slate-9|bg-\[#)/, label: "Dark-themed UI" },
  { pattern: /className=["'][^"']*\b(bg-white|text-gray-9)\b/, label: "Light minimal UI" },
  { pattern: /className=["'][^"']*\b(gradient|from-|to-)/, label: "Gradient accents" },
];

const DESIGN_KEYWORDS: Array<{ pattern: RegExp; label: string }> = [
  { pattern: /\bminimal(ist)?\b/i, label: "Minimal design" },
  { pattern: /\bdark mode\b/i, label: "Dark mode preference" },
  { pattern: /\blight mode\b/i, label: "Light mode preference" },
  { pattern: /\bportfolio\b/i, label: "Portfolio-style sites" },
  { pattern: /\blanding page\b/i, label: "Landing pages" },
  { pattern: /\btailwind\b/i, label: "Tailwind CSS" },
  { pattern: /\bmodern\b/i, label: "Modern aesthetic" },
  { pattern: /\bclean\b/i, label: "Clean layout" },
];

function collectFromContent(files: DbFile[]): {
  patterns: string[];
  styles: string[];
} {
  const patterns = new Set<string>();
  const styles = new Set<string>();
  const blob = files
    .filter((f) => f.content)
    .map((f) => f.content!)
    .join("\n");

  for (const { pattern, label } of LIBRARY_PATTERNS) {
    if (pattern.test(blob)) patterns.add(label);
  }
  for (const { pattern, label } of STYLE_PATTERNS) {
    if (pattern.test(blob)) styles.add(label);
  }

  if (files.some((f) => /src\/components\//i.test(f.file_path))) {
    patterns.add("Section components in src/components/");
  }
  if (files.some((f) => /\.js$/i.test(f.file_path) && !/tsx?$/i.test(f.file_path))) {
    styles.add("JavaScript (not TypeScript) components");
  }

  return {
    patterns: Array.from(patterns),
    styles: Array.from(styles),
  };
}

function collectFromMessages(messages: DbMessage[]): string[] {
  const taste = new Set<string>();
  const userText = messages
    .filter((m) => m.role === "user")
    .map((m) => m.content)
    .join("\n");

  for (const { pattern, label } of DESIGN_KEYWORDS) {
    if (pattern.test(userText)) taste.add(label);
  }
  return Array.from(taste);
}

function stackFromPlan(plan: ProjectPlan): PersonalMemory["preferredStack"] {
  const ts = plan.techStack ?? {};
  return {
    frontend: ts.frontend || undefined,
    backend: ts.backend || undefined,
    database: ts.database || undefined,
    styling: ts.styling || undefined,
    deploy: ts.deploy || undefined,
    ai: ts.ai || undefined,
  };
}

function buildProjectSummary(
  project: DbProject,
  plan: ProjectPlan,
  files: DbFile[]
): PastProjectSummary {
  const done = files.filter((f) => f.status === "done");
  const avgScore =
    done.length > 0
      ? Math.round(done.reduce((s, f) => s + f.score, 0) / done.length)
      : 0;

  return {
    projectId: project.id,
    name: plan.name || project.name,
    niche: plan.niche || project.niche || "general",
    summary: `${plan.description?.slice(0, 120) || project.description.slice(0, 120)} (${done.length} files, ${avgScore}% avg)`,
    completedAt: new Date().toISOString(),
  };
}

function mergeStacks(
  a: PersonalMemory["preferredStack"],
  b: PersonalMemory["preferredStack"]
): PersonalMemory["preferredStack"] {
  const out = { ...a };
  for (const [key, value] of Object.entries(b)) {
    if (value && value !== "none" && value !== "N/A") {
      (out as Record<string, string>)[key] = value;
    }
  }
  return out;
}

function mergeUniqueLists(existing: string[], incoming: string[]): string[] {
  const seen = new Set(existing.map((s) => s.toLowerCase()));
  const out = [...existing];
  for (const item of incoming) {
    const key = item.toLowerCase();
    if (seen.has(key)) continue;
    seen.add(key);
    out.push(item);
  }
  return out.slice(0, 12);
}

export function extractMemoryFromProject(
  current: PersonalMemory,
  project: DbProject,
  files: DbFile[],
  messages: DbMessage[]
): PersonalMemory {
  const plan = (project.plan ?? {}) as ProjectPlan;
  const base = normalizePersonalMemory(current);

  const fromFiles = collectFromContent(files);
  const fromMessages = collectFromMessages(messages);
  const summary = buildProjectSummary(project, plan, files);

  const summaries = [
    summary,
    ...base.pastProjectSummaries.filter((s) => s.projectId !== project.id),
  ].slice(0, 12);

  return mergePersonalMemory(base, {
    preferredStack: mergeStacks(base.preferredStack, stackFromPlan(plan)),
    codingStyle: mergeUniqueLists(base.codingStyle, fromFiles.styles),
    designTaste: mergeUniqueLists(base.designTaste, fromMessages),
    codingPatterns: mergeUniqueLists(base.codingPatterns, fromFiles.patterns),
    pastProjectSummaries: summaries,
  });
}
