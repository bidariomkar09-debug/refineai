"use client";

import { useEffect, useRef } from "react";
import type { ChatMessage } from "@/app/lib/agentTypes";
import MessageBubble from "./MessageBubble";

type ChatMessagesProps = {
  messages: ChatMessage[];
  compact?: boolean;
};

export default function ChatMessages({
  messages,
  compact = false,
}: ChatMessagesProps) {
  const bottomRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages.length]);

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
        />
      ))}

      <div ref={bottomRef} />
    </div>
  );
}
