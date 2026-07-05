"use client";

import type { LoopEngineeringSnapshot } from "@/app/lib/loopEngineeringTypes";
import { LOOP_STEP_LABELS } from "@/app/lib/loopEngineeringTypes";

type LoopEngineeringBarProps = {
  snapshot: LoopEngineeringSnapshot;
};

const STEPS = [1, 2, 3, 4, 5] as const;

function StepNode({
  step,
  isActive,
  isComplete,
  pulse,
  goalPath,
}: {
  step: (typeof STEPS)[number];
  isActive: boolean;
  isComplete: boolean;
  pulse: boolean;
  goalPath: LoopEngineeringSnapshot["goalPath"];
}) {
  const labels = LOOP_STEP_LABELS[step];
  const isStep4 = step === 4;

  let ringClass = "border-surface-border bg-surface-raised text-gray-500";
  if (isActive) {
    if (isStep4 && goalPath === "yes") {
      ringClass = "border-accent-green bg-accent-green/20 text-accent-green";
    } else if (isStep4 && goalPath === "no") {
      ringClass = "border-amber-500 bg-amber-500/20 text-amber-400";
    } else {
      ringClass = "border-accent bg-accent/20 text-accent";
    }
  } else if (isComplete) {
    ringClass = "border-accent-green/50 bg-accent-green/10 text-accent-green";
  }

  return (
    <div
      className={`flex shrink-0 flex-col items-center gap-1 ${pulse ? "motion-safe:animate-step-pulse rounded-lg" : ""}`}
    >
      <div
        className={`flex h-7 w-7 items-center justify-center rounded-full border-2 text-[10px] font-bold sm:h-8 sm:w-8 sm:text-xs ${ringClass}`}
      >
        {step}
      </div>
      <span
        className={`hidden max-w-[4.5rem] text-center text-[9px] leading-tight sm:block sm:text-[10px] ${
          isActive ? "font-medium text-white" : "text-gray-500"
        }`}
      >
        {labels.full}
      </span>
      <span
        className={`max-w-[3rem] text-center text-[9px] leading-tight sm:hidden ${
          isActive ? "font-medium text-white" : "text-gray-500"
        }`}
      >
        {labels.short}
      </span>
      {isStep4 && isActive && goalPath && (
        <span
          className={`text-[9px] font-semibold uppercase ${
            goalPath === "yes" ? "text-accent-green" : "text-amber-400"
          }`}
        >
          {goalPath}
        </span>
      )}
    </div>
  );
}

function Connector({
  fromStep,
  activeStep,
  showLoopBack,
  goalPath,
}: {
  fromStep: number;
  activeStep: number;
  showLoopBack: boolean;
  goalPath: LoopEngineeringSnapshot["goalPath"];
}) {
  const isPast = fromStep < activeStep;
  const isLoopBackEdge = fromStep === 4 && showLoopBack;

  return (
    <div className="relative flex min-w-[1.25rem] flex-1 items-center px-0.5 sm:min-w-[2rem]">
      <div
        className={`h-0.5 w-full rounded-full ${
          isPast ? "bg-accent-green/60" : "bg-surface-border"
        }`}
      />
      {isLoopBackEdge && (
        <span
          className="absolute -top-3 left-1/2 -translate-x-1/2 text-amber-400 motion-safe:animate-loop-back"
          title="Loop back to agent"
        >
          ↺
        </span>
      )}
      {fromStep === 3 && activeStep === 4 && goalPath === "yes" && (
        <span className="absolute -top-3 left-1/2 -translate-x-1/2 text-[9px] text-accent-green">
          ✓
        </span>
      )}
    </div>
  );
}

export default function LoopEngineeringBar({ snapshot }: LoopEngineeringBarProps) {
  if (!snapshot.visible) return null;

  const { activeStep, pulseStep3, showLoopBack, goalPath } = snapshot;

  return (
    <div
      className="shrink-0 border-b border-surface-border bg-surface-raised/80 px-3 py-2.5 backdrop-blur sm:px-4"
      data-testid="loop-engineering-bar"
    >
      <p className="mb-2 text-[10px] font-semibold uppercase tracking-wider text-gray-500">
        Loop Engineering
      </p>
      <div className="flex items-start overflow-x-auto pb-1">
        {STEPS.map((step, idx) => (
          <div key={step} className="flex min-w-0 flex-1 items-start">
            <StepNode
              step={step}
              isActive={activeStep === step}
              isComplete={activeStep > step}
              pulse={step === 3 && pulseStep3 && activeStep === 3}
              goalPath={step === 4 ? goalPath : null}
            />
            {idx < STEPS.length - 1 && (
              <Connector
                fromStep={step}
                activeStep={activeStep}
                showLoopBack={showLoopBack}
                goalPath={goalPath}
              />
            )}
          </div>
        ))}
      </div>
    </div>
  );
}
