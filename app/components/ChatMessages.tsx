"use client";

import { useEffect, useRef } from "react";
import type { ChatMessage, DebugProposal, ProjectPlan } from "@/app/lib/agentTypes";
import MessageBubble from "./MessageBubble";
import ModeBadge from "./ModeBadge";
import PlanModeActions from "./PlanModeActions";
import PlanQuestionOptions from "./PlanQuestionOptions";
import PlanChatCard from "./PlanChatCard";
import DebugFixActions from "./DebugFixActions";

type ChatMessagesProps = {
  messages: ChatMessage[];
  compact?: boolean;
  onPlanApprove?: () => void;
  onPlanModify?: () => void;
  onPlanAnswer?: (answer: string) => void;
  onDebugApply?: (proposal: DebugProposal, messageId: string) => void;
  appliedDebugMessageIds?: Set<string>;
  actionsDisabled?: boolean;
};

export default function ChatMessages({
  messages,
  compact = false,
  onPlanApprove,
  onPlanModify,
  onPlanAnswer,
  onDebugApply,
  appliedDebugMessageIds,
  actionsDisabled,
}: ChatMessagesProps) {
  const bottomRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages.length]);

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
        <p className={`${compact ? "text-xs" : "text-sm"} text-gray-500`}>
          Ask RefineAI to plan and build your app.
        </p>
      </div>
    );
  }

  return (
    <div className={`space-y-1 ${compact ? "px-3 py-3" : "px-4 py-4 sm:px-6"}`}>
      {messages.map((msg, index) => (
        <MessageBubble
          key={msg.id}
          role={msg.role}
          content={msg.content}
          compact={compact}
          badge={msg.role === "assistant" && msg.mode ? <ModeBadge mode={msg.mode} /> : undefined}
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
          {msg.metadata?.plan && msg.role === "assistant" && (
            <PlanChatCard
              plan={msg.metadata.plan as ProjectPlan}
              compact={compact}
            />
          )}
          {msg.metadata?.showPlanActions && onPlanApprove && onPlanModify && (
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
      ))}

      <div ref={bottomRef} />
    </div>
  );
}
