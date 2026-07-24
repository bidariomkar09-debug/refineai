"use client";

import type { DbFile } from "@/app/lib/agentTypes";
import { meetsQualityThreshold } from "@/app/lib/agentTypes";

type FileBadgesProps = {
  file: Pick<DbFile, "score" | "ai_score" | "runtime_verified" | "status">;
  compact?: boolean;
};

export default function FileBadges({ file, compact = false }: FileBadgesProps) {
  const aiScore = file.ai_score ?? file.score;
  const aiPass = meetsQualityThreshold(aiScore);
  const runtimeVerified = file.runtime_verified === true;
  const runtimeFailed =
    file.status === "needs_fix" ||
    (file.status === "done" && !runtimeVerified) ||
    file.status === "best_effort";

  const size = compact ? "text-[10px] px-1 py-0.5" : "text-xs px-2 py-0.5";

  return (
    <div className="flex shrink-0 items-center gap-1">
      <span
        className={`rounded font-semibold tabular-nums ${size} ${
          aiPass ? "bg-accent-green/15 text-accent-green" : "bg-amber-500/15 text-amber-400"
        }`}
        data-testid="ai-score-badge"
      >
        AI {aiScore}%
      </span>
      {runtimeVerified ? (
        <span
          className={`rounded font-medium ${size} bg-accent-green/10 text-accent-green`}
          data-testid="runtime-verified-badge"
        >
          Runtime ✓
        </span>
      ) : runtimeFailed ? (
        <span
          className={`rounded font-medium ${size} bg-red-500/10 text-red-400`}
          data-testid="runtime-failed-badge"
        >
          Runtime ✗
        </span>
      ) : file.status === "building" ? (
        <span className={`rounded font-medium ${size} bg-gray-600/30 text-gray-400`}>
          Runtime …
        </span>
      ) : null}
    </div>
  );
}
