"use client";

import { useEffect, useRef, useState } from "react";
import type {
  BuildPhase,
  ChatMessage,
  ClarifyingQuestion,
  DebugProposal,
  FileRoundEvent,
  ProjectClarifications,
  ProjectPlan,
  VisualPlanArtifacts,
} from "@/app/lib/agentTypes";
import type { ExplorerFile } from "@/app/lib/mergeProjectFiles";
import MessageBubble from "./MessageBubble";
import ModeBadge from "./ModeBadge";
import ClarifyingQuestions from "./ClarifyingQuestions";
import PlanModeActions from "./PlanModeActions";
import PlanQuestionOptions from "./PlanQuestionOptions";
import PlanChatCard from "./PlanChatCard";
import DebugFixActions from "./DebugFixActions";

type ChatMessagesProps = {
  messages: ChatMessage[];
  compact?: boolean;
  mobile?: boolean;
  onPlanApprove?: () => void;
  onPlanModify?: () => void;
  onPlanAnswer?: (answer: string) => void;
  onClarificationAnswer?: (questionId: string, value: string) => void;
  onClarificationsSubmit?: () => void;
  clarifyingQuestions?: ClarifyingQuestion[];
  clarifications?: ProjectClarifications;
  planPhase?: "idle" | "clarifying" | "ready";
  onDebugApply?: (proposal: DebugProposal, messageId: string) => void;
  appliedDebugMessageIds?: Set<string>;
  actionsDisabled?: boolean;
  hidePlanActions?: boolean;
  livePlan?: ProjectPlan | null;
  liveFiles?: ExplorerFile[];
  phase?: BuildPhase;
  statusMessage?: string;
  currentRound?: FileRoundEvent | null;
  activeFileName?: string | null;
  onPause?: () => void;
  onSkip?: () => void;
};

function VisualPlanSummary({ visual }: { visual: VisualPlanArtifacts }) {
  const [flowchartOpen, setFlowchartOpen] = useState(false);

  return (
    <div
      className="mt-2 rounded-xl border border-indigo-500/25 bg-[#12121a] px-3 py-3"
      data-testid="visual-plan-summary"
    >
      <p className="text-xs font-medium text-white">{visual.headline}</p>
      <p className="mt-1 line-clamp-3 text-[11px] leading-relaxed text-zinc-400">
        {visual.plainEnglish}
      </p>
      <ul className="mt-2 space-y-0.5">
        {visual.outcomeBullets.slice(0, 3).map((bullet) => (
          <li key={bullet} className="text-[10px] text-indigo-300">
            • {bullet}
          </li>
        ))}
      </ul>
      {visual.flowchart && (
        <div className="mt-2 border-t border-white/5 pt-2">
          <button
            type="button"
            onClick={() => setFlowchartOpen((v) => !v)}
            className="flex w-full items-center justify-between text-[10px] font-medium text-indigo-300"
            data-testid="visual-plan-flowchart-toggle"
          >
            How it&apos;s structured
            <span>{flowchartOpen ? "▾" : "▸"}</span>
          </button>
          {flowchartOpen && (
            <pre
              className="mt-2 overflow-x-auto whitespace-pre font-mono text-[10px] leading-relaxed text-indigo-400"
              data-testid="visual-plan-flowchart"
            >
              {visual.flowchart}
            </pre>
          )}
        </div>
      )}
    </div>
  );
}

