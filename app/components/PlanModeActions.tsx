"use client";

type PlanModeActionsProps = {
  onApprove: () => void;
  onModify: () => void;
  disabled?: boolean;
};

export default function PlanModeActions({
  onApprove,
  onModify,
  disabled,
}: PlanModeActionsProps) {
  return (
    <div className="mt-3 flex flex-wrap gap-2">
      <button
        type="button"
        onClick={onApprove}
        disabled={disabled}
        className="rounded-lg bg-amber-600 px-3 py-1.5 text-xs font-medium text-white hover:bg-amber-500 disabled:opacity-50"
      >
        Approve Plan
      </button>
      <button
        type="button"
        onClick={onModify}
        disabled={disabled}
        className="rounded-lg border border-amber-500/40 px-3 py-1.5 text-xs text-amber-300 hover:bg-amber-500/10 disabled:opacity-50"
      >
        Modify Plan
      </button>
    </div>
  );
}
