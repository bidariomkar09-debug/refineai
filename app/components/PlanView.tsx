"use client";

import type {
  BuildPhase,
  DbFile,
  FileRoundEvent,
  ProjectPlan,
} from "@/app/lib/agentTypes";
import type { ExplorerFile } from "@/app/lib/mergeProjectFiles";
import { USER_MESSAGES } from "@/app/lib/userMessages";
import PlanCard from "./PlanCard";
import ConfirmButtons from "./ConfirmButtons";
import BuildChecklist from "./BuildChecklist";
import SummaryCard from "./SummaryCard";

type PlanViewProps = {
  plan: ProjectPlan | null;
  summaryPlan: ProjectPlan | null;
  phase: BuildPhase;
  statusMessage: string;
  showConfirm: boolean;
  mergedFiles: ExplorerFile[];
  activeFileId: string | null;
  files: DbFile[];
  isLoading: boolean;
  onConfirm: () => void;
  onMakeChanges: () => void;
  onDownload: () => void;
  onRunApp: () => void;
  isRunDisabled: boolean;
  isPreviewRunning: boolean;
  confirmDisabled: boolean;
};

export default function PlanView({
  plan,
  summaryPlan,
  phase,
  statusMessage,
  showConfirm,
  mergedFiles,
  activeFileId,
  files,
  isLoading,
  onConfirm,
  onMakeChanges,
  onDownload,
  onRunApp,
  isRunDisabled,
  isPreviewRunning,
  confirmDisabled,
}: PlanViewProps) {
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
        <h2 className="text-lg font-semibold text-white">Project Plan</h2>
        <p className="mt-2 max-w-md text-sm text-gray-400">
          Describe your app idea in the chat panel on the right. Your plan,
          build progress, and summary will appear here.
        </p>
        <p className="mt-3 text-xs text-gray-600">{USER_MESSAGES.qualityTarget}</p>
      </div>
    );
  }

  return (
    <div className="h-full overflow-y-auto px-6 py-6">
      <div className="mx-auto max-w-3xl space-y-4">
        {displayPlan && (phase === "awaiting_confirm" || phase === "planning" || isBuilding || phase === "complete") && (
          <PlanCard
            plan={displayPlan}
            liveFiles={isBuilding || phase === "complete" ? mergedFiles : undefined}
          />
        )}

        {showConfirm && plan && (
          <div className="rounded-xl border border-surface-border bg-surface-raised/50 p-4">
            <p className="mb-3 text-sm text-gray-300">Ready when you are.</p>
            <ConfirmButtons
              onConfirm={onConfirm}
              onChanges={onMakeChanges}
              disabled={confirmDisabled}
            />
          </div>
        )}

        {isBuilding && mergedFiles.length > 0 && (
          <BuildChecklist files={mergedFiles} activeFileId={activeFileId} />
        )}

        {isBuilding && statusMessage && (
          <div className="flex items-center gap-3 rounded-xl border border-surface-border bg-surface-raised/50 p-3">
            <div className="h-4 w-4 motion-safe:animate-spin rounded-full border-2 border-accent border-t-transparent" />
            <span className="text-xs text-gray-400">{statusMessage}</span>
          </div>
        )}

        {phase === "complete" && displayPlan && (
          <SummaryCard
            plan={displayPlan}
            files={files}
            onDownload={onDownload}
            onRunApp={onRunApp}
            isRunning={isPreviewRunning}
            runDisabled={isRunDisabled}
          />
        )}
      </div>
    </div>
  );
}
