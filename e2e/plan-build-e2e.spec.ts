import { test, expect, type Page, type APIRequestContext } from "@playwright/test";

/**
 * End-to-end: Plan mode → Build once → files created → orchestrator starts.
 *
 * Local:
 *   npx playwright test e2e/plan-build-e2e.spec.ts
 *
 * Production:
 *   PLAYWRIGHT_BASE_URL=https://refineai-three.vercel.app npx playwright test e2e/plan-build-e2e.spec.ts
 */

type GapStatus = "pass" | "fail" | "skip";

type Gap = {
  step: string;
  status: GapStatus;
  detail: string;
};

const gaps: Gap[] = [];

function record(step: string, status: GapStatus, detail: string) {
  gaps.push({ step, status, detail });
  const icon = status === "pass" ? "✓" : status === "fail" ? "✗" : "–";
  console.log(`[${icon}] ${step}: ${detail}`);
}

function printGapReport() {
  console.log("\n========== PLAN → BUILD E2E GAP REPORT ==========");
  for (const g of gaps) {
    const label = g.status === "pass" ? "PASS" : g.status === "fail" ? "FAIL" : "SKIP";
    console.log(`${label.padEnd(4)} | ${g.step.padEnd(36)} | ${g.detail}`);
  }
  const failures = gaps.filter((g) => g.status === "fail");
  if (failures.length > 0) {
    console.log(`\n>>> ${failures.length} GAP(S) FOUND:`);
    for (const f of failures) {
      console.log(`    • ${f.step}: ${f.detail}`);
    }
  } else {
    console.log("\n>>> No gaps in covered steps.");
  }
  console.log("==================================================\n");
}

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

  await modeBtn.click();

  const menu = page.getByRole("listbox", { name: "Chat mode" });
  const menuOpen = await menu
    .waitFor({ state: "visible", timeout: 5_000 })
    .then(() => true)
    .catch(() => false);

  if (menuOpen) {
    await menu.getByRole("option", { name: "Plan", exact: true }).click();
  } else {
    // Fallback: keyboard shortcut cycles agent → plan
    const mod = process.platform === "darwin" ? "Meta" : "Control";
    await page.keyboard.press(`${mod}+Shift+M`);
  }

  const planModeActive = await page
    .locator('button[aria-haspopup="listbox"]')
    .filter({ hasText: /^Plan$/ })
    .first()
    .waitFor({ state: "visible", timeout: 8_000 })
    .then(() => true)
    .catch(() => false);

  return planModeActive;
}

type NetworkTracker = {
  approveCalls: number;
  confirmCalls: number;
  buildFileCalls: number;
  approveStatuses: number[];
  confirmStatuses: number[];
  buildFileStatuses: number[];
  projectId: string | null;
};

function attachNetworkTracker(page: Page): NetworkTracker {
  const tracker: NetworkTracker = {
    approveCalls: 0,
    confirmCalls: 0,
    buildFileCalls: 0,
    approveStatuses: [],
    confirmStatuses: [],
    buildFileStatuses: [],
    projectId: null,
  };

  page.on("request", (request) => {
    const url = request.url();
    if (!url.includes("/api/projects") || request.method() !== "POST") return;
    const body = request.postData() ?? "";
    if (body.includes('"action":"confirm"')) {
      tracker.confirmCalls += 1;
    }
  });

  page.on("response", async (response) => {
    const url = response.url();
    const method = response.request().method();
    const status = response.status();

    if (url.includes("/api/modes/plan/approve") && method === "POST") {
      tracker.approveCalls += 1;
      tracker.approveStatuses.push(status);
    }
    if (url.includes("/api/projects") && method === "POST") {
      try {
        const body = response.request().postData() ?? "";
        if (body.includes('"action":"confirm"')) {
          tracker.confirmStatuses.push(status);
        }
      } catch {
        // ignore
      }
    }
    if (url.includes("/api/build/file") && method === "POST") {
      tracker.buildFileCalls += 1;
      tracker.buildFileStatuses.push(status);
    }
    if (url.includes("/api/projects?id=") && method === "GET") {
      const match = url.match(/id=([^&]+)/);
      if (match) tracker.projectId = decodeURIComponent(match[1]);
    }
  });

  return tracker;
}

