"use client";

import type { LoopEngineeringSnapshot } from "@/app/lib/loopEngineeringTypes";
import { formatElapsed } from "@/app/lib/loopEngineeringState";

type LoopEngineeringSummaryProps = {
  snapshot: LoopEngineeringSnapshot;
  onRunApp: () => void;
  onDownload: () => void;
  isRunDisabled: boolean;
  isPreviewRunning: boolean;
  setupInstructions?: string;
};

export default function LoopEngineeringSummary({
  snapshot,
  onRunApp,
  onDownload,
  isRunDisabled,
  isPreviewRunning,
  setupInstructions,
}: LoopEngineeringSummaryProps) {
  return (
    <div
      className="space-y-4 rounded-xl border border-accent-green/30 bg-accent-green/5 p-5 motion-safe:animate-fade-in"
      data-testid="loop-engineering-summary"
    >
      <div>
        <h3 className="text-lg font-bold text-white">Loop Engineering Complete!</h3>
        <ul className="mt-3 space-y-1.5 text-sm text-gray-300">
          <li>
            Total loops run:{" "}
            <span className="font-semibold text-white">{snapshot.totalLoops}</span>
          </li>
          <li>
            Goal achieved:{" "}
            <span className="font-semibold text-accent-green">
              {snapshot.goalQualityPercent}% quality
            </span>
          </li>
          <li>
            Time taken:{" "}
            <span className="font-semibold text-white">
              {formatElapsed(snapshot.elapsedMs)}
            </span>
          </li>
          <li className="text-accent-green">Agent drove every step</li>
        </ul>
      </div>

      {setupInstructions && (
        <p className="text-sm text-gray-400">{setupInstructions}</p>
      )}

      <button
        type="button"
        onClick={onRunApp}
        disabled={isRunDisabled || isPreviewRunning}
        className="w-full rounded-xl bg-accent-green py-3 text-sm font-semibold text-white transition hover:bg-green-600 disabled:cursor-not-allowed disabled:opacity-50"
      >
        {isPreviewRunning ? "Starting app..." : "Run App"}
      </button>

      <button
        type="button"
        onClick={onDownload}
        className="w-full rounded-xl border border-accent-green/40 bg-accent-green/10 py-2.5 text-sm font-medium text-accent-green transition hover:bg-accent-green/20"
      >
        Download All Files
      </button>
    </div>
  );
}
