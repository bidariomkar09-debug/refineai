"use client";

import { useState, useCallback, type KeyboardEvent, type ChangeEvent } from "react";
import type { BuildPhase, ChatMode } from "@/app/lib/agentTypes";
import ModeSwitcher from "./ModeSwitcher";

type InputBoxProps = {
  onSubmit: (text: string) => void;
  disabled: boolean;
  isLoading: boolean;
  phase: BuildPhase;
  awaitingChanges: boolean;
  chatMode: ChatMode;
  onModeChange: (mode: ChatMode) => void;
  variant?: "default" | "panel";
  mobile?: boolean;
  showBuild?: boolean;
  onBuild?: () => void;
  buildDisabled?: boolean;
  onComposerActivity?: (active: boolean) => void;
  initialValue?: string;
};

function getPlaceholder(
  phase: BuildPhase,
  awaitingChanges: boolean,
  chatMode: ChatMode
): string {
  if (chatMode === "ask") return "Ask, @ for context, / for commands";
  if (chatMode === "plan") return "Plan, @ for context, / for commands";
  if (chatMode === "debug") return "Describe the bug or paste an error...";
  if (awaitingChanges) return "Request changes to the plan...";
  if (phase === "building" || phase === "testing") return "Message while building...";
  if (phase === "awaiting_confirm") return "Request plan changes...";
  return "Plan, @ for context, / for commands";
}

function SendIcon({ className }: { className?: string }) {
  return (
    <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M5 10l7-7m0 0l7 7m-7-7v18" />
    </svg>
  );
}

export default function InputBox({
  onSubmit,
  disabled,
  isLoading,
  phase,
  awaitingChanges,
  chatMode,
  onModeChange,
  variant = "default",
  mobile = false,
  showBuild = false,
  onBuild,
  buildDisabled = false,
  onComposerActivity,
  initialValue,
}: InputBoxProps) {
  const [value, setValue] = useState(initialValue?.trim() ?? "");
  const isPanel = variant === "panel";

  const notifyComposer = useCallback(
    (nextValue: string, focused: boolean) => {
      onComposerActivity?.(focused || nextValue.trim().length > 0);
    },
    [onComposerActivity]
  );

  const handleSubmit = useCallback(() => {
    const trimmed = value.trim();
    if (!trimmed || disabled) return;
    onSubmit(trimmed);
    setValue("");
    notifyComposer("", false);
  }, [value, disabled, onSubmit, notifyComposer]);

  const handleKeyDown = (e: KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSubmit();
    }
  };

  const handleInput = (e: ChangeEvent<HTMLTextAreaElement>) => {
    const next = e.target.value;
    setValue(next);
    notifyComposer(next, true);
    if (mobile) {
      e.target.style.height = "auto";
      e.target.style.height = `${Math.min(e.target.scrollHeight, 120)}px`;
    }
  };

  const canSend = !disabled && !isLoading && value.trim().length > 0;

  return (
    <div
      className={`shrink-0 border-t border-surface-border bg-surface ${
        mobile
          ? "shadow-[0_-8px_24px_rgba(0,0,0,0.35)]"
          : ""
      } ${isPanel ? "px-3 py-3" : "px-4 py-4 sm:px-6"}`}
    >
      <div className={`${isPanel ? "w-full" : "mx-auto max-w-3xl"}`}>
        {showBuild && onBuild && (
          <div className="mb-2 flex items-center justify-end gap-2">
            <button
              type="button"
              onClick={onBuild}
              disabled={buildDisabled}
              className="rounded-md bg-indigo-600 px-3 py-1.5 text-xs font-medium text-white transition hover:bg-indigo-500 disabled:cursor-not-allowed disabled:opacity-50"
            >
              Build
            </button>
          </div>
        )}

        <div className="rounded-xl border border-surface-border bg-[#1a1a1a] shadow-lg shadow-black/20">
          <textarea
            value={value}
            onChange={handleInput}
            onFocus={() => notifyComposer(value, true)}
            onBlur={() => notifyComposer(value, false)}
            onKeyDown={handleKeyDown}
            disabled={disabled}
            placeholder={getPlaceholder(phase, awaitingChanges, chatMode)}
            rows={mobile ? 1 : 2}
            className={`w-full resize-none border-0 bg-transparent text-white placeholder-gray-500 outline-none focus:ring-0 disabled:cursor-not-allowed disabled:opacity-50 ${
              mobile
                ? "min-h-[44px] px-3 py-3 text-base"
                : isPanel
                  ? "px-3 py-2.5 text-sm"
                  : "px-4 py-3 text-sm"
            }`}
          />

          <div className="flex items-center justify-between gap-2 px-2 pb-2">
            <ModeSwitcher mode={chatMode} onModeChange={onModeChange} />

            <div className="flex items-center gap-1.5">
              <button
                type="button"
                onClick={handleSubmit}
                disabled={!canSend}
                aria-label="Send message"
                className={`touch-press flex items-center justify-center rounded-full transition disabled:cursor-not-allowed disabled:opacity-30 ${
                  canSend
                    ? "bg-indigo-600 text-white hover:bg-indigo-500"
                    : "bg-white/10 text-gray-300"
                } ${mobile ? "h-9 w-9" : "h-7 w-7"}`}
              >
                {isLoading ? (
                  <span className="inline-block h-3.5 w-3.5 motion-safe:animate-spin rounded-full border-2 border-gray-400 border-t-transparent" />
                ) : (
                  <SendIcon className="h-3.5 w-3.5" />
                )}
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
