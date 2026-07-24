"use client";

import { useState } from "react";
import type { BuildPhase, FileRoundEvent, ProjectPlan } from "@/app/lib/agentTypes";
import type { ExplorerFile } from "@/app/lib/mergeProjectFiles";
import {
  countStepsByStatus,
  estimateBuildMinutes,
  getPlanSteps,
  getStepStatus,
  type StepStatus,
} from "@/app/lib/planPresentation";

type PlanChatCardProps = {
  plan: ProjectPlan;
  compact?: boolean;
  live?: boolean;
  liveFiles?: ExplorerFile[];
  phase?: BuildPhase;
  statusMessage?: string;
  currentRound?: FileRoundEvent | null;
  activeFileName?: string | null;
  onPause?: () => void;
  onSkip?: () => void;
  defaultExpanded?: boolean;
};

function StepIndicator({ status }: { status: StepStatus }) {
  if (status === "done") {
    return (
      <span className="flex h-4 w-4 shrink-0 items-center justify-center rounded-full bg-accent-green/20">
        <svg className="h-2.5 w-2.5 text-accent-green" viewBox="0 0 16 16" fill="currentColor">
          <path d="M6.5 11.5L3.5 8.5l1-1 2 2 5-5 1 1-6 6z" />
        </svg>
      </span>
    );
  }
  if (status === "active") {
    return (
      <span className="relative flex h-4 w-4 shrink-0 items-center justify-center">
        <span className="absolute inline-flex h-full w-full motion-safe:animate-ping rounded-full bg-accent opacity-40" />
        <span className="relative h-2 w-2 rounded-full bg-accent" />
      </span>
    );
  }
  return (
    <span className="flex h-4 w-4 shrink-0 items-center justify-center rounded-full border border-gray-600" />
  );
}

export default function PlanChatCard({
  plan,
  compact,
  live = false,
  liveFiles,
  phase,
  statusMessage,
  currentRound,
  activeFileName,
  onPause,
  onSkip,
  defaultExpanded,
}: PlanChatCardProps) {
  const isBuilding = phase === "building" || phase === "testing";
  const steps = getPlanSteps(plan);
  const minutes = estimateBuildMinutes(plan.files?.length ?? 0, plan.estimatedMinutes);
  const { done, total } = countStepsByStatus(steps, liveFiles);
  const [expanded, setExpanded] = useState(
    defaultExpanded ?? !(live && isBuilding)
  );

  const activeStep = steps.find((s) => getStepStatus(s, liveFiles) === "active");
  const statusLine = isBuilding
    ? [
        statusMessage ||
          (activeFileName ? `Building ${activeFileName}` : activeStep?.label) ||
          "Building...",
        currentRound ? `R${currentRound.round}` : null,
        currentRound?.score != null ? `${currentRound.score}%` : null,
      ]
        .filter(Boolean)
        .join(" · ")
    : null;

  return (
    <div
      className={`mt-2 overflow-hidden rounded-xl border border-indigo-500/25 bg-[#12121a] ${
        compact ? "text-xs" : "text-sm"
      }`}
    >
      <button
        type="button"
        onClick={() => setExpanded((v) => !v)}
        className="flex w-full items-center justify-between gap-2 px-3 py-2.5 text-left transition hover:bg-white/[0.03]"
        aria-expanded={expanded}
      >
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-2">
            <span className="truncate font-medium text-white">{plan.name}</span>
            {live && liveFiles && (
              <span className="shrink-0 rounded-full bg-indigo-500/15 px-2 py-0.5 text-[10px] tabular-nums text-indigo-300">
                {done}/{total} done
              </span>
            )}
          </div>
          {!expanded && activeStep && (
            <p className="mt-0.5 truncate text-[11px] text-indigo-300">
              {activeStep.label}
            </p>
          )}
          {!expanded && !activeStep && plan.description && (
            <p className="mt-0.5 line-clamp-1 text-[11px] text-gray-500">
              {plan.description}
            </p>
          )}
        </div>
        <div className="flex shrink-0 items-center gap-2">
          {!live && (
            <span className="text-[10px] tabular-nums text-gray-500">~{minutes}m</span>
          )}
          <svg
            className={`h-4 w-4 text-gray-400 transition-transform ${expanded ? "rotate-180" : ""}`}
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
            strokeWidth={2}
          >
            <path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7" />
          </svg>
        </div>
      </button>

      {expanded && (
        <div className="border-t border-white/5 px-3 py-2.5">
          {plan.description && (
            <p className="mb-3 line-clamp-2 text-[11px] leading-relaxed text-gray-400">
              {plan.description}
            </p>
          )}
          <ul className="space-y-2">
            {steps.map((step) => {
              const status = getStepStatus(step, liveFiles);
              return (
                <li key={step.id} className="flex items-start gap-2.5">
                  <StepIndicator status={status} />
                  <span
                    className={`leading-snug ${
                      status === "done"
                        ? "text-gray-500 line-through decoration-gray-600"
                        : status === "active"
                          ? "font-medium text-white"
                          : "text-gray-300"
                    }`}
                  >
                    {step.label}
                  </span>
                </li>
              );
            })}
          </ul>
          {!live && (
            <p className="mt-3 text-[10px] text-gray-500">
              {steps.length} steps · {plan.files?.length ?? 0} files · ~{minutes} min
            </p>
          )}
        </div>
      )}

      {live && statusLine && (
        <div className="flex items-center gap-2 border-t border-white/5 bg-white/[0.02] px-3 py-2">
          <span className="relative flex h-2 w-2 shrink-0">
            <span className="absolute inline-flex h-full w-full motion-safe:animate-ping rounded-full bg-accent opacity-50" />
            <span className="relative h-2 w-2 rounded-full bg-accent" />
          </span>
          <p className="min-w-0 flex-1 truncate text-[11px] text-gray-400">{statusLine}</p>
          {onPause && (
            <button
              type="button"
              onClick={onPause}
              className="touch-target touch-press shrink-0 rounded-md px-2 py-1 text-[10px] font-medium text-gray-300 hover:bg-white/5 hover:text-white"
              aria-label="Pause build"
            >
              Pause
            </button>
          )}
          {onSkip && (
            <button
              type="button"
              onClick={onSkip}
              className="touch-target touch-press shrink-0 rounded-md px-2 py-1 text-[10px] font-medium text-gray-300 hover:bg-white/5 hover:text-white"
              aria-label="Skip file"
            >
              Skip
            </button>
          )}
        </div>
      )}
    </div>
  );
}
