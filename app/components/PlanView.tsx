"use client";

import { useState } from "react";
import type { BuildPhase, DbFile, ProjectPlan } from "@/app/lib/agentTypes";
import { meetsQualityThreshold } from "@/app/lib/agentTypes";
import type { ExplorerFile } from "@/app/lib/mergeProjectFiles";
import { getPlanIntro, getRevisionIntro, getPlanSteps, getActiveStepLabel } from "@/app/lib/planPresentation";
import { completionMessage, USER_MESSAGES } from "@/app/lib/userMessages";
import PlanCard from "./PlanCard";
import PlanDocument from "./PlanDocument";

type PlanViewProps = {
  plan: ProjectPlan | null;
  summaryPlan: ProjectPlan | null;
  phase: BuildPhase;
  statusMessage: string;
  showConfirm: boolean;
  mergedFiles: ExplorerFile[];
  files: DbFile[];
  isLoading: boolean;
  planIntro: string | null;
  planMarkdown?: string | null;
  onConfirm: () => void;
  onMakeChanges: () => void;
  onDownload: () => void;
  onRunApp: () => void;
  isRunDisabled: boolean;
  isPreviewRunning: boolean;
  confirmDisabled: boolean;
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

function PlanningShimmer() {
  return (
    <div className="space-y-4 motion-safe:animate-fade-in">
      <div className="h-4 w-3/4 animate-pulse rounded bg-surface-border" />
      <div className="h-32 animate-pulse rounded-xl border border-surface-border bg-surface-raised" />
      <p className="text-sm text-gray-400">{USER_MESSAGES.planning}</p>
    </div>
  );
}

export default function PlanView({
  plan,
  summaryPlan,
  phase,
  statusMessage,
  showConfirm,
  mergedFiles,
  files,
  isLoading,
  planIntro,
  planMarkdown,
  onConfirm,
  onMakeChanges,
  onDownload,
  onRunApp,
  isRunDisabled,
  isPreviewRunning,
  confirmDisabled,
}: PlanViewProps) {
  const [showDetails, setShowDetails] = useState(false);
  const isBuilding = phase === "building" || phase === "testing";
  const displayPlan = summaryPlan ?? plan;

  if (phase === "idle" && !plan && !isLoading) {
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

  if (phase === "planning" && isLoading && !displayPlan) {
    return (
      <div className="h-full overflow-y-auto px-6 py-6">
        <div className="mx-auto max-w-3xl">
          <PlanningShimmer />
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

  const doneFiles = files.filter((f) => f.status === "done");
  const avgScore =
    doneFiles.length > 0
      ? Math.round(
          doneFiles.reduce((sum, f) => sum + f.score, 0) / doneFiles.length
        )
      : 0;

  return (
    <div className="h-full overflow-y-auto px-6 py-6">
      <div className="mx-auto max-w-3xl space-y-5">
        {planMarkdown && phase === "awaiting_confirm" && !isBuilding && (
          <PlanDocument markdown={planMarkdown} />
        )}

        {!planMarkdown && introText && (
          <IntroMessage text={introText} animate={phase !== "complete"} />
        )}

        {displayPlan &&
          !planMarkdown &&
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
              showActions={showConfirm && !!plan && phase === "awaiting_confirm"}
              onConfirm={onConfirm}
              onMakeChanges={onMakeChanges}
              confirmDisabled={confirmDisabled}
            />
          )}

        {displayPlan && planMarkdown && isBuilding && (
          <PlanCard
            plan={displayPlan}
            liveFiles={mergedFiles}
            variant="building"
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

        {phase === "complete" && displayPlan && (
          <div className="space-y-4 rounded-xl border border-accent-green/30 bg-accent-green/5 p-5 motion-safe:animate-fade-in">
            <p className="text-sm leading-relaxed text-gray-200">
              {completionMessage(displayPlan.name, doneFiles.length, avgScore)}
            </p>

            <p className="text-sm text-gray-400">
              {displayPlan.setupInstructions ??
                "Click Run App below to preview your project live."}
            </p>

            <button
              type="button"
              onClick={onRunApp}
              disabled={isRunDisabled || isPreviewRunning}
              className="w-full rounded-xl bg-accent-green py-3 text-sm font-semibold text-white transition hover:bg-green-600 disabled:cursor-not-allowed disabled:opacity-50"
            >
              {isPreviewRunning ? "Starting app..." : "Run App"}
            </button>

            <button
              type="button"
              onClick={() => setShowDetails((v) => !v)}
              className="text-xs text-gray-500 underline-offset-2 hover:text-gray-300 hover:underline"
            >
              {showDetails ? "Hide details" : "View details"}
            </button>

            {showDetails && doneFiles.length > 0 && (
              <ul className="max-h-48 space-y-1 overflow-y-auto rounded-lg bg-black/20 p-2">
                {doneFiles.map((file) => (
                  <li
                    key={file.id}
                    className="flex items-center justify-between gap-2 text-xs"
                  >
                    <span className="min-w-0 truncate font-mono text-gray-400">
                      {file.file_path}
                    </span>
                    <span
                      className={`shrink-0 font-semibold tabular-nums ${
                        meetsQualityThreshold(file.score)
                          ? "text-accent-green"
                          : "text-amber-400"
                      }`}
                    >
                      {file.score}%
                    </span>
                  </li>
                ))}
              </ul>
            )}

            <button
              type="button"
              onClick={onDownload}
              className="w-full rounded-xl border border-accent-green/40 bg-accent-green/10 py-2.5 text-sm font-medium text-accent-green transition hover:bg-accent-green/20"
            >
              Download All Files
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
