"use client";

import type { ClarifyingQuestion, ProjectClarifications } from "@/app/lib/agentTypes";

type ClarifyingQuestionsProps = {
  questions: ClarifyingQuestion[];
  answers: ProjectClarifications;
  onAnswer: (questionId: string, value: string) => void;
  onComplete?: () => void;
  disabled?: boolean;
  submitLabel?: string;
};

export default function ClarifyingQuestions({
  questions,
  answers,
  onAnswer,
  onComplete,
  disabled = false,
  submitLabel = "Continue to Build",
}: ClarifyingQuestionsProps) {
  const answeredCount = questions.filter((q) => answers[q.id]?.trim()).length;
  const allAnswered = answeredCount === questions.length;
  const progressPct = questions.length
    ? Math.round((answeredCount / questions.length) * 100)
    : 0;

  return (
    <div
      className="overflow-hidden rounded-xl border border-zinc-800 bg-[#0a0a0a]"
      data-testid="clarifying-questions"
    >
      <div className="border-b border-zinc-800 px-5 py-4">
        <div className="flex items-center justify-between gap-3">
          <div>
            <h3 className="text-sm font-semibold text-white">Quick questions</h3>
            <p className="mt-0.5 text-xs text-zinc-400">
              Answer these while we prepare your plan
            </p>
          </div>
          <span
            className="shrink-0 text-xs tabular-nums text-indigo-400"
            data-testid="clarifying-progress"
          >
            {answeredCount}/{questions.length} answered
          </span>
        </div>
        <div className="mt-3 h-1.5 overflow-hidden rounded-full bg-zinc-800">
          <div
            className="h-full rounded-full bg-indigo-600 transition-all duration-300"
            style={{ width: `${progressPct}%` }}
          />
        </div>
      </div>

      <div className="space-y-5 px-5 py-5">
        {questions.map((q) => (
          <fieldset key={q.id} className="space-y-2.5">
            <legend className="text-sm font-medium text-zinc-300">{q.question}</legend>
            <div className="flex flex-col gap-2 sm:flex-row sm:flex-wrap">
              {q.options.map((option) => {
                const selected = answers[q.id] === option;
                return (
                  <button
                    key={option}
                    type="button"
                    disabled={disabled}
                    onClick={() => onAnswer(q.id, option)}
                    data-testid={`clarifying-option-${q.id}-${option.replace(/\s+/g, "-").toLowerCase()}`}
                    className={`min-h-[44px] w-full rounded-lg border px-4 py-2.5 text-left text-sm transition sm:w-auto ${
                      selected
                        ? "border-indigo-500 bg-indigo-600/15 text-indigo-200"
                        : "border-zinc-700 bg-zinc-900/50 text-zinc-300 hover:border-zinc-600 hover:bg-zinc-800/50"
                    } disabled:cursor-not-allowed disabled:opacity-50`}
                  >
                    {option}
                  </button>
                );
              })}
            </div>
          </fieldset>
        ))}
      </div>

      {onComplete && (
        <div className="border-t border-zinc-800 px-5 py-4">
          <button
            type="button"
            onClick={onComplete}
            disabled={disabled || !allAnswered}
            data-testid="clarifying-submit"
            className="min-h-[44px] w-full rounded-lg bg-indigo-600 px-5 py-2.5 text-sm font-medium text-white transition hover:bg-indigo-500 disabled:cursor-not-allowed disabled:opacity-40 sm:w-auto"
          >
            {submitLabel}
          </button>
        </div>
      )}
    </div>
  );
}
