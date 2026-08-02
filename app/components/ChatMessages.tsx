"use client";

import { useEffect, useRef } from "react";
import type {
  BuildPhase,
  ChatMessage,
  DebugProposal,
  FileRoundEvent,
  ProjectPlan,
} from "@/app/lib/agentTypes";
import type { ExplorerFile } from "@/app/lib/mergeProjectFiles";
import MessageBubble from "./MessageBubble";
import ModeBadge from "./ModeBadge";
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
  onDebugApply?: (proposal: DebugProposal, messageId: string) => void;
  appliedDebugMessageIds?: Set<string>;
  actionsDisabled?: boolean;
  /** Hide Build/Edit plan when a paused build must be resumed */
  hidePlanActions?: boolean;
  /** Live build state for the latest plan card */
  livePlan?: ProjectPlan | null;
  liveFiles?: ExplorerFile[];
  phase?: BuildPhase;
  statusMessage?: string;
  currentRound?: FileRoundEvent | null;
  activeFileName?: string | null;
  onPause?: () => void;
  onSkip?: () => void;
};

export default function ChatMessages({
  messages,
  compact = false,
  mobile = false,
  onPlanApprove,
  onPlanModify,
  onPlanAnswer,
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
        const isLiveCard =
          Boolean(plan) &&
          msg.id === lastPlanMessageId &&
          Boolean(livePlan || liveFiles);

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
            {msg.metadata?.planQuestionOptions &&
              isActivePlanQuestion(index) &&
              onPlanAnswer && (
                <PlanQuestionOptions
                  options={msg.metadata.planQuestionOptions}
                  onSelect={onPlanAnswer}
                  disabled={actionsDisabled}
                />
              )}
            {plan && msg.role === "assistant" && (
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
                disabled={actionsDisabled}
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

      {/* Agent-mode builds: show live plan card when no plan message in thread */}
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
