"use client";

import { useState, useCallback, type KeyboardEvent, type ChangeEvent } from "react";
import type { BuildPhase } from "@/app/lib/agentTypes";

type InputBoxProps = {
  onSubmit: (text: string) => void;
  disabled: boolean;
  isLoading: boolean;
  phase: BuildPhase;
  awaitingChanges: boolean;
  variant?: "default" | "panel";
  mobile?: boolean;
};

function getPlaceholder(phase: BuildPhase, awaitingChanges: boolean): string {
  if (awaitingChanges) {
    return "e.g. add a pomodoro timer";
  }
  if (phase === "building" || phase === "testing") {
    return "Message while building...";
  }
  if (phase === "awaiting_confirm") {
    return "Request plan changes...";
  }
  return "Describe your app idea...";
}

function getButtonLabel(isLoading: boolean, phase: BuildPhase): string {
  if (isLoading) return "...";
  if (phase === "idle" || phase === "planning") return "Plan";
  return "Send";
}

export default function InputBox({
  onSubmit,
  disabled,
  isLoading,
  phase,
  awaitingChanges,
  variant = "default",
  mobile = false,
}: InputBoxProps) {
  const [value, setValue] = useState("");
  const isPanel = variant === "panel";

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

  const handleInput = (e: ChangeEvent<HTMLTextAreaElement>) => {
    setValue(e.target.value);
    if (mobile) {
      e.target.style.height = "auto";
      e.target.style.height = `${Math.min(e.target.scrollHeight, 120)}px`;
    }
  };

  return (
    <div
      className={`shrink-0 border-t border-surface-border bg-surface ${
        isPanel ? "px-3 py-3" : "px-4 py-4 sm:px-6"
      }`}
    >
      <div className={`flex gap-2 ${isPanel ? "w-full" : "mx-auto max-w-3xl gap-3"}`}>
        <textarea
          value={value}
          onChange={handleInput}
          onKeyDown={handleKeyDown}
          disabled={disabled}
          placeholder={getPlaceholder(phase, awaitingChanges)}
          rows={mobile ? 1 : isPanel ? 2 : 2}
          className={`flex-1 resize-none rounded-lg border border-surface-border bg-surface-raised text-white placeholder-gray-500 outline-none transition focus:border-accent disabled:cursor-not-allowed disabled:opacity-50 ${
            mobile
              ? "min-h-[44px] px-3 py-3 text-base"
              : isPanel
                ? "px-3 py-2 text-xs"
                : "rounded-xl px-4 py-3 text-sm"
          }`}
        />
        <button
          type="button"
          onClick={handleSubmit}
          disabled={disabled || !value.trim()}
          className={`touch-press shrink-0 self-end rounded-lg bg-accent font-semibold text-white transition hover:bg-indigo-600 disabled:cursor-not-allowed disabled:opacity-50 ${
            mobile
              ? "min-h-[44px] min-w-[44px] px-4 py-3 text-sm"
              : isPanel
                ? "px-3 py-2 text-xs"
                : "rounded-xl px-5 py-3 text-sm"
          }`}
        >
          {isLoading ? (
            <span className="inline-block h-3.5 w-3.5 motion-safe:animate-spin rounded-full border-2 border-white border-t-transparent" />
          ) : (
            getButtonLabel(isLoading, phase)
          )}
        </button>
      </div>
    </div>
  );
}
