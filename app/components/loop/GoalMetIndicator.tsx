"use client";

type GoalMetIndicatorProps = {
  show: boolean;
  score: number;
};

export default function GoalMetIndicator({ show, score }: GoalMetIndicatorProps) {
  if (!show) return null;

  return (
    <div
      className="pointer-events-none fixed inset-x-0 top-20 z-50 flex justify-center px-4 motion-safe:animate-fade-in"
      data-testid="goal-met-indicator"
      role="status"
    >
      <div className="flex items-center gap-3 rounded-xl border border-accent-green/40 bg-surface-raised/95 px-5 py-3 shadow-lg backdrop-blur">
        <span
          className="flex h-10 w-10 items-center justify-center rounded-full bg-accent-green/20 text-xl text-accent-green motion-safe:animate-check-pop"
          aria-hidden
        >
          ✓
        </span>
        <div>
          <p className="text-sm font-bold text-white">Goal Met!</p>
          <p className="text-xs text-accent-green">{score}% quality reached</p>
        </div>
      </div>
    </div>
  );
}
