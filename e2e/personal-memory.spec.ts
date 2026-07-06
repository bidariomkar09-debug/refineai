import { test, expect } from "@playwright/test";
import type { DbFile, DbMessage, DbProject, ProjectPlan } from "../app/lib/agentTypes";
import {
  EMPTY_PERSONAL_MEMORY,
  applyMemoryOverrides,
  effectiveList,
  effectiveStack,
  formatMemoryForPrompt,
  mergePersonalMemory,
  normalizePersonalMemory,
} from "../app/lib/personalMemory";
import { extractMemoryFromProject } from "../app/lib/memoryExtractor";
import { buildFileTaskUserPrompt } from "../app/lib/agentAI";

function mockProject(overrides: Partial<DbProject> = {}): DbProject {
  const plan: ProjectPlan = {
    name: "Portfolio Site",
    description: "A personal portfolio with hero and contact sections.",
    niche: "portfolio",
    techStack: {
      frontend: "React",
      backend: "none",
      database: "none",
      styling: "Tailwind CSS",
      deploy: "Vercel",
      ai: "none",
    },
    files: [
      {
        path: "src/components/Hero.js",
        name: "Hero.js",
        purpose: "Hero section",
        isApiRoute: false,
      },
    ],
    estimatedFiles: 1,
    estimatedMinutes: 1,
    steps: [],
  };

  return {
    id: "proj-1",
    name: "Portfolio Site",
    description: "Portfolio",
    niche: "portfolio",
    status: "complete",
    plan,
    tech_stack: plan.techStack,
    created_at: new Date().toISOString(),
    ...overrides,
  };
}

function mockFile(path: string, content: string): DbFile {
  return {
    id: path,
    project_id: "proj-1",
    file_path: path,
    file_name: path.split("/").pop() ?? path,
    content,
    status: "done",
    score: 96,
    rounds_taken: 1,
    sort_order: 0,
    created_at: "",
  };
}

test.describe("Personal AI memory", () => {
  test("normalizePersonalMemory returns safe defaults", () => {
    const memory = normalizePersonalMemory(null);
    expect(memory.codingStyle).toEqual([]);
    expect(memory.pastProjectSummaries).toEqual([]);
    expect(memory.userEditedNotes).toBe("");
  });

  test("user overrides take priority in effective values", () => {
    const memory = applyMemoryOverrides(
      mergePersonalMemory(EMPTY_PERSONAL_MEMORY, {
        codingStyle: ["Inferred style"],
        preferredStack: { frontend: "Vue" },
      }),
      {
        codingStyle: ["User prefers TypeScript"],
        preferredStack: { frontend: "React" },
      }
    );

    expect(effectiveList(memory.codingStyle, memory.userOverrides?.codingStyle)).toEqual([
      "User prefers TypeScript",
    ]);
    expect(effectiveStack(memory).frontend).toBe("React");
  });

  test("formatMemoryForPrompt includes stack, overrides, and notes", () => {
    const memory = mergePersonalMemory(EMPTY_PERSONAL_MEMORY, {
      preferredStack: { frontend: "React", styling: "Tailwind CSS" },
      userEditedNotes: "Always use rounded-xl cards.",
      pastProjectSummaries: [
        {
          projectId: "p1",
          name: "Landing",
          niche: "landing",
          summary: "SaaS hero page",
          completedAt: new Date().toISOString(),
        },
      ],
    });

    const prompt = formatMemoryForPrompt(memory);
    expect(prompt).toContain("Preferred stack:");
    expect(prompt).toContain("frontend: React");
    expect(prompt).toContain("User notes:");
    expect(prompt).toContain("rounded-xl");
    expect(prompt).toContain("Past projects:");
  });

  test("formatMemoryForPrompt returns empty string when memory is empty", () => {
    expect(formatMemoryForPrompt(EMPTY_PERSONAL_MEMORY)).toBe("");
  });

  test("extractMemoryFromProject infers stack, patterns, and summary", () => {
    const project = mockProject();
    const files = [
      mockFile(
        "src/components/Hero.js",
        `import { Sparkles } from "lucide-react";
export default function Hero() {
  return <div className="flex rounded-2xl bg-gray-900">Hello</div>;
}`
      ),
    ];
    const messages: DbMessage[] = [
      {
        id: "m1",
        project_id: "proj-1",
        role: "user",
        content: "Build a minimal dark portfolio with Tailwind",
        type: "chat",
        metadata: {},
        created_at: "",
      },
    ];

    const memory = extractMemoryFromProject(
      EMPTY_PERSONAL_MEMORY,
      project,
      files,
      messages
    );

    expect(memory.preferredStack.frontend).toBe("React");
    expect(memory.preferredStack.styling).toBe("Tailwind CSS");
    expect(memory.codingPatterns.some((p) => /lucide-react/i.test(p))).toBe(true);
    expect(memory.designTaste.some((t) => /minimal/i.test(t))).toBe(true);
    expect(memory.pastProjectSummaries[0]?.projectId).toBe("proj-1");
    expect(memory.pastProjectSummaries[0]?.name).toBe("Portfolio Site");
  });

  test("extractMemoryFromProject replaces summary for same project", () => {
    const existing = mergePersonalMemory(EMPTY_PERSONAL_MEMORY, {
      pastProjectSummaries: [
        {
          projectId: "proj-1",
          name: "Old name",
          niche: "old",
          summary: "old summary",
          completedAt: "2020-01-01",
        },
      ],
    });

    const memory = extractMemoryFromProject(
      existing,
      mockProject(),
      [mockFile("src/App.js", "export default () => null")],
      []
    );

    expect(memory.pastProjectSummaries).toHaveLength(1);
    expect(memory.pastProjectSummaries[0].name).toBe("Portfolio Site");
    expect(memory.pastProjectSummaries[0].summary).not.toBe("old summary");
  });

  test("buildFileTaskUserPrompt prepends personal memory block", () => {
    const memoryBlock =
      "[Personal memory — apply unless the user overrides now]\nPreferred stack: frontend: React";
    const prompt = buildFileTaskUserPrompt({
      task: "write",
      filePath: "src/components/Hero.js",
      filePurpose: "Hero",
      projectContext: "Portfolio app",
      completedFiles: "none",
      round: 1,
      personalMemory: memoryBlock,
    });

    expect(prompt.startsWith(memoryBlock)).toBe(true);
    expect(prompt).toContain("[Project Context]");
    expect(prompt).toContain("Portfolio app");
  });
});
