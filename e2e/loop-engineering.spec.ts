import { test, expect } from "@playwright/test";

test.describe("Loop Engineering UI", () => {
  test("loop bar hidden in Ask mode on workspace", async ({ page }) => {
    const errors: string[] = [];
    page.on("pageerror", (err) => errors.push(err.message));

    await page.goto("/workspace?new=1");
    await expect(page.getByRole("button", { name: "Plan" })).toBeVisible({
      timeout: 30_000,
    });

    const modeButton = page.locator('button[aria-haspopup="listbox"]').first();
    await modeButton.click();
    await page.getByRole("option", { name: "Ask" }).click();

    await expect(page.getByTestId("loop-engineering-bar")).toHaveCount(0);
    expect(errors).toEqual([]);
  });

  test("loop bar visible in Agent mode when composer active", async ({ page }) => {
    const errors: string[] = [];
    page.on("pageerror", (err) => errors.push(err.message));

    await page.goto("/workspace?new=1");
    await expect(page.getByRole("button", { name: "Plan" })).toBeVisible({
      timeout: 30_000,
    });

    const modeButton = page.locator('button[aria-haspopup="listbox"]').first();
    await modeButton.click();
    await page.getByRole("option", { name: "Agent" }).click();

    const composer = page.locator("textarea").first();
    await composer.click();
    await composer.fill("Build a portfolio site");

    await expect(page.getByTestId("loop-engineering-bar")).toBeVisible();
    await expect(page.getByText("Human sets goal")).toBeVisible();
    expect(errors).toEqual([]);
  });

  test("harness simulates loop steps and review panel", async ({ page }) => {
    await page.goto("/e2e/loop-engineering");
    await expect(page.getByTestId("loop-harness-root")).toBeVisible();

    await expect(page.getByTestId("loop-engineering-bar")).toBeVisible();
    await page.getByTestId("harness-step3").click();
    await expect(page.getByTestId("harness-active-step")).toHaveText("Active step: 3");

    await page.getByTestId("harness-review-fail").click();
    await expect(page.getByTestId("loop-counter")).toBeVisible();
    await expect(page.getByText("Loop 1")).toBeVisible();

    await page.getByTestId("harness-review-pass").click();
    await expect(page.getByTestId("loop-counter").getByText("Goal Met!")).toBeVisible();

    await page.getByTestId("harness-complete").click();
    await expect(page.getByTestId("human-review-panel")).toBeVisible();
    await page.getByRole("button", { name: "Accept All" }).click();
    await expect(page.getByTestId("loop-engineering-summary")).toBeVisible();
  });

  test("harness hides bar in Ask mode", async ({ page }) => {
    await page.goto("/e2e/loop-engineering");
    await page.getByTestId("harness-mode-ask").click();
    await expect(page.getByTestId("loop-engineering-bar")).toHaveCount(0);
    await page.getByTestId("harness-mode-agent").click();
    await expect(page.getByTestId("loop-engineering-bar")).toBeVisible();
  });
});
