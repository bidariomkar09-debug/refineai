import { test, expect } from "@playwright/test";

const PRODUCTION_URL =
  process.env.REFINEAI_E2E_URL ?? "https://refineai-five.vercel.app";

test.describe("Production workspace", () => {
  test("loads workspace with real project without crash", async ({ page }) => {
    const errors: string[] = [];
    page.on("pageerror", (err) => errors.push(err.message));

    await page.goto(
      `${PRODUCTION_URL}/workspace?projectId=b56a618d-c0cc-4771-9ba0-db5722dfb335`,
      { waitUntil: "networkidle", timeout: 60_000 }
    );

    await page.waitForTimeout(5000);

    const bodyText = await page.locator("body").innerText();
    expect(bodyText).not.toContain(
      "Application error: a client-side exception has occurred"
    );

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
      { waitUntil: "networkidle", timeout: 60_000 }
    );

    await page.waitForTimeout(5000);

    const bodyText = await page.locator("body").innerText();
    expect(bodyText).not.toContain(
      "Application error: a client-side exception has occurred"
    );
    expect(errors).toEqual([]);
  });
});
