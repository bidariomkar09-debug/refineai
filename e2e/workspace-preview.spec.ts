import { test, expect } from "@playwright/test";

test.describe("Workspace preview tab", () => {
  test("preview tab opens without crash on loaded project", async ({ page }) => {
    const errors: string[] = [];
    page.on("pageerror", (err) => errors.push(err.message));

    await page.goto(
      "/workspace?projectId=b56a618d-c0cc-4771-9ba0-db5722dfb335"
    );
    await page.waitForTimeout(4000);

    await page.getByRole("button", { name: "Preview" }).click();
    await page.waitForTimeout(8000);

    expect(errors).toEqual([]);
    await expect(page.getByText(/Live preview|Preview unavailable|Run App/i).first()).toBeVisible();
  });
});
