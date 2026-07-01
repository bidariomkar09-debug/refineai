import { test, expect } from "@playwright/test";
import { buildSandpackFiles } from "../app/lib/previewSandpack";
import { portfolioPreviewFiles } from "../app/e2e/fixtures/portfolioPreviewFixture";

test.describe("Portfolio preview harness", () => {
  test("buildSandpackFiles includes Hero.css stub", () => {
    const bundle = buildSandpackFiles(portfolioPreviewFiles);
    expect(bundle!.files["/src/components/Hero.css"]).toBeTruthy();
    expect(bundle!.files["/src/App.js"]).toContain("./components/Hero");
  });

  test("renders portfolio with CSS import stubs in Sandpack", async ({ page }) => {
    const errors: string[] = [];
    page.on("pageerror", (err) => errors.push(err.message));

    await page.goto("/e2e/portfolio-preview");
    await expect(page.getByTestId("e2e-preview-root")).toBeVisible();

    const preview = page.frameLocator("iframe").first();
    await expect(preview.getByText("I'M OMKAR BIDARI")).toBeVisible({
      timeout: 90_000,
    });
    await expect(preview.getByText(/ModuleNotFoundError/i)).toHaveCount(0);
    expect(errors.filter((e) => /ModuleNotFoundError/i.test(e))).toEqual([]);
  });
});
