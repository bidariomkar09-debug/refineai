"use client";

import { useState } from "react";
import type { Iteration } from "@/app/lib/types";
import { TASK_LABELS } from "@/app/lib/types";

type OutputCardProps = {
  iteration: Iteration;
  isFinal: boolean;
};

export default function OutputCard({ iteration, isFinal }: OutputCardProps) {
  const [copied, setCopied] = useState(false);

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(iteration.content);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      setCopied(false);
    }
  };

  const isApproved = isFinal && iteration.score >= 90;

  return (
    <div
      id={`round-${iteration.round}`}
      className={`rounded-xl border p-4 sm:p-5 transition-colors ${
        isApproved
          ? "border-accent-green/60 bg-accent-green/10 shadow-lg shadow-accent-green/5"
          : "border-surface-border bg-surface-raised"
      }`}
    >
      <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
        <div className="flex flex-wrap items-center gap-2">
          <span className="text-sm font-semibold text-white">
            Round {iteration.round}
          </span>
          <span className="rounded-full bg-gray-700/80 px-2.5 py-0.5 text-xs font-medium text-gray-300">
            {TASK_LABELS[iteration.task]}
          </span>
          {isApproved && (
            <span className="rounded-full bg-accent-green/20 px-2.5 py-0.5 text-xs font-medium text-accent-green">
              Approved
            </span>
          )}
        </div>
        <div className="flex items-center gap-2">
          <span
            className={`text-sm font-bold tabular-nums ${
              iteration.score >= 90
                ? "text-accent-green"
                : iteration.score >= 70
                  ? "text-yellow-400"
                  : "text-red-400"
            }`}
          >
            {iteration.score}%
          </span>
          {isApproved && (
            <button
              type="button"
              onClick={handleCopy}
              className="rounded-lg border border-accent-green/40 bg-accent-green/10 px-3 py-1 text-xs font-medium text-accent-green transition hover:bg-accent-green/20"
            >
              {copied ? "Copied!" : "Copy"}
            </button>
          )}
        </div>
      </div>
      <pre className="whitespace-pre-wrap break-words font-sans text-sm leading-relaxed text-gray-200">
        {iteration.content}
      </pre>
    </div>
  );
}
