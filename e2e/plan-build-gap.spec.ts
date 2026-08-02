import { test, expect } from "@playwright/test";

/**
 * End-to-end gap finder for the core RefineAI story:
 *   idea → plan API → plan UI → confirm → build start
 *
 * Production:
 *   PLAYWRIGHT_BASE_URL=https://refineai-three.vercel.app npx playwright test e2e/plan-build-gap.spec.ts
 *
 * Local:
 *   npx playwright test e2e/plan-build-gap.spec.ts
 */

type Gap = {
  step: string;
  status: "pass" | "fail" | "skip";
  detail: string;
};

const gaps: Gap[] = [];

function record(step: string, status: Gap["status"], detail: string) {
  gaps.push({ step, status, detail });
  const icon = status === "pass" ? "✓" : status === "fail" ? "✗" : "–";
  console.log(`[${icon}] ${step}: ${detail}`);
}

function printGapReport() {
  console.log("\n========== PLAN → BUILD GAP REPORT ==========");
  for (const g of gaps) {
    const icon = g.status === "pass" ? "PASS" : g.status === "fail" ? "FAIL" : "SKIP";
    console.log(`${icon.padEnd(4)} | ${g.step.padEnd(32)} | ${g.detail}`);
  }
  const firstFail = gaps.find((g) => g.status === "fail");
  if (firstFail) {
    console.log(`\n>>> FIRST GAP: ${firstFail.step}`);
    console.log(`>>> ${firstFail.detail}`);
  } else {
    console.log("\n>>> No gaps found in covered steps.");
  }
  console.log("=============================================\n");
}

async function openFreshWorkspace(page: import("@playwright/test").Page) {
  await page.goto("/workspace?new=1", {
    waitUntil: "domcontentloaded",
    timeout: 60_000,
  });
  // Desktop + mobile composers both mount; prefer the visible desktop panel one.
  const composer = page
    .getByRole("textbox", { name: /Plan, @ for context|Describe your app idea|Ask,/i })
    .first();
  await expect(composer).toBeVisible({ timeout: 45_000 });
  return composer;
}

