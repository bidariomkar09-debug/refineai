import { test, expect } from "@playwright/test";
import { buildSandpackFiles } from "../app/lib/previewSandpack";
import { landingPageProjectFiles } from "../app/e2e/fixtures/landingPage";
import type { DbFile } from "../app/lib/agentTypes";
import { wireAppEntry } from "../app/lib/wireAppEntry";
import { importPathFromApp } from "../app/lib/previewAssetStubs";

const portfolioStubFiles: DbFile[] = [
  {
    id: "stub-app",
    project_id: "p1",
    file_path: "src/App.js",
    file_name: "App.js",
    content: `export default function App() { return <h1>Hello world</h1>; }`,
    status: "done",
    score: 35,
    rounds_taken: 1,
    sort_order: 0,
    created_at: new Date().toISOString(),
  },
  {
    id: "about",
    project_id: "p1",
    file_path: "src/components/About.js",
    file_name: "About.js",
    content: `export default function About() { return <section><h2>About Omkar Bidari</h2></section>; }`,
    status: "done",
    score: 95,
    rounds_taken: 1,
    sort_order: 1,
    created_at: new Date().toISOString(),
  },
  {
    id: "hero",
    project_id: "p1",
    file_path: "src/components/Hero.js",
    file_name: "Hero.js",
    content: `import React from 'react';\nimport './Hero.css';\nexport default function Hero() { return <section><h1>I'M OMKAR BIDARI</h1></section>; }`,
    status: "done",
    score: 95,
    rounds_taken: 1,
    sort_order: 2,
    created_at: new Date().toISOString(),
  },
];

test.describe("RefineAI landing preview", () => {
  test("importPathFromApp resolves src/components paths", () => {
    expect(importPathFromApp("/src/App.js", "/src/components/Hero.js")).toBe(
      "./components/Hero"
    );
  });

  test("wireAppEntry replaces Hello world stub with section imports", () => {
    const files: Record<string, string> = {
      "/src/App.js": portfolioStubFiles[0].content!,
      "/src/components/About.js": portfolioStubFiles[1].content!,
      "/src/components/Hero.js": portfolioStubFiles[2].content!,
    };
    const wired = wireAppEntry(files);
    expect(wired["/src/App.js"]).toContain("./components/About");
    expect(wired["/src/App.js"]).toContain("./components/Hero");
    expect(wired["/src/App.js"]).not.toMatch(/hello world/i);
  });

  test("buildSandpackFiles stubs missing Hero.css and wires components", () => {
    const bundle = buildSandpackFiles(portfolioStubFiles);
    expect(bundle).not.toBeNull();
    expect(bundle!.files["/src/components/Hero.css"]).toBeTruthy();
    expect(bundle!.files["/src/App.js"]).toContain("./components/Hero");
    expect(String(bundle!.files["/src/App.js"])).not.toMatch(/hello world/i);
  });

  test("buildSandpackFiles wires src/App.js and strips template Hello world", () => {
    const bundle = buildSandpackFiles(landingPageProjectFiles);
    expect(bundle).not.toBeNull();
    expect(bundle!.template).toBe("react");
    expect(bundle!.entry).toBe("/index.js");
    expect(bundle!.files["/App.js"]).toBe(false);
    expect(bundle!.files["/index.js"]).toContain("./src/App");
    expect(bundle!.files["/src/Hero.js"]).toContain("RefineAI Landing Page");
  });

  test("e2e preview page renders the landing page inside Sandpack", async ({
    page,
  }) => {
    await page.goto("/e2e/preview");
    await expect(page.getByTestId("e2e-preview-root")).toBeVisible();
    await expect(page.getByText("RefineAI · E2E preview harness")).toBeVisible();

    const iframe = page.locator("iframe").first();
    await expect(iframe).toBeVisible({ timeout: 30_000 });

    const preview = page.frameLocator("iframe").first();
    await expect(preview.getByText("RefineAI Landing Page")).toBeVisible({
      timeout: 90_000,
    });
    await expect(preview.getByRole("button", { name: "Get Started" })).toBeVisible();
    await expect(preview.getByText("Welcome")).toBeVisible();

    await expect(preview.getByText(/hello world/i)).toHaveCount(0);
    await expect(preview.getByText(/ModuleNotFoundError/i)).toHaveCount(0);
  });
});
