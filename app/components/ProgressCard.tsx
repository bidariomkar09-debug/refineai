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
  if (!round) return null;

  return (
    <div className="rounded-xl border border-surface-border bg-surface/50 p-3 text-xs">
      <div className="flex items-center justify-between">
        <span className="font-medium text-white">{fileName}</span>
        <span className="font-bold text-accent">{round.score}%</span>
      </div>
      <p className="mt-1 text-gray-500">
        Round {round.round} — {TASK_LABEL[round.task] ?? round.task}
      </p>
      <div className="mt-2 h-1.5 overflow-hidden rounded-full bg-gray-800">
        <div
          className="h-full rounded-full bg-accent motion-safe:transition-all duration-500"
          style={{ width: `${round.score}%` }}
        />
      </div>
    </div>
  );
}
