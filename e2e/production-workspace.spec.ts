import { test, expect } from "@playwright/test";

const PRODUCTION_URL =
  process.env.REFINEAI_E2E_URL ?? "https://refineai-five.vercel.app";

async function expectWorkspaceLoaded(page: import("@playwright/test").Page) {
  await expect(page.getByRole("button", { name: "Plan" })).toBeVisible({
    timeout: 45_000,
  });
  await expect(page.locator("body")).not.toContainText(
    "Application error: a client-side exception has occurred"
  );
}

test.describe("Production workspace", () => {
  test("loads workspace with real project without crash", async ({ page }) => {
    const errors: string[] = [];
    page.on("pageerror", (err) => errors.push(err.message));

    await page.goto(
      `${PRODUCTION_URL}/workspace?projectId=b56a618d-c0cc-4771-9ba0-db5722dfb335`,
      { waitUntil: "domcontentloaded", timeout: 60_000 }
    );

    await expectWorkspaceLoaded(page);

    if (errors.length > 0) {
      console.log("Page errors:", errors);
    }
    expect(errors).toEqual([]);
  });

  test("loads workspace with lowercase projectid param", async ({ page }) => {
    const errors: string[] = [];
    page.on("pageerror", (err) => errors.push(err.message));

    await page.goto(
      `${PRODUCTION_URL}/workspace?projectid=b56a618d-c0cc-4771-9ba0-db5722dfb335`,
      { waitUntil: "domcontentloaded", timeout: 60_000 }
    );

    await expectWorkspaceLoaded(page);
    expect(errors).toEqual([]);
  });
});
