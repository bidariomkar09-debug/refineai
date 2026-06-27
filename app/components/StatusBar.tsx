"use client";

import type { LoopStatus } from "@/app/lib/types";
import { STATUS_LABELS } from "@/app/lib/types";

type StatusBarProps = {
  status: LoopStatus;
  score: number;
  scoreThreshold: number;
  onStop: () => void;
};

const ACTIVE_STATUSES: LoopStatus[] = [
  "generating",
  "critiquing",
  "refining",
];

function getScoreColor(score: number, threshold: number): string {
  if (score >= threshold) return "from-accent-green to-emerald-400";
  if (score >= 70) return "from-yellow-500 to-yellow-400";
  if (score >= 40) return "from-orange-500 to-yellow-500";
  return "from-red-500 to-orange-500";
}

export default function StatusBar({
  status,
  score,
  scoreThreshold,
  onStop,
}: StatusBarProps) {
  const isActive = ACTIVE_STATUSES.includes(status);
  const canStop = isActive;

  return (
    <div className="border-b border-surface-border bg-surface-raised px-4 py-3 sm:px-6">
      <div className="mx-auto flex max-w-3xl flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-center gap-3">
          <span className="text-xs font-medium uppercase tracking-wider text-gray-500">
            Loop Status
          </span>
          <span
            className={`inline-flex items-center gap-2 rounded-full px-3 py-1 text-sm font-medium ${
              isActive
                ? "bg-accent/20 text-accent motion-safe:animate-pulse"
                : status === "complete"
                  ? "bg-accent-green/20 text-accent-green"
                  : status === "stopped"
                    ? "bg-yellow-500/20 text-yellow-400"
                    : status === "error"
                      ? "bg-red-500/20 text-red-400"
                      : "bg-gray-700/50 text-gray-400"
            }`}
          >
            {isActive && (
              <span className="inline-block h-2 w-2 rounded-full bg-current motion-safe:animate-pulse" />
            )}
            {STATUS_LABELS[status]}
          </span>
        </div>

        <div className="flex flex-1 items-center gap-3 sm:max-w-xs sm:justify-end">
          <div className="flex flex-1 flex-col gap-1 sm:max-w-[200px]">
            <div className="flex items-center justify-between text-xs">
              <span className="text-gray-500">Quality Score</span>
              <span
                className={`font-bold tabular-nums ${
                  score >= scoreThreshold
                    ? "text-accent-green"
                    : score >= 70
                      ? "text-yellow-400"
                      : "text-gray-300"
                }`}
              >
                {score}%
              </span>
            </div>
            <div className="h-2 overflow-hidden rounded-full bg-gray-800">
              <div
                className={`h-full rounded-full bg-gradient-to-r motion-safe:transition-all motion-safe:duration-700 ease-out ${getScoreColor(score, scoreThreshold)}`}
                style={{ width: `${Math.min(100, score)}%` }}
              />
            </div>
          </div>

          <button
            type="button"
            onClick={onStop}
            disabled={!canStop}
            className="shrink-0 rounded-lg border border-red-500/50 bg-red-500/10 px-4 py-2 text-sm font-semibold text-red-400 transition hover:bg-red-500/20 disabled:cursor-not-allowed disabled:border-gray-700 disabled:bg-transparent disabled:text-gray-600"
          >
            STOP
          </button>
        </div>
      </div>
    </div>
  );
}
