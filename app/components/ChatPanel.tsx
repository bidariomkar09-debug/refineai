"use client";

import type {
  BuildPhase,
  ChatMessage,
  ChatMode,
  ClarifyingQuestion,
  DebugProposal,
  ProjectClarifications,
  ProjectPlan,
} from "@/app/lib/agentTypes";
import type { PlanPhase } from "./PlanView";
import type { ExplorerFile } from "@/app/lib/mergeProjectFiles";
import ChatMessages from "./ChatMessages";
import InputBox from "./InputBox";

type ChatPanelProps = {
  messages: ChatMessage[];
  plan: ProjectPlan | null;
  phase: BuildPhase;
  mergedFiles: ExplorerFile[];
  isLoading: boolean;
  awaitingChanges: boolean;
  chatMode: ChatMode;
  onModeChange: (mode: ChatMode) => void;
  inputDisabled: boolean;
  isOpen: boolean;
  collapsed: boolean;
  onClose: () => void;
  onToggleCollapse: () => void;
  onSubmit: (text: string) => void;
  onPlanApprove?: () => void;
  onPlanModify?: () => void;
  onPlanAnswer?: (answer: string) => void;
  onClarificationAnswer?: (questionId: string, value: string) => void;
  onClarificationsSubmit?: () => void;
  clarifyingQuestions?: ClarifyingQuestion[];
  clarifications?: ProjectClarifications;
  planPhase?: PlanPhase;
  onDebugApply?: (proposal: DebugProposal, messageId: string) => void;
  appliedDebugMessageIds?: Set<string>;
  showBuild?: boolean;
  onBuild?: () => void;
  buildDisabled?: boolean;
  onComposerActivity?: (active: boolean) => void;
  initialValue?: string;
  hidePlanActions?: boolean;
};

function PanelContent({
  messages,
  phase,
  isLoading,
  awaitingChanges,
  chatMode,
  onModeChange,
  inputDisabled,
  onSubmit,
  onPlanApprove,
  onPlanModify,
  onPlanAnswer,
  onClarificationAnswer,
  onClarificationsSubmit,
  clarifyingQuestions,
  clarifications,
  planPhase,
  onDebugApply,
  appliedDebugMessageIds,
  showBuild,
  onBuild,
  buildDisabled,
  onComposerActivity,
  initialValue,
  hidePlanActions,
}: Pick<
  ChatPanelProps,
  | "messages"
  | "phase"
  | "isLoading"
  | "awaitingChanges"
  | "chatMode"
  | "onModeChange"
  | "inputDisabled"
  | "onSubmit"
  | "onPlanApprove"
  | "onPlanModify"
  | "onPlanAnswer"
  | "onClarificationAnswer"
  | "onClarificationsSubmit"
  | "clarifyingQuestions"
  | "clarifications"
  | "planPhase"
  | "onDebugApply"
  | "appliedDebugMessageIds"
  | "showBuild"
  | "onBuild"
  | "buildDisabled"
  | "onComposerActivity"
  | "initialValue"
  | "hidePlanActions"
>) {
  return (
    <>
      <div className="min-h-0 flex-1 overflow-y-auto">
        <ChatMessages
          messages={messages}
          compact
          onPlanApprove={onPlanApprove}
          onPlanModify={onPlanModify}
          onPlanAnswer={onPlanAnswer}
          onClarificationAnswer={onClarificationAnswer}
          onClarificationsSubmit={onClarificationsSubmit}
          clarifyingQuestions={clarifyingQuestions}
          clarifications={clarifications}
          planPhase={planPhase}
          onDebugApply={onDebugApply}
          appliedDebugMessageIds={appliedDebugMessageIds}
          actionsDisabled={isLoading || buildDisabled}
          hidePlanActions={hidePlanActions}
        />
      </div>

      <InputBox
        variant="panel"
        onSubmit={onSubmit}
        disabled={inputDisabled}
        isLoading={isLoading}
        phase={phase}
        awaitingChanges={awaitingChanges}
        chatMode={chatMode}
        onModeChange={onModeChange}
        showBuild={showBuild}
        onBuild={onBuild}
        buildDisabled={buildDisabled}
        onComposerActivity={onComposerActivity}
        initialValue={initialValue}
      />
    </>
  );
}

export { PanelContent as ChatPanelContent };
export default function ChatPanel(props: ChatPanelProps) {
  const {
    isOpen,
    collapsed,
    onClose,
    onToggleCollapse,
    ...contentProps
  } = props;

  if (collapsed) {
    return (
      <aside className="hidden shrink-0 flex-col border-l border-surface-border bg-surface-raised lg:flex w-10">
        <div className="flex flex-col items-center py-3">
          <button
            type="button"
            onClick={onToggleCollapse}
            className="rounded p-2 text-gray-400 hover:bg-surface-border hover:text-white"
            aria-label="Expand chat"
          >
            <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
            </svg>
          </button>
        </div>
      </aside>
    );
  }

  return (
    <>
      <aside className="hidden h-full w-[380px] shrink-0 flex-col border-l border-surface-border bg-surface-raised lg:flex">
        <div className="flex min-h-0 flex-1 flex-col">
          <div className="flex shrink-0 items-center justify-between border-b border-surface-border px-3 py-2">
            <h2 className="text-xs font-semibold uppercase tracking-wider text-gray-400">
              Chat
            </h2>
            <button
              type="button"
              onClick={onToggleCollapse}
              className="rounded p-1.5 text-gray-400 hover:bg-surface-border hover:text-white"
              aria-label="Collapse chat"
            >
              <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
              </svg>
            </button>
          </div>
          <PanelContent {...contentProps} />
        </div>
      </aside>

      {isOpen && (
        <>
          <div
            className="fixed inset-0 z-40 bg-black/60 lg:hidden"
            onClick={onClose}
            aria-hidden="true"
          />
          <aside className="fixed inset-y-0 right-0 z-50 flex w-full max-w-md flex-col border-l border-surface-border bg-surface-raised lg:hidden">
            <div className="flex shrink-0 items-center justify-between border-b border-surface-border px-3 py-2.5">
              <h2 className="text-xs font-semibold uppercase tracking-wider text-gray-400">
                Chat
              </h2>
              <button
                type="button"
                onClick={onClose}
                className="rounded p-1.5 text-gray-400 hover:bg-surface-border hover:text-white"
                aria-label="Close chat"
              >
                ✕
              </button>
            </div>
            <PanelContent {...contentProps} />
          </aside>
        </>
      )}
    </>
  );
}

export function ChatPanelToggle({ onClick }: { onClick: () => void }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="touch-target touch-press hidden items-center gap-2 rounded-lg border border-surface-border bg-surface-raised px-3 py-2 text-sm text-gray-300 transition hover:border-gray-600 hover:text-white md:flex lg:hidden"
      aria-label="Open chat"
    >
      Chat
    </button>
  );
}
