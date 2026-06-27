"use client";

import { useEffect, useRef } from "react";
import type {
  BuildPhase,
  ChatMessage,
  DbFile,
  FileRoundEvent,
  ProjectPlan,
} from "@/app/lib/agentTypes";
import type { ExplorerFile } from "@/app/lib/mergeProjectFiles";
import MessageBubble from "./MessageBubble";
import PlanCard from "./PlanCard";
import ConfirmButtons from "./ConfirmButtons";
import ProgressCard from "./ProgressCard";
import SummaryCard from "./SummaryCard";
import BuildChecklist from "./BuildChecklist";
import { USER_MESSAGES } from "@/app/lib/userMessages";

type ChatAreaProps = {
  messages: ChatMessage[];
  plan: ProjectPlan | null;
  phase: BuildPhase;
  statusMessage: string;
  showConfirm: boolean;
  activeProgress: { fileName: string; round: FileRoundEvent | null } | null;
  summaryPlan: ProjectPlan | null;
  files: DbFile[];
  mergedFiles: ExplorerFile[];
  activeFileId: string | null;
  onConfirm: () => void;
  onMakeChanges: () => void;
  onDownload: () => void;
  onRunApp: () => void;
  isRunDisabled: boolean;
  isPreviewRunning: boolean;
  confirmDisabled: boolean;
  isLoading: boolean;
};

export default function ChatArea({
  messages,
  plan,
  phase,
  statusMessage,
  showConfirm,
  activeProgress,
  summaryPlan,
  files,
  mergedFiles,
  activeFileId,
  onConfirm,
  onMakeChanges,
  onDownload,
  onRunApp,
  isRunDisabled,
  isPreviewRunning,
  confirmDisabled,
  isLoading,
}: ChatAreaProps) {
  const bottomRef = useRef<HTMLDivElement>(null);
  const isBuilding = phase === "building" || phase === "testing";
  const displayPlan = summaryPlan ?? plan;

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages.length, statusMessage, activeProgress, phase, mergedFiles]);

  return (
    <div className="flex flex-1 flex-col overflow-hidden">
      <div className="flex-1 overflow-y-auto px-4 py-4 sm:px-6">
        {messages.length === 0 && phase === "idle" && !isLoading ? (
          <div className="flex h-full min-h-[200px] flex-col items-center justify-center text-center">
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
                  d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z"
                />
              </svg>
            </div>
            <h2 className="text-lg font-semibold text-white">RefineAI</h2>
            <p className="mt-2 max-w-md text-sm text-gray-400">
              Describe your app idea below. I&apos;ll plan the project, ask for
              your confirmation, then build each file with automatic review and
              refinement until every file reaches {USER_MESSAGES.qualityTarget.toLowerCase()}.
            </p>
          </div>
        ) : (
          <div className="mx-auto max-w-3xl space-y-2">
            {messages.map((msg) => (
              <MessageBubble key={msg.id} role={msg.role} content={msg.content}>
                {msg.type === "plan" && msg.metadata?.plan ? (
                  <PlanCard
                    plan={msg.metadata.plan as ProjectPlan}
                    liveFiles={isBuilding || phase === "complete" ? mergedFiles : undefined}
                  />
                ) : null}
              </MessageBubble>
            ))}

            {plan && phase === "awaiting_confirm" && !messages.some((m) => m.type === "plan") && (
              <MessageBubble role="assistant" content="">
                <PlanCard plan={plan} liveFiles={mergedFiles} />
              </MessageBubble>
            )}

            {showConfirm && plan && (
              <MessageBubble role="assistant" content="Ready when you are.">
                <ConfirmButtons
                  onConfirm={onConfirm}
                  onChanges={onMakeChanges}
                  disabled={confirmDisabled}
                />
              </MessageBubble>
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

            {activeProgress && isBuilding && (
              <ProgressCard
                fileName={activeProgress.fileName}
                round={activeProgress.round}
              />
            )}

            {phase === "complete" && displayPlan && (
              <MessageBubble role="assistant" content="">
                <SummaryCard
                  plan={displayPlan}
                  files={files}
                  onDownload={onDownload}
                  onRunApp={onRunApp}
                  isRunning={isPreviewRunning}
                  runDisabled={isRunDisabled}
                />
              </MessageBubble>
            )}

            <div ref={bottomRef} />
          </div>
        )}
      </div>
    </div>
  );
}
