"use client";

import { useState, useCallback, type KeyboardEvent } from "react";

type InputBoxProps = {
  onSubmit: (target: string) => void;
  disabled: boolean;
  isLoading: boolean;
};

export default function InputBox({
  onSubmit,
  disabled,
  isLoading,
}: InputBoxProps) {
  const [value, setValue] = useState("");

  const handleSubmit = useCallback(() => {
    const trimmed = value.trim();
    if (!trimmed || disabled) return;
    onSubmit(trimmed);
    setValue("");
  }, [value, disabled, onSubmit]);

  const handleKeyDown = (e: KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSubmit();
    }
  };

  return (
    <div className="border-t border-surface-border bg-surface px-4 py-4 sm:px-6">
      <div className="mx-auto flex max-w-3xl gap-3">
        <textarea
          value={value}
          onChange={(e) => setValue(e.target.value)}
          onKeyDown={handleKeyDown}
          disabled={disabled}
          placeholder="Describe your target output... (e.g. Write a haiku about rain)"
          rows={2}
          className="flex-1 resize-none rounded-xl border border-surface-border bg-surface-raised px-4 py-3 text-sm text-white placeholder-gray-500 outline-none transition focus:border-accent disabled:cursor-not-allowed disabled:opacity-50"
        />
        <button
          type="button"
          onClick={handleSubmit}
          disabled={disabled || !value.trim()}
          className="self-end rounded-xl bg-accent px-5 py-3 text-sm font-semibold text-white transition hover:bg-blue-600 disabled:cursor-not-allowed disabled:opacity-50"
        >
          {isLoading ? (
            <span className="flex items-center gap-2">
              <span className="inline-block h-4 w-4 motion-safe:animate-spin rounded-full border-2 border-white border-t-transparent" />
              Running
            </span>
          ) : (
            "Start Loop"
          )}
        </button>
      </div>
      <p className="mx-auto mt-2 max-w-3xl text-xs text-gray-500">
        Press Enter to start. Shift+Enter for new line.
      </p>
    </div>
  );
}
