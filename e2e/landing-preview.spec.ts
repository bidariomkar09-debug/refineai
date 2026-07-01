import { test, expect } from "@playwright/test";
import { buildSandpackFiles } from "../app/lib/previewSandpack";
import { landingPageProjectFiles } from "../app/e2e/fixtures/landingPage";

test.describe("RefineAI landing preview", () => {
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
  });
});
