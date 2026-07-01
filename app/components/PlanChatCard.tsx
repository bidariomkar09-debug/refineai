"use client";

import type { ProjectPlan } from "@/app/lib/agentTypes";
import {
  estimateBuildMinutes,
  getPlanSteps,
} from "@/app/lib/planPresentation";

type PlanChatCardProps = {
  plan: ProjectPlan;
  compact?: boolean;
};

export default function PlanChatCard({ plan, compact }: PlanChatCardProps) {
  const steps = getPlanSteps(plan);
  const minutes = estimateBuildMinutes(plan.files.length, plan.estimatedMinutes);
  const visibleSteps = steps.slice(0, 6);
  const remaining = steps.length - visibleSteps.length;

  return (
    <div
      className={`mt-2 overflow-hidden rounded-lg border border-amber-500/25 bg-amber-500/5 ${
        compact ? "text-xs" : "text-sm"
      }`}
    >
      <div className="flex items-center justify-between border-b border-amber-500/20 bg-amber-500/10 px-3 py-2">
        <span className="text-[10px] font-semibold uppercase tracking-wider text-amber-400">
          Plan
        </span>
        <span className="text-[10px] tabular-nums text-amber-400/70">
          ~{minutes} min
        </span>
      </div>

      <div className="px-3 py-2.5">
        <p className="font-medium text-white">{plan.name}</p>
        {plan.description && (
          <p className="mt-1 line-clamp-2 text-xs leading-relaxed text-gray-400">
            {plan.description}
          </p>
        )}

        <ul className="mt-3 space-y-2">
          {visibleSteps.map((step) => (
            <li key={step.id} className="flex items-start gap-2.5">
              <span className="mt-0.5 flex h-4 w-4 shrink-0 items-center justify-center rounded-full border border-amber-500/50 bg-amber-500/10">
                <span className="h-1.5 w-1.5 rounded-full bg-amber-400/80" />
              </span>
              <span className="leading-snug text-gray-300">{step.label}</span>
            </li>
          ))}
          {remaining > 0 && (
            <li className="pl-6 text-[10px] text-gray-500">+ {remaining} more steps</li>
          )}
        </ul>

        <p className="mt-3 text-[10px] text-gray-500">
          {steps.length} steps · {plan.files.length} files
        </p>
      </div>
    </div>
  );
}
