"use client";

import type { LoopIteration } from "@/app/lib/loopEngineeringTypes";

type LoopCounterProps = {
  iterations: LoopIteration[];
  visible: boolean;
};

export default function LoopCounter({ iterations, visible }: LoopCounterProps) {
  if (!visible || iterations.length === 0) return null;

  const failedLoops = iterations.filter((i) => !i.goalMet);
  const lastMet = iterations.find((i) => i.goalMet);
  const latest = iterations[iterations.length - 1];

  return (
    <div
      className="border-b border-surface-border bg-surface/50 px-3 py-2 sm:px-4"
      data-testid="loop-counter"
    >
      <div className="flex flex-wrap items-center gap-1.5 text-xs">
        {failedLoops.map((loop, idx) => (
          <span key={`loop-${loop.loopNumber}-${idx}`} className="flex items-center gap-1.5">
            {idx > 0 && <span className="text-gray-600">→</span>}
            <span className="rounded-md border border-amber-500/30 bg-amber-500/10 px-2 py-0.5 font-medium text-amber-400">
              Loop {loop.loopNumber}
            </span>
          </span>
        ))}
        {lastMet && (
          <>
            {failedLoops.length > 0 && <span className="text-gray-600">→</span>}
            <span className="rounded-md border border-accent-green/40 bg-accent-green/10 px-2 py-0.5 font-semibold text-accent-green motion-safe:animate-fade-in">
              Goal Met!
            </span>
          </>
        )}
      </div>
      {latest && !latest.goalMet && (
        <p className="mt-1.5 text-[10px] text-gray-400">
          {latest.scoreBefore}% → {latest.scoreAfter}% · {latest.improvement}
        </p>
      )}
      {latest?.goalMet && (
        <p className="mt-1.5 text-[10px] text-accent-green">
          Final score {latest.scoreAfter}% — {latest.improvement}
        </p>
      )}
    </div>
  );
}
