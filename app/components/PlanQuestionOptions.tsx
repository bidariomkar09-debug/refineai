"use client";

import { useState } from "react";

const CUSTOM_LABEL = "Something else…";

type PlanQuestionOptionsProps = {
  options: string[];
  onSelect: (answer: string) => void;
  disabled?: boolean;
};

export default function PlanQuestionOptions({
  options,
  onSelect,
  disabled,
}: PlanQuestionOptionsProps) {
  const [showCustom, setShowCustom] = useState(false);
  const [customValue, setCustomValue] = useState("");

  const submitCustom = () => {
    const trimmed = customValue.trim();
    if (!trimmed || disabled) return;
    onSelect(trimmed);
    setCustomValue("");
    setShowCustom(false);
  };

  return (
    <div className="mt-3 space-y-1.5">
      {options.map((option) => (
        <button
          key={option}
          type="button"
          onClick={() => onSelect(option)}
          disabled={disabled}
          className="w-full rounded-lg border border-surface-border bg-surface-raised/80 px-3 py-2.5 text-left text-xs leading-snug text-gray-200 transition hover:border-amber-500/50 hover:bg-amber-500/10 disabled:cursor-not-allowed disabled:opacity-50"
        >
          {option}
        </button>
      ))}

      {!showCustom ? (
        <button
          type="button"
          onClick={() => setShowCustom(true)}
          disabled={disabled}
          className="w-full rounded-lg border border-dashed border-gray-600 px-3 py-2.5 text-left text-xs text-gray-400 transition hover:border-amber-500/40 hover:bg-amber-500/5 hover:text-gray-200 disabled:cursor-not-allowed disabled:opacity-50"
        >
          {CUSTOM_LABEL}
        </button>
      ) : (
        <div className="space-y-2 rounded-lg border border-amber-500/30 bg-amber-500/5 p-2.5">
          <textarea
            value={customValue}
            onChange={(e) => setCustomValue(e.target.value)}
            disabled={disabled}
            placeholder="Describe what you need…"
            rows={2}
            className="w-full resize-none rounded-md border border-surface-border bg-surface px-2.5 py-2 text-xs text-white placeholder-gray-500 outline-none focus:border-amber-500/50"
            onKeyDown={(e) => {
              if (e.key === "Enter" && !e.shiftKey) {
                e.preventDefault();
                submitCustom();
              }
            }}
            autoFocus
          />
          <div className="flex justify-end gap-2">
            <button
              type="button"
              onClick={() => {
                setShowCustom(false);
                setCustomValue("");
              }}
              disabled={disabled}
              className="rounded-md px-2.5 py-1 text-xs text-gray-400 hover:text-gray-200"
            >
              Cancel
            </button>
            <button
              type="button"
              onClick={submitCustom}
              disabled={disabled || !customValue.trim()}
              className="rounded-md bg-amber-600 px-2.5 py-1 text-xs font-medium text-white hover:bg-amber-500 disabled:opacity-50"
            >
              Send
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