export default function ChatMessages({
  messages,
  compact = false,
  mobile = false,
  onPlanApprove,
  onPlanModify,
  onPlanAnswer,
  onClarificationAnswer,
  onClarificationsSubmit,
  clarifyingQuestions,
  clarifications = {},
  planPhase,
  onDebugApply,
  appliedDebugMessageIds,
  actionsDisabled,
  hidePlanActions = false,
  livePlan,
  liveFiles,
  phase,
  statusMessage,
  currentRound,
  activeFileName,
  onPause,
  onSkip,
}: ChatMessagesProps) {
  const bottomRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages.length, statusMessage, currentRound?.round, currentRound?.score]);

  const lastPlanMessageId = [...messages]
    .reverse()
    .find((m) => m.role === "assistant" && m.metadata?.plan)?.id;

  const activeClarifyingMessageId = [...messages]
    .reverse()
    .find((m) => m.metadata?.clarifyingQuestions && !m.metadata?.clarificationsComplete)?.id;

  function isActivePlanQuestion(index: number): boolean {
    const msg = messages[index];
    if (!msg.metadata?.planQuestionOptions?.length) return false;
    for (let i = index + 1; i < messages.length; i++) {
      if (messages[i].role === "user" && messages[i].mode === "plan") return false;
    }
    return true;
  }

  if (messages.length === 0) {
    return (
      <div className="flex flex-1 flex-col items-center justify-center px-4 py-8 text-center">
        <p className={`${mobile || compact ? "text-sm" : "text-sm"} text-gray-500`}>
          Ask RefineAI to plan and build your app.
        </p>
      </div>
    );
  }

  return (
    <div
      className={`${mobile ? "space-y-2 px-4 py-4" : compact ? "space-y-1 px-3 py-3" : "space-y-1 px-4 py-4 sm:px-6"}`}
    >
      {messages.map((msg, index) => {
        const isProgress = msg.type === "progress";
        const plan = (msg.metadata?.plan as ProjectPlan | undefined) ?? undefined;
        const visual = msg.metadata?.visualPlan as VisualPlanArtifacts | undefined;
        const isLiveCard =
          Boolean(plan) &&
          msg.id === lastPlanMessageId &&
          Boolean(livePlan || liveFiles);

        const hideStalePlanCard =
          mobile && (phase === "building" || phase === "testing") && !isLiveCard;

        const showInlineClarifying =
          mobile &&
          msg.id === activeClarifyingMessageId &&
          planPhase === "clarifying" &&
          clarifyingQuestions &&
          clarifyingQuestions.length > 0 &&
          onClarificationAnswer;

        const clarificationsComplete =
          planPhase === "ready" && msg.metadata?.clarificationsComplete === true;

        return (
          <MessageBubble
            key={msg.id}
            role={msg.role}
            content={msg.content}
            compact={compact && !mobile}
            mobile={mobile}
            progress={isProgress}
            badge={
              msg.role === "assistant" && msg.mode && !isProgress ? (
                <ModeBadge mode={msg.mode} />
              ) : undefined
            }
          >
            {showInlineClarifying && (
              <ClarifyingQuestions
                questions={clarifyingQuestions}
                answers={clarifications}
                onAnswer={onClarificationAnswer}
                onComplete={onClarificationsSubmit}
                disabled={actionsDisabled}
              />
            )}
            {msg.metadata?.planQuestionOptions &&
              isActivePlanQuestion(index) &&
              onPlanAnswer && (
                <PlanQuestionOptions
                  options={msg.metadata.planQuestionOptions}
                  onSelect={onPlanAnswer}
                  disabled={actionsDisabled}
                />
              )}
            {visual && msg.role === "assistant" && !hideStalePlanCard && (
              <VisualPlanSummary visual={visual} />
            )}
            {plan && msg.role === "assistant" && !hideStalePlanCard && !visual && (
              <PlanChatCard
                plan={isLiveCard && livePlan ? livePlan : plan}
                compact={compact && !mobile}
                live={isLiveCard}
                liveFiles={isLiveCard ? liveFiles : undefined}
                phase={isLiveCard ? phase : undefined}
                statusMessage={isLiveCard ? statusMessage : undefined}
                currentRound={isLiveCard ? currentRound : undefined}
                activeFileName={isLiveCard ? activeFileName : undefined}
                onPause={isLiveCard ? onPause : undefined}
                onSkip={isLiveCard ? onSkip : undefined}
                defaultExpanded={isLiveCard ? false : undefined}
              />
            )}
            {msg.metadata?.showPlanActions &&
              !hidePlanActions &&
              onPlanApprove &&
              onPlanModify && (
              <PlanModeActions
                onApprove={onPlanApprove}
                onModify={onPlanModify}
                disabled={actionsDisabled || !clarificationsComplete}
              />
            )}
            {msg.metadata?.showDebugActions &&
              msg.metadata.debugProposal &&
              onDebugApply && (
                <DebugFixActions
                  proposal={msg.metadata.debugProposal as DebugProposal}
                  onApply={(p) => onDebugApply(p, msg.id)}
                  disabled={actionsDisabled}
                  applied={appliedDebugMessageIds?.has(msg.id)}
                />
              )}
          </MessageBubble>
        );
      })}

      {livePlan &&
        !lastPlanMessageId &&
        (phase === "building" ||
          phase === "testing" ||
          phase === "awaiting_confirm" ||
          phase === "complete") && (
          <div className={mobile ? "px-0" : ""}>
            <PlanChatCard
              plan={livePlan}
              compact={compact && !mobile}
              live
              liveFiles={liveFiles}
              phase={phase}
              statusMessage={statusMessage}
              currentRound={currentRound}
              activeFileName={activeFileName}
              onPause={onPause}
              onSkip={onSkip}
              defaultExpanded={false}
            />
          </div>
        )}

      <div ref={bottomRef} />
    </div>
  );
}
