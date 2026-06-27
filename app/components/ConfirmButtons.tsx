"use client";

type ConfirmButtonsProps = {
  onConfirm: () => void;
  onChanges: () => void;
  disabled?: boolean;
};

export default function ConfirmButtons({
  onConfirm,
  onChanges,
  disabled,
}: ConfirmButtonsProps) {
  return (
    <div className="mt-4 flex flex-wrap gap-3">
      <button
        type="button"
        onClick={onConfirm}
        disabled={disabled}
        className="rounded-xl bg-accent-green px-5 py-2.5 text-sm font-semibold text-white transition hover:bg-green-600 disabled:opacity-50"
      >
        Start Building
      </button>
      <button
        type="button"
        onClick={onChanges}
        disabled={disabled}
        className="rounded-xl border border-surface-border bg-surface px-5 py-2.5 text-sm font-medium text-gray-300 transition hover:border-gray-600 hover:text-white disabled:opacity-50"
      >
        Make Changes
      </button>
    </div>
  );
}
