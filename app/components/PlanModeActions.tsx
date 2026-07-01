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
    <div className="mt-3 flex flex-wrap items-center gap-2">
      <button
        type="button"
        onClick={onApprove}
        disabled={disabled}
        className="rounded-md bg-indigo-600 px-3.5 py-1.5 text-xs font-medium text-white transition hover:bg-indigo-500 disabled:cursor-not-allowed disabled:opacity-50"
      >
        Build
      </button>
      <button
        type="button"
        onClick={onModify}
        disabled={disabled}
        className="rounded-md border border-surface-border px-3.5 py-1.5 text-xs text-gray-300 transition hover:border-gray-500 hover:text-white disabled:cursor-not-allowed disabled:opacity-50"
      >
        Edit plan
      </button>
    </div>
  );
}
