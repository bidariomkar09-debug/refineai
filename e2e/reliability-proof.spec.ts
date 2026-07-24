import { test, expect } from "@playwright/test";
import { resolveFileOutcome, isFileTrulyComplete, isFileOrchestratorComplete } from "../app/lib/fileScoring";
import { formatMemoryForPrompt } from "../app/lib/personalMemory";
import { buildSandpackFiles } from "../app/lib/previewSandpack";
import type { DbFile } from "../app/lib/agentTypes";
import { isRetriableProviderError, ProviderError } from "../app/lib/modelProviders";

test.describe("Reliability proof", () => {
  test("AI 95 + runtime fail → needs_fix capped at 70", () => {
    const outcome = resolveFileOutcome({
      aiScore: 95,
      runtimeVerified: false,
      maxRoundsReached: false,
      staticPass: true,
    });
    expect(outcome.status).toBe("needs_fix");
    expect(outcome.displayScore).toBe(70);
    expect(outcome.runtimeVerified).toBe(false);
  });

  test("AI 95 + runtime pass → done and verified", () => {
    const outcome = resolveFileOutcome({
      aiScore: 97,
      runtimeVerified: true,
      maxRoundsReached: false,
      staticPass: true,
    });
    expect(outcome.status).toBe("done");
    expect(outcome.displayScore).toBe(97);
    expect(outcome.runtimeVerified).toBe(true);
  });

  test("runtime fail prevents truly complete", () => {
    expect(
      isFileTrulyComplete({
        status: "needs_fix",
        score: 70,
        runtime_verified: false,
      })
    ).toBe(false);
    expect(
      isFileTrulyComplete({
        status: "done",
        score: 95,
        runtime_verified: true,
      })
    ).toBe(true);
  });

  test("best_effort does not block orchestrator progression", () => {
    expect(
      isFileOrchestratorComplete({
        status: "best_effort",
        score: 80,
        runtime_verified: false,
      })
    ).toBe(true);
    expect(
      isFileOrchestratorComplete({
        status: "needs_fix",
        score: 70,
        runtime_verified: false,
      })
    ).toBe(true);
  });

  test("memory formatter non-empty when memory exists", () => {
    const text = formatMemoryForPrompt({
      preferredStack: { frontend: "React" },
      codingStyle: ["hooks"],
      designTaste: [],
      codingPatterns: [],
      pastProjectSummaries: [],
      userEditedNotes: "",
      lastUpdatedAt: new Date().toISOString(),
    });
    expect(text.length).toBeGreaterThan(0);
    expect(text).toContain("Personal memory");
    expect(text).toContain("React");
  });

  test("timeout-like errors are retriable", () => {
    expect(isRetriableProviderError(new ProviderError("timeout", 504))).toBe(true);
    expect(isRetriableProviderError(new Error("Request timed out"))).toBe(true);
    expect(isRetriableProviderError(new Error("bad request"))).toBe(false);
  });

  test("Sandpack bundle creates root /index.js for src apps", () => {
    const files: DbFile[] = [
      {
        id: "1",
        project_id: "p",
        file_path: "src/App.js",
        file_name: "App.js",
        content: `import React from "react";
export default function App() { return <h1>Hi</h1>; }`,
        status: "done",
        score: 95,
        rounds_taken: 1,
        sort_order: 0,
        created_at: new Date().toISOString(),
      },
      {
        id: "2",
        project_id: "p",
        file_path: "src/index.js",
        file_name: "index.js",
        content: `import React from "react";
import { createRoot } from "react-dom/client";
import App from "./App";
createRoot(document.getElementById("root")).render(<App />);`,
        status: "done",
        score: 95,
        rounds_taken: 1,
        sort_order: 1,
        created_at: new Date().toISOString(),
      },
    ];

    const bundle = buildSandpackFiles(files);
    expect(bundle).not.toBeNull();
    expect(bundle!.entry).toBe("/index.js");
    expect(typeof bundle!.files["/index.js"]).toBe("string");
    expect(bundle!.files["/index.js"]).not.toBe(false);
    expect(String(bundle!.files["/index.js"])).toContain("./src/App");
  });
});
