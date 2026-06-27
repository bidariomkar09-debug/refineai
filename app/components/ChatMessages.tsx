"use client";

import { useEffect, useRef } from "react";
import type { BuildPhase, ChatMessage, ProjectPlan } from "@/app/lib/agentTypes";
import type { ExplorerFile } from "@/app/lib/mergeProjectFiles";
import MessageBubble from "./MessageBubble";
import PlanCard from "./PlanCard";

type ChatMessagesProps = {
  messages: ChatMessage[];
  plan: ProjectPlan | null;
  phase: BuildPhase;
  mergedFiles: ExplorerFile[];
  compact?: boolean;
};

export default function ChatMessages({
  messages,
  plan,
  phase,
  mergedFiles,
  compact = false,
}: ChatMessagesProps) {
  const bottomRef = useRef<HTMLDivElement>(null);
  const isBuilding = phase === "building" || phase === "testing";

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages.length, phase]);

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
      {messages.map((msg) => (
        <MessageBubble
          key={msg.id}
          role={msg.role}
          content={msg.content}
          compact={compact}
        >
          {msg.type === "plan" && msg.metadata?.plan ? (
            <PlanCard
              plan={msg.metadata.plan as ProjectPlan}
              liveFiles={isBuilding || phase === "complete" ? mergedFiles : undefined}
            />
          ) : null}
        </MessageBubble>
      ))}

      {plan && phase === "awaiting_confirm" && !messages.some((m) => m.type === "plan") && (
        <MessageBubble role="assistant" content="" compact={compact}>
          <PlanCard plan={plan} liveFiles={mergedFiles} />
        </MessageBubble>
      )}

      <div ref={bottomRef} />
    </div>
  );
}
