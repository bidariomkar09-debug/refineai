import { test, expect } from "@playwright/test";

test.describe("Workspace stability", () => {
  test("workspace page loads without client-side crash", async ({ page }) => {
    const errors: string[] = [];
    page.on("pageerror", (err) => errors.push(err.message));

    await page.goto("/workspace?new=1");
    await expect(page.getByRole("button", { name: "Plan" })).toBeVisible({
      timeout: 30_000,
    });
    expect(errors).toEqual([]);
  });

  test("workspace accepts lowercase projectid query param", async ({ page }) => {
    const errors: string[] = [];
    page.on("pageerror", (err) => errors.push(err.message));

    await page.goto(
      "/workspace?projectid=b56a618d-c0cc-4771-9ba0-db5722dfb335"
    );
    await page.waitForTimeout(3000);
    await expect(page.locator("body")).not.toContainText(
      "Application error: a client-side exception has occurred"
    );
    expect(errors).toEqual([]);
  });
});
