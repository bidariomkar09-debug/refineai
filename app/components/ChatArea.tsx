"use client";

import { useEffect, useRef } from "react";
import type { Iteration, LoopStatus, ViewMode } from "@/app/lib/types";
import OutputCard from "./OutputCard";
import { TARGET_SCORE } from "@/app/lib/types";

type ChatAreaProps = {
  iterations: Iteration[];
  status: LoopStatus;
  finalRound: number | null;
  targetDescription: string;
  viewMode: ViewMode;
};

const ACTIVE_STATUSES: LoopStatus[] = [
  "generating",
  "critiquing",
  "refining",
];

export default function ChatArea({
  iterations,
  status,
  finalRound,
  targetDescription,
  viewMode,
}: ChatAreaProps) {
  const bottomRef = useRef<HTMLDivElement>(null);
  const isActive = viewMode === "live" && ACTIVE_STATUSES.includes(status);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [iterations.length, status]);

  return (
    <div className="flex flex-1 flex-col overflow-hidden">
      {viewMode === "history" && (
        <div className="border-b border-accent/30 bg-accent/10 px-4 py-2 text-center text-sm text-accent sm:px-6">
          Viewing past session — read only
        </div>
      )}

      <div className="flex-1 overflow-y-auto px-4 py-4 sm:px-6">
        {iterations.length === 0 && !isActive ? (
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
                  d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15"
                />
              </svg>
            </div>
            <h2 className="text-lg font-semibold text-white">RefineAI</h2>
            <p className="mt-2 max-w-md text-sm text-gray-400">
              Describe your target output below. The AI will generate, critique,
              and refine in a loop until quality reaches {TARGET_SCORE}%+.
            </p>
          </div>
        ) : (
          <div className="mx-auto max-w-3xl space-y-4">
            {targetDescription && (
              <div className="rounded-xl border border-surface-border bg-surface-raised/50 p-4">
                <p className="mb-1 text-xs font-medium uppercase tracking-wider text-gray-500">
                  Your Target
                </p>
                <p className="text-sm text-gray-200">{targetDescription}</p>
              </div>
            )}
            {iterations.map((iteration) => (
              <OutputCard
                key={iteration.round}
                iteration={iteration}
                isFinal={finalRound === iteration.round}
              />
            ))}
            {isActive && (
              <div className="flex items-center gap-3 rounded-xl border border-surface-border bg-surface-raised/50 p-4">
                <div className="h-5 w-5 motion-safe:animate-spin rounded-full border-2 border-accent border-t-transparent" />
                <span className="text-sm text-gray-400">
                  Working on the next round...
                </span>
              </div>
            )}
            <div ref={bottomRef} />
          </div>
        )}
      </div>
    </div>
  );
}
