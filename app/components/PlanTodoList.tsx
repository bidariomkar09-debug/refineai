"use client";

import type { PlanStep, ProjectPlan } from "@/app/lib/agentTypes";
import type { ExplorerFile } from "@/app/lib/mergeProjectFiles";
import {
  countStepsByStatus,
  getPlanSteps,
  getStepStatus,
  type StepStatus,
} from "@/app/lib/planPresentation";

type PlanTodoListProps = {
  plan: ProjectPlan;
  liveFiles?: ExplorerFile[];
  showProgress?: boolean;
};

function StepIndicator({ status }: { status: StepStatus }) {
  if (status === "done") {
    return (
      <span className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-accent-green/20">
        <svg className="h-3 w-3 text-accent-green" viewBox="0 0 16 16" fill="currentColor">
          <path d="M6.5 11.5L3.5 8.5l1-1 2 2 5-5 1 1-6 6z" />
        </svg>
      </span>
    );
  }

  if (status === "active") {
    return (
      <span className="relative flex h-5 w-5 shrink-0 items-center justify-center">
        <span className="absolute inline-flex h-full w-full motion-safe:animate-ping rounded-full bg-accent opacity-40" />
        <span className="relative h-2.5 w-2.5 rounded-full bg-accent" />
      </span>
    );
  }

  return (
    <span className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full border border-gray-600" />
  );
}

function TodoRow({
  step,
  status,
  isLast,
}: {
  step: PlanStep;
  status: StepStatus;
  isLast: boolean;
}) {
  return (
    <li className="relative flex gap-3">
      {!isLast && (
        <span
          className={`absolute left-[9px] top-6 h-[calc(100%-4px)] w-px ${
            status === "done" ? "bg-accent-green/40" : "bg-surface-border"
          }`}
          aria-hidden="true"
        />
      )}
      <div className="relative z-10 pt-0.5">
        <StepIndicator status={status} />
      </div>
      <div
        className={`min-w-0 flex-1 pb-4 ${
          status === "active"
            ? "text-white"
            : status === "done"
              ? "text-gray-400"
              : "text-gray-300"
        }`}
      >
        <p
          className={`text-sm leading-snug ${
            status === "done" ? "line-through decoration-gray-600" : ""
          }`}
        >
          {step.label}
        </p>
        {status === "active" && (
          <p className="mt-0.5 text-xs text-accent">In progress...</p>
        )}
      </div>
    </li>
  );
}

export default function PlanTodoList({
  plan,
  liveFiles,
  showProgress = false,
}: PlanTodoListProps) {
  const steps = getPlanSteps(plan);
  const { done, total } = countStepsByStatus(steps, liveFiles);

  return (
    <div>
      <div className="mb-3 flex items-center justify-between">
        <p className="text-xs font-semibold uppercase tracking-wider text-gray-500">
          Plan
        </p>
        {showProgress && liveFiles && (
          <span className="text-xs tabular-nums text-gray-500">
            {done}/{total} complete
          </span>
        )}
      </div>
      <ul className="motion-safe:animate-fade-in">
        {steps.map((step, index) => (
          <TodoRow
            key={step.id}
            step={step}
            status={getStepStatus(step, liveFiles)}
            isLast={index === steps.length - 1}
          />
        ))}
      </ul>
    </div>
  );
}
