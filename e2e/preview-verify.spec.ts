import { test, expect } from "@playwright/test";
import { verifyProjectPreview } from "../app/lib/previewVerify";
import { validateImportGraph } from "../app/lib/importGraph";
import { ensureAppImportsAllSections } from "../app/lib/wireAppEntry";
import { landingPageProjectFiles } from "../app/e2e/fixtures/landingPage";
import type { DbFile } from "../app/lib/agentTypes";

const brokenImportFiles: DbFile[] = [
  {
    id: "app",
    project_id: "p",
    file_path: "src/App.js",
    file_name: "App.js",
    content: `import Missing from "./components/DoesNotExist";
export default function App() { return <Missing />; }`,
    status: "done",
    score: 95,
    rounds_taken: 1,
    sort_order: 0,
    created_at: new Date().toISOString(),
  },
];

test.describe("Preview verify gate", () => {
  test("verifyProjectPreview passes on landing fixture", () => {
    const result = verifyProjectPreview(landingPageProjectFiles);
    expect(result.ok).toBe(true);
    expect(result.errors).toEqual([]);
  });

  test("verifyProjectPreview fails on unresolved import", () => {
    const result = verifyProjectPreview(brokenImportFiles);
    expect(result.ok).toBe(false);
    expect(result.errors.some((e) => e.includes("DoesNotExist"))).toBe(true);
  });

  test("validateImportGraph catches missing relative paths", () => {
    const result = validateImportGraph({
      "/src/App.js": `import X from "./missing"; export default function App() { return null; }`,
    });
    expect(result.valid).toBe(false);
  });

  test("ensureAppImportsAllSections merges partial App.js", () => {
    const files = {
      "/src/App.js": `import React from "react";
export default function App() { return <div><Hero /></div>; }`,
      "/src/components/Hero.js": `export default function Hero() { return <h1>Hi</h1>; }`,
      "/src/components/Footer.js": `export default function Footer() { return <footer />; }`,
    };
    const merged = ensureAppImportsAllSections(files);
    expect(merged["/src/App.js"]).toContain("./components/Hero");
    expect(merged["/src/App.js"]).toContain("./components/Footer");
    expect(merged["/src/App.js"]).toContain("<Footer />");
  });

  test("preview verify API route", async ({ request }) => {
    const res = await request.post("/api/preview/verify", {
      data: { projectId: "00000000-0000-0000-0000-000000000000" },
    });
    expect(res.ok()).toBeTruthy();
    const body = await res.json();
    expect(body).toHaveProperty("ok");
  });
});

test.describe("Workspace Run App", () => {
  test("e2e preview harness runs without ModuleNotFoundError", async ({ page }) => {
    const errors: string[] = [];
    page.on("pageerror", (err) => errors.push(err.message));

    await page.goto("/e2e/preview");
    await expect(page.getByTestId("e2e-preview-root")).toBeVisible();

    const frame = page.frameLocator("iframe").first();
    await expect(frame.getByText("RefineAI Landing Page")).toBeVisible({ timeout: 30_000 });

    const moduleErrors = errors.filter((e) =>
      /ModuleNotFoundError|Cannot find module/i.test(e)
    );
    expect(moduleErrors).toEqual([]);
  });
});
