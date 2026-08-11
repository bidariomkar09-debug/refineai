"use client";

import type {
  BuildPhase,
  ClarifyingQuestion,
  DbFile,
  ProjectClarifications,
  ProjectPlan,
  VisualPlanArtifacts,
} from "@/app/lib/agentTypes";
import type { ExplorerFile } from "@/app/lib/mergeProjectFiles";
import { getPlanIntro, getRevisionIntro, getPlanSteps, getActiveStepLabel } from "@/app/lib/planPresentation";
import { USER_MESSAGES } from "@/app/lib/userMessages";
import ClarifyingQuestions from "./ClarifyingQuestions";
import PlanCard from "./PlanCard";
import PlanDocument from "./PlanDocument";
import HumanReviewPanel from "./loop/HumanReviewPanel";
import LoopEngineeringSummary from "./loop/LoopEngineeringSummary";
import type { LoopEngineeringSnapshot } from "@/app/lib/loopEngineeringTypes";

export type PlanPhase = "idle" | "clarifying" | "ready";

type PlanViewProps = {
  plan: ProjectPlan | null;
  summaryPlan: ProjectPlan | null;
  phase: BuildPhase;
  planPhase?: PlanPhase;
  statusMessage: string;
  showConfirm: boolean;
  mergedFiles: ExplorerFile[];
  files: DbFile[];
  isLoading: boolean;
  planIntro: string | null;
  planMarkdown?: string | null;
  visualPlan?: VisualPlanArtifacts | null;
  clarifyingQuestions?: ClarifyingQuestion[];
  clarifications?: ProjectClarifications;
  onClarificationAnswer?: (questionId: string, value: string) => void;
  onClarificationsSubmit?: () => void;
  onConfirm: () => void;
  onMakeChanges: () => void;
  onDownload: () => void;
  onRunApp: () => void;
  isRunDisabled: boolean;
  isPreviewRunning: boolean;
  confirmDisabled: boolean;
  reviewAccepted: boolean;
  previewVerified: boolean;
  loopSnapshot: LoopEngineeringSnapshot;
  onAcceptAll: () => void;
  onLoopRequestChanges: () => void;
  originalPrompt: string;
  projectId: string | null;
  trainingExamplesAdded: number;
  chatMode?: "agent" | "ask" | "plan" | "debug";
};

function IntroMessage({ text, animate }: { text: string; animate?: boolean }) {
  return (
    <p
      className={`leading-relaxed text-gray-300 ${
        animate ? "motion-safe:animate-fade-in" : ""
      }`}
    >
      {text}
    </p>
  );
}

function BuildStatusBanner({ message }: { message: string }) {
  return (
    <div className="flex items-center gap-3 rounded-xl border border-accent/20 bg-accent/5 px-4 py-3 motion-safe:animate-fade-in">
      <div className="h-4 w-4 shrink-0 motion-safe:animate-spin rounded-full border-2 border-accent border-t-transparent" />
      <span className="text-sm text-gray-200">{message}</span>
    </div>
  );
}

function PlanningShimmer({ message }: { message?: string }) {
  return (
    <div className="space-y-4 motion-safe:animate-fade-in">
      <div className="h-4 w-3/4 animate-pulse rounded bg-surface-border" />
      <div className="h-32 animate-pulse rounded-xl border border-surface-border bg-surface-raised" />
      <p className="text-sm text-gray-400">{message ?? USER_MESSAGES.planning}</p>
    </div>
  );
}

