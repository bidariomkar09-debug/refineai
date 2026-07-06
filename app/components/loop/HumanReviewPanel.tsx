"use client";

import type { DbFile, ProjectPlan } from "@/app/lib/agentTypes";
import { meetsQualityThreshold } from "@/app/lib/agentTypes";
import { completionMessage } from "@/app/lib/userMessages";

type HumanReviewPanelProps = {
  plan: ProjectPlan;
  files: DbFile[];
  previewVerified?: boolean;
  onAcceptAll: () => void;
  onRequestChanges: () => void;
};

export default function HumanReviewPanel({
  plan,
  files,
  previewVerified = false,
  onAcceptAll,
  onRequestChanges,
}: HumanReviewPanelProps) {
  const doneFiles = files
    .filter((f) => f.status === "done")
    .sort((a, b) => a.file_path.localeCompare(b.file_path));
  const avgScore =
    doneFiles.length > 0
      ? Math.round(
          doneFiles.reduce((sum, f) => sum + f.score, 0) / doneFiles.length
        )
      : 0;

  return (
    <div
      className="space-y-4 rounded-xl border border-accent/30 bg-accent/5 p-5 motion-safe:animate-fade-in"
      data-testid="human-review-panel"
    >
      <div>
        <p className="text-[10px] font-semibold uppercase tracking-wider text-accent">
          Step 5 — Human reviews
        </p>
        <h3 className="mt-1 text-lg font-semibold text-white">Review your build</h3>
        {previewVerified && (
          <p
            className="mt-2 inline-flex items-center gap-1.5 rounded-md border border-accent-green/40 bg-accent-green/10 px-2.5 py-1 text-xs font-medium text-accent-green"
            data-testid="preview-verified-badge"
          >
            ✓ Preview verified
          </p>
        )}
        <p className="mt-2 text-sm leading-relaxed text-gray-300">
          {completionMessage(plan.name, doneFiles.length, avgScore)}
        </p>
      </div>

      {doneFiles.length > 0 && (
        <div>
          <p className="mb-2 text-xs font-semibold uppercase tracking-wider text-gray-500">
            Files & scores
          </p>
          <ul className="max-h-48 space-y-1 overflow-y-auto rounded-lg bg-black/20 p-2">
            {doneFiles.map((file) => (
              <li
                key={file.id}
                className="flex items-center justify-between gap-2 text-xs"
              >
                <span className="min-w-0 truncate font-mono text-gray-300">
                  {file.file_path}
                </span>
                <span
                  className={`shrink-0 font-semibold tabular-nums ${
                    meetsQualityThreshold(file.score)
                      ? "text-accent-green"
                      : "text-amber-400"
                  }`}
                >
                  {file.score}%
                </span>
              </li>
            ))}
          </ul>
        </div>
      )}

      <div className="flex flex-col gap-2 sm:flex-row">
        <button
          type="button"
          onClick={onAcceptAll}
          className="touch-target min-h-[44px] flex-1 rounded-xl bg-accent-green py-3 text-sm font-semibold text-white transition hover:bg-green-600"
        >
          Accept All
        </button>
        <button
          type="button"
          onClick={onRequestChanges}
          className="touch-target min-h-[44px] flex-1 rounded-xl border border-surface-border bg-surface-raised py-3 text-sm font-medium text-gray-300 transition hover:text-white"
        >
          Request Changes
        </button>
      </div>
    </div>
  );
}