test.describe("Plan → Build e2e gap finder", () => {
  test.afterAll(() => {
    printGapReport();
  });

  test("API + UI plan→build path", async ({ request, page }) => {
    // ── 1. Dashboard stats (schema health) ──────────────────────────
    const stats = await request.get("/api/stats");
    if (stats.ok()) {
      const body = await stats.json();
      record(
        "1. /api/stats (dashboard)",
        "pass",
        `ok — ${body.totalProjects ?? "?"} projects`
      );
    } else {
      const body = await stats.text();
      record(
        "1. /api/stats (dashboard)",
        "fail",
        `HTTP ${stats.status()} — ${body.slice(0, 200)}`
      );
    }

    // ── 2–4. Plan API ───────────────────────────────────────────────
    const idea = "Build a simple daily todo list app";
    const res = await request.post("/api/plan", {
      data: { idea },
      timeout: 120_000,
    });

    if (!res.ok()) {
      record("2. Plan API HTTP", "fail", `HTTP ${res.status()}`);
    } else {
      record("2. Plan API HTTP", "pass", `HTTP ${res.status()}`);
    }

    const text = await res.text();
    const events = text
      .split("\n")
      .filter((l) => l.startsWith("data: "))
      .map((l) => {
        try {
          return JSON.parse(l.slice(6)) as {
            type: string;
            message?: string;
            projectId?: string;
            data?: { name?: string; files?: unknown[] };
          };
        } catch {
          return null;
        }
      })
      .filter(Boolean) as Array<{
      type: string;
      message?: string;
      projectId?: string;
      data?: { name?: string; files?: unknown[] };
    }>;

    const types = events.map((e) => e.type);
    record("3. Plan SSE stream", "pass", `events: [${types.join(", ")}]`);

    const errorEvent = events.find((e) => e.type === "error");
    const planEvent = events.find((e) => e.type === "plan");

    if (errorEvent) {
      record("4. Plan generation", "fail", errorEvent.message ?? "error event");
    } else if (!planEvent) {
      record(
        "4. Plan generation",
        "fail",
        `No plan event. Got: [${types.join(", ")}]`
      );
    } else {
      const fileCount = planEvent.data?.files?.length ?? 0;
      record(
        "4. Plan generation",
        fileCount > 0 ? "pass" : "fail",
        `project=${planEvent.projectId}, name=${planEvent.data?.name ?? "?"}, files=${fileCount}`
      );
    }

    // ── 5–6. Workspace UI ───────────────────────────────────────────
    const pageErrors: string[] = [];
    page.on("pageerror", (err) => pageErrors.push(err.message));

    const composer = await openFreshWorkspace(page);
    record("5. Workspace UI load", "pass", "composer visible");
    record(
      "5b. Client errors",
      pageErrors.length ? "fail" : "pass",
      pageErrors.length ? pageErrors.join(" | ") : "none"
    );

    await composer.fill("I want a simple daily todo list app");
    record("6. Idea input", "pass", "filled todo list idea");

    // ── 7–9. Plan from UI → confirm → build ─────────────────────────
    const planResponsePromise = page.waitForResponse(
      (r) => r.url().includes("/api/plan") && r.request().method() === "POST",
      { timeout: 120_000 }
    );

    await page.getByRole("button", { name: "Send message" }).first().click();

    let planBody = "";
    try {
      const planRes = await planResponsePromise;
      planBody = await planRes.text();
      record(
        "7. Plan request from UI",
        planRes.ok() ? "pass" : "fail",
        `HTTP ${planRes.status()}`
      );
    } catch (err) {
      record(
        "7. Plan request from UI",
        "fail",
        `No /api/plan response: ${err instanceof Error ? err.message : String(err)}`
      );
    }

    const hasPlanEvent = planBody.includes('"type":"plan"');
    const hasErrorEvent = planBody.includes('"type":"error"');

    const confirmBtn = page.getByRole("button", {
      name: /Start Building|Looks good|Build|Confirm/i,
    });
    const planHeading = page.getByText(
      /Your Project Plan|Here's what I'm planning|Got it|Daily Todo|todo list/i
    );
    const chatError = page.locator(
      "text=/OpenAI|API key|Planning failed|Database setup|not configured|column .* does not exist/i"
    );

    const outcome = await Promise.race([
      confirmBtn
        .first()
        .waitFor({ state: "visible", timeout: 90_000 })
        .then(() => "confirm" as const)
        .catch(() => null),
      planHeading
        .first()
        .waitFor({ state: "visible", timeout: 90_000 })
        .then(() => "plan_ui" as const)
        .catch(() => null),
      chatError
        .first()
        .waitFor({ state: "visible", timeout: 90_000 })
        .then(() => "error_ui" as const)
        .catch(() => null),
      page.waitForTimeout(90_000).then(() => "timeout" as const),
    ]);

    if (outcome === "confirm" || outcome === "plan_ui") {
      record(
        "8. Plan UI result",
        "pass",
        `Plan visible (${outcome}). SSE plan=${hasPlanEvent} error=${hasErrorEvent}`
      );
    } else if (outcome === "error_ui") {
      const msg = (await chatError.first().textContent())?.trim() ?? "error shown";
      record("8. Plan UI result", "fail", `UI error: ${msg}`);
    } else {
      record(
        "8. Plan UI result",
        "fail",
        `Timeout — no plan/confirm/error. SSE plan=${hasPlanEvent} error=${hasErrorEvent}. Snippet: ${planBody.slice(0, 280)}`
      );
    }

    if (outcome === "confirm") {
      await confirmBtn.first().click();
      const building = page.getByText(/Getting started|Working on|Building|EXPLORER/i);
      try {
        await building.first().waitFor({ state: "visible", timeout: 60_000 });
        // Prefer a stronger signal if explorer fills
        const fileRow = page.locator("text=/package.json|app\\/page|README/i");
        const gotFile = await fileRow
          .first()
          .waitFor({ state: "visible", timeout: 120_000 })
          .then(() => true)
          .catch(() => false);
        record(
          "9. Build start",
          gotFile ? "pass" : "fail",
          gotFile
            ? "Build produced files in explorer"
            : "Confirm clicked but no files appeared within 2m"
        );
      } catch {
        record("9. Build start", "fail", "No build status after confirm");
      }
    } else if (outcome === "plan_ui") {
      // Plan may be shown without a confirm button in Agent mode — try Build if present
      const buildBtn = page.getByRole("button", { name: /^Build$/i });
      if (await buildBtn.isVisible().catch(() => false)) {
        await buildBtn.click();
        record("9. Build start", "pass", "Clicked Build button after plan");
      } else {
        record(
          "9. Build start",
          "fail",
          "Plan visible but no Confirm/Build CTA — UX gap between plan and build"
        );
      }
    } else {
      record("9. Build start", "skip", "Blocked — plan never reached confirm/build");
    }

    // Soft asserts: report is the product; only hard-fail on critical path collapse
    expect(res.ok(), "plan API should return 200").toBeTruthy();
    expect(planEvent || errorEvent, "plan stream should emit plan or error").toBeTruthy();
  });
});
