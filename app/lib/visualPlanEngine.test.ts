import test from "node:test";
import assert from "node:assert/strict";
import {
  areClarificationsComplete,
  formatClarificationsForPrompt,
  generateBuildPreview,
  generateClarifyingQuestions,
  generateFlowchart,
} from "./visualPlanEngine";
import type { ProjectPlan } from "./agentTypes";

const samplePlan: ProjectPlan = {
  name: "Todo App",
  description: "A simple todo list",
  niche: "general",
  techStack: {
    frontend: "Next.js",
    backend: "API Routes",
    database: "Supabase",
    ai: "OpenAI",
    styling: "Tailwind CSS",
    deploy: "Vercel",
  },
  files: [
    { path: "app/page.tsx", name: "page", purpose: "Main dashboard", isApiRoute: false },
    { path: "app/api/todos/route.ts", name: "todos", purpose: "Todo API", isApiRoute: true },
  ],
  apiRoutes: ["/api/todos"],
  estimatedFiles: 2,
  steps: [
    { id: "1", label: "Dashboard with task list", relatedPaths: ["app/page.tsx"] },
    { id: "2", label: "API routes for todos", relatedPaths: ["app/api/todos/route.ts"] },
  ],
};

test("generateClarifyingQuestions returns 5 questions with options", () => {
  const questions = generateClarifyingQuestions("Build a personal AI assistant");
  assert.equal(questions.length, 5);
  for (const q of questions) {
    assert.ok(q.id);
    assert.ok(q.question);
    assert.ok(q.options.length >= 2);
    assert.ok(q.default);
  }
});

test("generateFlowchart includes Frontend, API, and Database layers", () => {
  const clarifications = {
    ui_style: "Dark theme",
    data_persistence: "Saves all data",
    ai_model: "GPT-4o",
    device_focus: "Both desktop and mobile",
    key_features: "Chat with AI",
  };
  const chart = generateFlowchart(samplePlan, clarifications);
  assert.match(chart, /Frontend/i);
  assert.match(chart, /API/i);
  assert.match(chart, /DB|Database/i);
});

test("formatClarificationsForPrompt includes all keys", () => {
  const clarifications = {
    ui_style: "Dark theme",
    data_persistence: "Saves all data",
    ai_model: "GPT-4o",
    device_focus: "Mobile first",
    key_features: "Task lists",
  };
  const block = formatClarificationsForPrompt(clarifications);
  assert.match(block, /UI Style/);
  assert.match(block, /Data Persistence/);
  assert.match(block, /Primary AI Model/);
  assert.match(block, /Device Focus/);
  assert.match(block, /Key Features/);
});

test("generateBuildPreview returns headline and outcome bullets", () => {
  const clarifications = {
    ui_style: "Dark theme",
    data_persistence: "Saves all data",
    ai_model: "GPT-4o",
    device_focus: "Both desktop and mobile",
    key_features: "Task lists",
  };
  const preview = generateBuildPreview(samplePlan, clarifications, "Build a todo app");
  assert.ok(preview.headline);
  assert.ok(preview.outcomeBullets.length >= 3);
  assert.ok(preview.deliverables.length >= 2);
  assert.ok(preview.buildSteps.length >= 3);
});

test("areClarificationsComplete requires all question ids", () => {
  const questions = generateClarifyingQuestions("Build a todo app");
  const partial = { ui_style: "Dark theme" };
  assert.equal(areClarificationsComplete(questions, partial), false);
  const full = Object.fromEntries(questions.map((q) => [q.id, q.default]));
  assert.equal(areClarificationsComplete(questions, full), true);
});