export default function PlanView({
  plan,
  summaryPlan,
  phase,
  planPhase = "idle",
  statusMessage,
  showConfirm,
  mergedFiles,
  files,
  isLoading,
  planIntro,
  planMarkdown,
  visualPlan,
  clarifyingQuestions,
  clarifications = {},
  onClarificationAnswer,
  onClarificationsSubmit,
  onConfirm,
  onMakeChanges,
  onDownload,
  onRunApp,
  isRunDisabled,
  isPreviewRunning,
  confirmDisabled,
  reviewAccepted,
  previewVerified,
  loopSnapshot,
  onAcceptAll,
  onLoopRequestChanges,
  originalPrompt,
  projectId,
  trainingExamplesAdded,
  chatMode = "agent",
}: PlanViewProps) {
  const isBuilding = phase === "building" || phase === "testing";
  const displayPlan = summaryPlan ?? plan;
  const isPlanMode = chatMode === "plan";
  const showVisualPlan = Boolean(visualPlan && displayPlan);
  const showClarifying =
    isPlanMode &&
    planPhase === "clarifying" &&
    clarifyingQuestions &&
    clarifyingQuestions.length > 0 &&
    onClarificationAnswer;

  if (phase === "idle" && !plan && !isLoading && planPhase === "idle") {
    return (
      <div className="flex h-full flex-col items-center justify-center px-6 text-center">
        <div className="mb-4 rounded-full bg-surface-raised p-4">
          <svg
            className="h-8 w-8 text-gray-500"
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={1.5}
              d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"
            />
          </svg>
        </div>
        <h2 className="text-lg font-semibold text-white">Your Project Plan</h2>
        <p className="mt-2 max-w-md text-sm text-gray-400">
          {USER_MESSAGES.planningEmpty} Your plan, build progress, and summary will
          appear here.
        </p>
      </div>
    );
  }

  if (isLoading && !displayPlan && !showClarifying) {
    return (
      <div className="h-full overflow-y-auto px-6 py-6">
        <div className="mx-auto max-w-3xl">
          <PlanningShimmer message="Generating your plan..." />
        </div>
      </div>
    );
  }

  const introText =
    planIntro ??
    (displayPlan
      ? summaryPlan
        ? getRevisionIntro(displayPlan)
        : getPlanIntro(displayPlan)
      : null);

  const showPlanActions =
    isPlanMode
      ? planPhase === "ready" && phase === "awaiting_confirm"
      : showConfirm && phase === "awaiting_confirm";

  return (
    <div className="h-full overflow-y-auto px-6 py-6">
      <div className="mx-auto max-w-3xl space-y-5">
        {showClarifying && (
          <>
            {isLoading && (
              <div className="flex items-center gap-2 text-sm text-zinc-400">
                <div className="h-4 w-4 motion-safe:animate-spin rounded-full border-2 border-indigo-500 border-t-transparent" />
                Generating your plan...
              </div>
            )}
            <ClarifyingQuestions
              questions={clarifyingQuestions!}
              answers={clarifications}
              onAnswer={onClarificationAnswer!}
              onComplete={onClarificationsSubmit}
              disabled={confirmDisabled || isLoading}
              submitLabel={plan ? "Update Plan" : "Continue to Build"}
            />
          </>
        )}

        {planMarkdown && phase === "awaiting_confirm" && !isBuilding && !showVisualPlan && (
          <PlanDocument markdown={planMarkdown} />
        )}

        {!showVisualPlan && !planMarkdown && introText && planPhase !== "clarifying" && (
          <IntroMessage text={introText} animate={phase !== "complete"} />
        )}

        {displayPlan && showVisualPlan && !isBuilding && planPhase !== "clarifying" && (
          <PlanCard
            plan={displayPlan}
            visualPlan={visualPlan ?? undefined}
            variant="visual"
            showActions={showPlanActions}
            onConfirm={onConfirm}
            onMakeChanges={onMakeChanges}
            confirmDisabled={confirmDisabled}
            clarificationsComplete={planPhase === "ready"}
          />
        )}

        {displayPlan &&
          !showVisualPlan &&
          !planMarkdown &&
          planPhase !== "clarifying" &&
          (phase === "awaiting_confirm" ||
            phase === "planning" ||
            isBuilding ||
            phase === "complete") && (
            <PlanCard
              plan={displayPlan}
              liveFiles={isBuilding || phase === "complete" ? mergedFiles : undefined}
              variant={
                phase === "complete" ? "complete" : isBuilding ? "building" : "plan"
              }
              showActions={showPlanActions}
              onConfirm={onConfirm}
              onMakeChanges={onMakeChanges}
              confirmDisabled={confirmDisabled}
            />
          )}

        {displayPlan && planMarkdown && isBuilding && (
          <PlanCard
            plan={displayPlan}
            visualPlan={visualPlan ?? undefined}
            liveFiles={mergedFiles}
            variant={visualPlan ? "visual" : "building"}
            onConfirm={onConfirm}
            onMakeChanges={onMakeChanges}
            confirmDisabled={confirmDisabled}
          />
        )}

        {isBuilding && (statusMessage || displayPlan) && (
          <BuildStatusBanner
            message={
              statusMessage ||
              (displayPlan
                ? getActiveStepLabel(getPlanSteps(displayPlan), mergedFiles)
                : null) ||
              USER_MESSAGES.building
            }
          />
        )}

        {phase === "complete" && displayPlan && !reviewAccepted && (
          <HumanReviewPanel
            plan={displayPlan}
            files={files}
            previewVerified={previewVerified}
            onAcceptAll={onAcceptAll}
            onRequestChanges={onLoopRequestChanges}
          />
        )}

        {phase === "complete" && displayPlan && reviewAccepted && (
          <LoopEngineeringSummary
            snapshot={loopSnapshot}
            onRunApp={onRunApp}
            onDownload={onDownload}
            isRunDisabled={isRunDisabled}
            isPreviewRunning={isPreviewRunning}
            setupInstructions={
              displayPlan.setupInstructions ??
              "Click Run App below to preview your project live."
            }
            deployInstructions={
              displayPlan.deployInstructions ??
              "Push to GitHub and import on Vercel. Add your environment variables in the Vercel dashboard."
            }
            originalPrompt={originalPrompt}
            projectName={displayPlan.name}
            projectId={projectId ?? ""}
            files={files}
            previewVerified={previewVerified}
            trainingExamplesAdded={trainingExamplesAdded}
          />
        )}
      </div>
    </div>
  );
}
