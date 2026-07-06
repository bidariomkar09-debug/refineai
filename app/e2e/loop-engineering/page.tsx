"use client";

import { useMemo, useState } from "react";
import type { BuildPhase, FileRoundEvent, ProjectPlan } from "@/app/lib/agentTypes";
import type { ChatMode } from "@/app/lib/agentTypes";
import type { LoopIteration } from "@/app/lib/loopEngineeringTypes";
import {
  deriveLoopEngineeringState,
  recordLoopIterationFromRound,
} from "@/app/lib/loopEngineeringState";
import LoopEngineeringPanel from "@/app/components/loop/LoopEngineeringPanel";
import HumanReviewPanel from "@/app/components/loop/HumanReviewPanel";
import LoopEngineeringSummary from "@/app/components/loop/LoopEngineeringSummary";

const MOCK_PLAN: ProjectPlan = {
  name: "E2E Loop Harness",
  description: "Test plan",
  niche: "testing",
  techStack: {
    frontend: "react",
    backend: "none",
    database: "none",
    ai: "openai",
    styling: "tailwind",
    deploy: "vercel",
  },
  files: [],
  apiRoutes: [],
  estimatedFiles: 1,
  setupInstructions: "Harness only",
};

const MOCK_ROUND = (
  overrides: Partial<FileRoundEvent> & Pick<FileRoundEvent, "task" | "score">
): FileRoundEvent => ({
  round: 1,
  scoreBefore: 0,
  scoreImprovement: 0,
  improvement: "",
  inputContext: "",
  modelUsed: "gpt-4o",
  tokensUsed: 0,
  temperature: 0.2,
  output: "",
  ...overrides,
});

export default function LoopEngineeringHarnessPage() {
  const [phase, setPhase] = useState<BuildPhase>("idle");
  const [chatMode, setChatMode] = useState<ChatMode>("agent");
  const [isComposerActive, setIsComposerActive] = useState(false);
  const [currentRound, setCurrentRound] = useState<FileRoundEvent | null>(null);
  const [loopIterations, setLoopIterations] = useState<LoopIteration[]>([]);
  const [goalMetFlash, setGoalMetFlash] = useState(false);
  const [reviewAccepted, setReviewAccepted] = useState(false);
  const [buildStartedAt] = useState(() => Date.now() - 45_000);
  const [buildEndedAt, setBuildEndedAt] = useState<number | null>(null);

  const snapshot = useMemo(
    () =>
      deriveLoopEngineeringState({
        phase,
        chatMode,
        isComposerActive,
        currentRound,
        loopIterations,
        buildStartedAt,
        buildEndedAt,
        goalMetFlash,
        reviewAccepted,
        avgScore: 96,
      }),
    [
      phase,
      chatMode,
      isComposerActive,
      currentRound,
      loopIterations,
      buildStartedAt,
      buildEndedAt,
      goalMetFlash,
      reviewAccepted,
    ]
  );

  const simulateReview = (score: number) => {
    const round = MOCK_ROUND({
      round: loopIterations.length + 1,
      task: "review",
      score,
      scoreBefore: score === 96 ? 82 : 70,
      scoreImprovement: score === 96 ? 14 : 8,
      improvement: score >= 95 ? "Quality threshold met" : "Needs refinement",
    });
    setPhase("building");
    setCurrentRound(round);
    const { iterations, goalMetFlash: flash } = recordLoopIterationFromRound(
      loopIterations,
      "src/App.js",
      round
    );
    setLoopIterations(iterations);
    if (flash) {
      setGoalMetFlash(true);
      window.setTimeout(() => setGoalMetFlash(false), 2500);
    }
  };

  return (
    <div data-testid="loop-harness-root" className="min-h-screen bg-[#0d0d0d] p-4 text-white">
      <h1 className="mb-4 text-lg font-semibold">Loop Engineering Harness</h1>

      <div className="mb-4 flex flex-wrap gap-2">
        <button
          type="button"
          data-testid="harness-mode-agent"
          onClick={() => setChatMode("agent")}
          className="rounded bg-indigo-600 px-3 py-1 text-xs"
        >
          Agent mode
        </button>
        <button
          type="button"
          data-testid="harness-mode-ask"
          onClick={() => setChatMode("ask")}
          className="rounded bg-gray-700 px-3 py-1 text-xs"
        >
          Ask mode
        </button>
        <button
          type="button"
          data-testid="harness-step1"
          onClick={() => {
            setPhase("idle");
            setIsComposerActive(true);
            setCurrentRound(null);
          }}
          className="rounded bg-gray-700 px-3 py-1 text-xs"
        >
          Step 1
        </button>
        <button
          type="button"
          data-testid="harness-step3"
          onClick={() => {
            setPhase("building");
            setCurrentRound(
              MOCK_ROUND({
                round: 1,
                task: "write",
                score: 40,
                scoreBefore: 0,
                scoreImprovement: 40,
                improvement: "Initial write",
              })
            );
          }}
          className="rounded bg-gray-700 px-3 py-1 text-xs"
        >
          Step 3
        </button>
        <button
          type="button"
          data-testid="harness-review-fail"
          onClick={() => simulateReview(82)}
          className="rounded bg-amber-700 px-3 py-1 text-xs"
        >
          Review fail
        </button>
        <button
          type="button"
          data-testid="harness-review-pass"
          onClick={() => simulateReview(96)}
          className="rounded bg-green-700 px-3 py-1 text-xs"
        >
          Review pass
        </button>
        <button
          type="button"
          data-testid="harness-complete"
          onClick={() => {
            setPhase("complete");
            setBuildEndedAt(Date.now());
          }}
          className="rounded bg-gray-700 px-3 py-1 text-xs"
        >
          Complete
        </button>
      </div>

      <div className="max-w-3xl rounded-xl border border-surface-border bg-surface">
        <LoopEngineeringPanel snapshot={snapshot} goalMetScore={96} />

        {phase === "complete" && !reviewAccepted && (
          <div className="p-4">
            <HumanReviewPanel
              plan={MOCK_PLAN}
              files={[
                {
                  id: "1",
                  project_id: "p",
                  file_path: "src/App.js",
                  file_name: "App.js",
                  content: "",
                  status: "done",
                  score: 96,
                  rounds_taken: 2,
                  sort_order: 0,
                  created_at: "",
                },
              ]}
              onAcceptAll={() => setReviewAccepted(true)}
              onRequestChanges={() => {
                setReviewAccepted(false);
                setPhase("idle");
                setLoopIterations([]);
              }}
            />
          </div>
        )}

        {phase === "complete" && reviewAccepted && (
          <div className="p-4">
            <LoopEngineeringSummary
              snapshot={snapshot}
              onRunApp={() => {}}
              onDownload={() => {}}
              isRunDisabled={false}
              isPreviewRunning={false}
              originalPrompt="Build a test app"
              projectName="Test App"
              projectId="test-project"
              files={[]}
              previewVerified={false}
              trainingExamplesAdded={12}
            />
          </div>
        )}
      </div>

      <p className="mt-4 text-xs text-gray-500" data-testid="harness-active-step">
        Active step: {snapshot.activeStep}
      </p>
    </div>
  );
}
