import { test, expect, type Page } from "@playwright/test";

/**
 * Visual Plan Mode — clarifying questions + "What We're Building" preview.
 *
 * Local:
 *   npx playwright test e2e/visual-plan-mode.spec.ts
 */

async function openFreshWorkspace(page: Page) {
  await page.goto("/workspace?new=1", {
    waitUntil: "domcontentloaded",
    timeout: 60_000,
  });
  const composer = page
    .getByRole("textbox", {
      name: /Plan, @ for context|Describe your app idea|Ask,/i,
    })
    .first();
  await expect(composer).toBeVisible({ timeout: 45_000 });
  return composer;
}

async function switchToPlanMode(page: Page): Promise<boolean> {
  const modeBtn = page
    .locator('button[aria-haspopup="listbox"]')
    .filter({ hasText: /Agent|Plan|Ask|Debug/ })
    .first();

  const btnVisible = await modeBtn.isVisible().catch(() => false);

  if (btnVisible) {
    await modeBtn.click();
    const menu = page.getByRole("listbox", { name: "Chat mode" });
    const menuOpen = await menu
      .waitFor({ state: "visible", timeout: 5_000 })
      .then(() => true)
      .catch(() => false);

    if (menuOpen) {
      await menu.getByRole("option", { name: "Plan", exact: true }).click();
    } else {
      const mod = process.platform === "darwin" ? "Meta" : "Control";
      await page.keyboard.press(`${mod}+Shift+M`);
    }
  } else {
    const mod = process.platform === "darwin" ? "Meta" : "Control";
    await page.keyboard.press(`${mod}+Shift+M`);
  }

  return page
    .locator('button[aria-haspopup="listbox"]')
    .filter({ hasText: /^Plan$/ })
    .first()
    .waitFor({ state: "visible", timeout: 8_000 })
    .then(() => true)
    .catch(() => false);
}

async function submitIdeaAndClarify(page: Page, idea: string) {
  const composer = await openFreshWorkspace(page);
  const inPlanMode = await switchToPlanMode(page);
  expect(inPlanMode).toBeTruthy();

  await composer.fill(idea);

  const firstPlanPromise = page.waitForResponse(
    (r) => r.url().includes("/api/modes/plan") && r.request().method() === "POST",
    { timeout: 180_000 }
  );
  await page.getByRole("button", { name: "Send message" }).first().click();

  const firstRes = await firstPlanPromise;
  const firstBody = await firstRes.text().catch(() => "");
  expect(firstBody).toContain('"type":"plan_clarifying"');

  await page.getByTestId("clarifying-questions").first().waitFor({
    state: "visible",
    timeout: 60_000,
  });

  await page.getByTestId("clarifying-submit").first().click();

  await page.getByTestId("plan-card").first().waitFor({
    state: "visible",
    timeout: 180_000,
  });
  await expect(page.getByTestId("plan-plain-english").first()).toBeVisible();
}

test.describe("Visual Plan Mode", () => {
  test.setTimeout(360_000);

  test("shows clarifying questions then visual plan preview", async ({ page }) => {
    const pageErrors: string[] = [];
    page.on("pageerror", (err) => pageErrors.push(err.message));

    const composer = await openFreshWorkspace(page);
    await switchToPlanMode(page);
    await composer.fill("Build a personal AI assistant with tasks and habits");

    const firstPlanPromise = page.waitForResponse(
      (r) => r.url().includes("/api/modes/plan") && r.request().method() === "POST",
      { timeout: 180_000 }
    );
    await page.getByRole("button", { name: "Send message" }).first().click();
    const firstBody = await (await firstPlanPromise).text();
    expect(firstBody).toContain('"type":"plan_clarifying"');

    await expect(page.getByTestId("clarifying-progress").first()).toContainText("5/5");

    await page.getByTestId("clarifying-submit").first().click();

    await page.getByTestId("plan-card").first().waitFor({
      state: "visible",
      timeout: 180_000,
    });

    await expect(page.getByTestId("plan-outcomes")).toBeVisible();
    await expect(page.getByTestId("plan-flowchart")).toBeVisible();
    await expect(page.getByTestId("plan-plain-english")).toBeVisible();
    await expect(page.getByTestId("plan-deliverables")).toBeVisible();

    const plainEnglish = await page.getByTestId("plan-plain-english").textContent();
    expect(plainEnglish ?? "").not.toMatch(/\.tsx|\/api\//);

    const buildBtn = page.getByTestId("build-plan-button");
    await expect(buildBtn.first()).toBeEnabled();

    expect(pageErrors).toEqual([]);
  });

  test("build stays locked until clarifications submitted", async ({ page }) => {
    const composer = await openFreshWorkspace(page);
    await switchToPlanMode(page);
    await composer.fill("Build a todo list app");

    await page.getByRole("button", { name: "Send message" }).first().click();

    await page.getByTestId("clarifying-questions").first().waitFor({
      state: "visible",
      timeout: 60_000,
    });

    const buildBtn = page.getByRole("button", { name: /^Build Plan$|^Build$/i });
    await expect(buildBtn).toHaveCount(0);
  });

  test("mobile viewport shows visual plan summary in chat", async ({ page }) => {
    await submitIdeaAndClarify(page, "Build a portfolio website");

    await page.setViewportSize({ width: 390, height: 844 });

    await expect(page.getByTestId("visual-plan-summary").first()).toBeVisible();
    const summary = await page.getByTestId("visual-plan-summary").first().textContent();
    expect(summary ?? "").not.toMatch(/\.tsx|\/api\//);
  });

  test("Make Changes reopens questions with prior selections", async ({ page }) => {
    await submitIdeaAndClarify(page, "Build a todo list with categories");

    const planCard = page.getByTestId("plan-card");
    await planCard.first().waitFor({ state: "visible", timeout: 120_000 });

    const makeChangesBtn = page.getByTestId("make-changes-button");
    await expect(makeChangesBtn.first()).toBeVisible({ timeout: 30_000 });
    await makeChangesBtn.first().click();

    await expect(page.getByTestId("clarifying-questions").first()).toBeVisible({
      timeout: 30_000,
    });
    await expect(page.getByTestId("clarifying-progress").first()).toContainText("5/5");

    await page.getByTestId("clarifying-submit").first().click();

    await expect(page.getByTestId("plan-plain-english").first()).toBeVisible({
      timeout: 180_000,
    });
  });
});