async function fetchProjectFiles(
  request: APIRequestContext,
  projectId: string
): Promise<{ count: number; statuses: string[] }> {
  const res = await request.get(`/api/projects?id=${encodeURIComponent(projectId)}`);
  if (!res.ok()) return { count: 0, statuses: [] };
  const data = (await res.json()) as {
    files?: Array<{ file_path: string; status: string }>;
  };
  const codeFiles = (data.files ?? []).filter(
    (f) => !f.file_path.toLowerCase().endsWith("plan.md")
  );
  return {
    count: codeFiles.length,
    statuses: codeFiles.map((f) => f.status),
  };
}

test.describe("Plan mode → Build e2e", () => {
  test.setTimeout(360_000);

  test.afterAll(() => {
    printGapReport();
  });

  test("plan → approve → confirm → build/file → progress UI", async ({
    page,
    request,
  }) => {
    const pageErrors: string[] = [];
    const consoleErrors: string[] = [];
    page.on("pageerror", (err) => pageErrors.push(err.message));
    page.on("console", (msg) => {
      if (msg.type() === "error") {
        consoleErrors.push(msg.text());
      }
    });

    const tracker = attachNetworkTracker(page);

    // ── 1. Workspace loads ──────────────────────────────────────────
    const composer = await openFreshWorkspace(page);
    record("1. Workspace load", "pass", "composer visible");
    record(
      "1b. Client errors on load",
      pageErrors.length ? "fail" : "pass",
      pageErrors.length ? pageErrors.join(" | ") : "none"
    );

    // ── 2. Plan mode ────────────────────────────────────────────────
    const inPlanMode = await switchToPlanMode(page);
    record(
      "2. Plan mode",
      inPlanMode ? "pass" : "fail",
      inPlanMode ? "switched to Plan mode" : "could not switch to Plan mode"
    );
    if (!inPlanMode) {
      record("3–15. Build flow", "skip", "Blocked — Plan mode unavailable");
      expect(inPlanMode, "should switch to Plan mode").toBeTruthy();
      return;
    }

    const idea = "Build a minimal todo list with add and delete only";
    await composer.fill(idea);
    record("3. Idea submitted", "pass", idea.slice(0, 60));

    const planResponsePromise = page.waitForResponse(
      (r) => r.url().includes("/api/modes/plan") && r.request().method() === "POST",
      { timeout: 180_000 }
    );

    await page.getByRole("button", { name: "Send message" }).first().click();

    let planBody = "";
    let planOk = false;
    try {
      const planRes = await planResponsePromise;
      planOk = planRes.ok();
      planBody = await planRes.text();
      record(
        "4. Plan API",
        planOk ? "pass" : "fail",
        `HTTP ${planRes.status()}`
      );
    } catch (err) {
      record(
        "4. Plan API",
        "fail",
        err instanceof Error ? err.message : String(err)
      );
    }

    const planReady = planBody.includes('"type":"plan_ready"');
    const planError = planBody.includes('"type":"error"');
    if (planError) {
      const errMatch = planBody.match(/"message":"([^"]+)"/);
      record(
        "5. Plan generation",
        "fail",
        errMatch?.[1] ?? "plan stream returned error"
      );
    } else if (planReady) {
      record("5. Plan generation", "pass", "plan_ready event received");
    } else {
      record(
        "5. Plan generation",
        "fail",
        `No plan_ready in stream. Snippet: ${planBody.slice(0, 240)}`
      );
    }

    // ── 6. Plan UI + Build CTA ──────────────────────────────────────
    const buildBtn = page.getByRole("button", { name: /^Build$/i });
    const planCard = page.getByText(/PLAN|files ·|complete/i);

    const uiOutcome = await Promise.race([
      buildBtn
        .first()
        .waitFor({ state: "visible", timeout: 120_000 })
        .then(() => "build_btn" as const)
        .catch(() => null),
      planCard
        .first()
        .waitFor({ state: "visible", timeout: 120_000 })
        .then(() => "plan_card" as const)
        .catch(() => null),
      page
        .locator("text=/OpenAI|API key|not configured|Planning failed/i")
        .first()
        .waitFor({ state: "visible", timeout: 120_000 })
        .then(() => "error" as const)
        .catch(() => null),
      page.waitForTimeout(120_000).then(() => "timeout" as const),
    ]);

    if (uiOutcome === "build_btn") {
      record("6. Plan UI + Build CTA", "pass", "Build button visible");
    } else if (uiOutcome === "plan_card") {
      record("6. Plan UI + Build CTA", "fail", "Plan visible but Build button missing");
    } else if (uiOutcome === "error") {
      const msg =
        (await page
          .locator("text=/OpenAI|API key|not configured|Planning failed/i")
          .first()
          .textContent()) ?? "error";
      record("6. Plan UI + Build CTA", "fail", msg.trim());
    } else {
      record("6. Plan UI + Build CTA", "fail", "Timeout waiting for plan UI");
    }

    if (uiOutcome !== "build_btn") {
      record("7–12. Build flow", "skip", "Blocked — no Build button");
      expect(planOk || planError, "plan API should respond").toBeTruthy();
      return;
    }

    // ── 7. Click Build once ─────────────────────────────────────────
    await buildBtn.first().click();
    record("7. Build clicked", "pass", "single click");

    // Build button should hide during build
    const buildHidden = await buildBtn
      .first()
      .waitFor({ state: "hidden", timeout: 15_000 })
      .then(() => true)
      .catch(() => false);
    record(
      "8. Build CTA hidden during build",
      buildHidden ? "pass" : "fail",
      buildHidden
        ? "Build button hidden after click"
        : "Build button still visible — duplicate-build UX gap"
    );

    // ── 9. Approve API ──────────────────────────────────────────────
    const approveStatus = await page
      .waitForResponse(
        (r) =>
          r.url().includes("/api/modes/plan/approve") &&
          r.request().method() === "POST",
        { timeout: 60_000 }
      )
      .then((r) => r.status())
      .catch(() => null);

    record(
      "9. Approve API called",
      tracker.approveCalls >= 1 ? "pass" : "fail",
      `calls=${tracker.approveCalls}, statuses=[${tracker.approveStatuses.join(", ")}]`
    );
    record(
      "9b. Approve API success",
      tracker.approveStatuses.every((s) => s >= 200 && s < 300) && tracker.approveCalls >= 1
        ? "pass"
        : tracker.approveCalls === 0
          ? "skip"
          : "fail",
      approveStatus !== null
        ? `HTTP ${approveStatus}`
        : tracker.approveStatuses.length
          ? `HTTP ${tracker.approveStatuses.join(", ")}`
          : "no approve call"
    );

    // ── 10. Confirm API (once) ──────────────────────────────────────
    const confirmStatus = await page
      .waitForResponse(
        (r) =>
          r.url().includes("/api/projects") &&
          r.request().method() === "POST" &&
          (r.request().postData() ?? "").includes('"action":"confirm"'),
        { timeout: 60_000 }
      )
      .then((r) => r.status())
      .catch(() => null);

    record(
      "10. Confirm API called once",
      tracker.confirmCalls === 1 && confirmStatus !== null ? "pass" : "fail",
      `calls=${tracker.confirmCalls}, statuses=[${tracker.confirmStatuses.join(", ")}]`
    );

    // ── 11. DB files exist ──────────────────────────────────────────
    let fileInfo = { count: 0, statuses: [] as string[] };
    if (tracker.projectId) {
      await page.waitForTimeout(1_500);
      fileInfo = await fetchProjectFiles(request, tracker.projectId);
    }
    record(
      "11. DB code files created",
      fileInfo.count > 0 ? "pass" : "fail",
      tracker.projectId
        ? `project=${tracker.projectId}, codeFiles=${fileInfo.count}, statuses=[${fileInfo.statuses.slice(0, 5).join(", ")}${fileInfo.statuses.length > 5 ? "…" : ""}]`
        : "projectId not captured from network"
    );

    // ── 12. Orchestrator starts (/api/build/file) ───────────────────
    const buildFileStarted = await page
      .waitForResponse(
        (r) => r.url().includes("/api/build/file") && r.request().method() === "POST",
        { timeout: 90_000 }
      )
      .then((r) => r.status())
      .catch(() => null);

    record(
      "12. Build orchestrator started",
      buildFileStarted !== null && buildFileStarted < 500 ? "pass" : "fail",
      buildFileStarted !== null
        ? `HTTP ${buildFileStarted}, total build/file calls=${tracker.buildFileCalls}`
        : "No /api/build/file within 90s — build stalls at Starting build"
    );

    // ── 13. File progress in UI ─────────────────────────────────────
    const progressSignal = page.getByText(
      /Building|Working on|Getting started|R\d|\/\d+ complete|Pause|Skip File/i
    );
    const explorerBuilding = page.locator(
      '[data-testid="file-explorer"] >> text=/building|done/i'
    );
    const gotProgress = await Promise.race([
      progressSignal
        .first()
        .waitFor({ state: "visible", timeout: 180_000 })
        .then(() => "text" as const),
      page
        .getByRole("button", { name: /^Pause$/i })
        .waitFor({ state: "visible", timeout: 180_000 })
        .then(() => "pause" as const),
      explorerBuilding
        .first()
        .waitFor({ state: "visible", timeout: 180_000 })
        .then(() => "explorer" as const)
        .catch(() => null),
    ]).catch(() => null);

    record(
      "13. Build progress in UI",
      gotProgress ? "pass" : "fail",
      gotProgress
        ? `progress via ${gotProgress}`
        : "No building progress within 3m — UI stuck after build start"
    );

    // ── 14. Pause control (building phase) ──────────────────────────
    const pauseBtn = page.getByRole("button", { name: /^Pause$/i });
    const pauseVisible = await pauseBtn.isVisible().catch(() => false);
    record(
      "14. Building phase controls",
      pauseVisible ? "pass" : "fail",
      pauseVisible ? "Pause button visible" : "Not in building phase in UI"
    );

    // ── 15. Confirm not duplicated ──────────────────────────────────
    record(
      "15. Confirm not duplicated",
      tracker.confirmCalls === 1 ? "pass" : "fail",
      `confirm API calls=${tracker.confirmCalls}${tracker.confirmCalls > 1 ? " — double-confirm gap" : ""}`
    );

    // ── 16. Workspace did not crash ─────────────────────────────────
    const crashed = await page
      .getByText("Something went wrong")
      .isVisible()
      .catch(() => false);
    record(
      "16. Workspace stability",
      crashed ? "fail" : "pass",
      crashed
        ? `Error boundary shown — client crash during build. pageErrors: ${pageErrors.slice(0, 2).join(" | ") || "none"}; console: ${consoleErrors.slice(-3).join(" | ") || "none"}`
        : pageErrors.length
          ? `no crash UI but errors: ${pageErrors.join(" | ")}`
          : "workspace stayed up"
    );

    // Fail the test if any gap was recorded (report is the deliverable)
    const failures = gaps.filter((g) => g.status === "fail");
    expect(
      failures,
      `Plan→Build gaps:\n${failures.map((f) => `- ${f.step}: ${f.detail}`).join("\n")}`
    ).toEqual([]);
  });
});
