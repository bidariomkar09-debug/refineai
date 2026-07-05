"use client";

import type { FileRoundEvent } from "@/app/lib/agentTypes";

type ProgressCardProps = {
  fileName: string;
  round: FileRoundEvent | null;
};

const TASK_LABEL: Record<string, string> = {
  write: "Writing code",
  review: "Reviewing",
  refine: "Refining",
};

export default function ProgressCard({ fileName, round }: ProgressCardProps) {
  return (
    <div className="rounded-xl border border-surface-border bg-surface/50 p-3 text-xs">
      <div className="flex items-center justify-between">
        <span className="font-medium text-white">{fileName}</span>
        {round ? (
          <span className="font-bold text-accent">{round.score}%</span>
        ) : (
          <span className="text-gray-500">Starting...</span>
        )}
      </div>
      {round ? (
        <>
          <p className="mt-1 text-gray-500">
            Round {round.round} — {TASK_LABEL[round.task] ?? round.task}
          </p>
          {round.task === "review" && round.scoreBefore > 0 && (
            <p className="mt-1 text-[10px] text-gray-400">
              {round.scoreBefore}% → {round.score}%
              {round.scoreImprovement > 0 && (
                <span className="text-accent-green"> (+{round.scoreImprovement})</span>
              )}
            </p>
          )}
          {round.improvement && (
            <p className="mt-0.5 line-clamp-2 text-[10px] text-gray-500">
              {round.improvement}
            </p>
          )}
          <div className="mt-2 h-1.5 overflow-hidden rounded-full bg-gray-800">
            <div
              className="h-full rounded-full bg-accent motion-safe:transition-all duration-500"
              style={{ width: `${round.score}%` }}
            />
          </div>
        </>
      ) : (
        <div className="mt-2 flex items-center gap-2">
          <div className="h-1.5 flex-1 overflow-hidden rounded-full bg-gray-800">
            <div className="h-full w-1/3 motion-safe:animate-pulse rounded-full bg-accent/50" />
          </div>
        </div>
      )}
    </div>
  );
}
