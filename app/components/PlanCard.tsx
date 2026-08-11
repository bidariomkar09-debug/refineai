"use client";

import { useState } from "react";
import type { ProjectPlan, ProjectClarifications, VisualPlanArtifacts } from "@/app/lib/agentTypes";
import type { ExplorerFile } from "@/app/lib/mergeProjectFiles";
import {
  estimateBuildMinutes,
  formatApiRoutes,
  formatDatabaseTables,
  formatTechStackLine,
  truncateFileList,
} from "@/app/lib/planPresentation";
import { formatClarificationPrefs } from "@/app/lib/visualPlanEngine";
import FileIcon from "./FileIcon";
import PlanTodoList from "./PlanTodoList";

type PlanCardVariant = "plan" | "building" | "complete" | "visual";

type PlanCardProps = {
  plan: ProjectPlan;
  liveFiles?: ExplorerFile[];
  variant?: PlanCardVariant;
  visualPlan?: VisualPlanArtifacts;
  clarifications?: ProjectClarifications;
  showActions?: boolean;
  onConfirm?: () => void;
  onMakeChanges?: () => void;
  confirmDisabled?: boolean;
  animate?: boolean;
  clarificationsComplete?: boolean;
};

function PrefCheck({ label }: { label: string }) {
  return (
    <span className="inline-flex items-center gap-1.5 rounded-full border border-zinc-700 bg-zinc-900/60 px-2.5 py-1 text-xs text-zinc-300">
      <svg className="h-3 w-3 text-indigo-400" viewBox="0 0 16 16" fill="currentColor">
        <path d="M6.5 11.5L3.5 8.5l1-1 2 2 5-5 1 1-6 6z" />
      </svg>
      {label}
    </span>
  );
}

export default function PlanCard({
  plan,
  liveFiles,
  variant = "plan",
  visualPlan,
  clarifications,
  showActions = false,
  onConfirm,
  onMakeChanges,
  confirmDisabled = false,
  animate = true,
  clarificationsComplete = true,
}: PlanCardProps) {
  const [detailsOpen, setDetailsOpen] = useState(false);
  const { visible: visibleFiles, remaining } = truncateFileList(plan.files, 8);
  const fileCount = plan.files.length;
  const minutes = estimateBuildMinutes(fileCount, plan.estimatedMinutes);
  const dbTables = formatDatabaseTables(plan.databaseSchema);
  const apiLine = formatApiRoutes(plan.apiRoutes);
  const showLiveProgress = variant === "building" || variant === "complete";
  const isVisual = variant === "visual" || Boolean(visualPlan);
  const prefs = visualPlan?.clarifications ?? clarifications;
  const prefLabels = prefs ? formatClarificationPrefs(prefs) : [];

  const fadeClass = animate ? "motion-safe:animate-fade-in" : "";
  const actionsEnabled = showActions && clarificationsComplete && !confirmDisabled;

  return (
    <div
      className={`overflow-hidden rounded-xl border border-zinc-800 bg-[#0a0a0a] text-sm shadow-lg shadow-black/20 ${fadeClass}`}
      data-testid="plan-card"
    >
      <div className="border-b border-zinc-800 px-5 py-4">
        <p className="text-[10px] font-medium uppercase tracking-wider text-zinc-500">
          {isVisual ? "What We're Building" : "Project Plan"}
        </p>
        <h3 className="mt-1 text-base font-semibold text-white">
          {visualPlan?.headline ?? plan.name}
        </h3>
        {!isVisual && (
          <p className="mt-1 text-xs leading-relaxed text-zinc-400">{plan.description}</p>
        )}
      </div>

      {isVisual && visualPlan && (
        <div className="space-y-0 divide-y divide-zinc-800">
          <section className="px-5 py-4" data-testid="plan-outcomes">
            <h4 className="mb-2.5 text-xs font-medium uppercase tracking-wider text-zinc-400">
              What you&apos;ll get
            </h4>
            <ul className="space-y-1.5">
              {visualPlan.outcomeBullets.map((bullet) => (
                <li key={bullet} className="flex items-start gap-2 text-sm text-zinc-300">
                  <span className="mt-1.5 h-1.5 w-1.5 shrink-0 rounded-full bg-indigo-500" />
                  {bullet}
                </li>
              ))}
            </ul>
          </section>

          {prefLabels.length > 0 && variant === "visual" && (
            <section className="px-5 py-4" data-testid="plan-prefs">
              <h4 className="mb-2.5 text-xs font-medium uppercase tracking-wider text-zinc-400">
                Your choices
              </h4>
              <div className="flex flex-wrap gap-2">
                {prefLabels.map((pref) => (
                  <PrefCheck key={pref} label={pref} />
                ))}
              </div>
            </section>
          )}

          <section className="px-5 py-4" data-testid="plan-flowchart">
            <h4 className="mb-2.5 text-xs font-medium uppercase tracking-wider text-zinc-400">
              How it&apos;s structured
            </h4>
            <pre className="overflow-x-auto whitespace-pre font-mono text-xs leading-relaxed text-indigo-400">
              {visualPlan.flowchart}
            </pre>
          </section>

          <section className="px-5 py-4" data-testid="plan-plain-english">
            <h4 className="mb-2.5 text-xs font-medium uppercase tracking-wider text-zinc-400">
              In plain English
            </h4>
            <p className="text-sm leading-relaxed text-zinc-300">{visualPlan.plainEnglish}</p>
          </section>

          <section className="px-5 py-4" data-testid="plan-deliverables">
            <h4 className="mb-2.5 text-xs font-medium uppercase tracking-wider text-zinc-400">
              What we&apos;ll build
            </h4>
            <ol className="space-y-1.5">
              {visualPlan.deliverables.map((item, i) => (
                <li key={item} className="flex items-start gap-2.5 text-sm text-zinc-300">
                  <span className="mt-0.5 shrink-0 tabular-nums text-indigo-400">{i + 1}.</span>
                  {item}
                </li>
              ))}
            </ol>
          </section>

          <section className="px-5 py-4" data-testid="plan-build-steps">
            <h4 className="mb-2.5 text-xs font-medium uppercase tracking-wider text-zinc-400">
              When you click Build
            </h4>
            <ul className="space-y-1 text-sm text-zinc-400">
              {visualPlan.buildSteps.map((step) => (
                <li key={step} className="flex items-start gap-2">
                  <span className="text-indigo-500">→</span>
                  {step}
                </li>
              ))}
            </ul>
          </section>
        </div>
      )}

      {!isVisual && (
        <div className="px-5 py-4">
          <PlanTodoList
            plan={plan}
            liveFiles={showLiveProgress ? liveFiles : undefined}
            showProgress={showLiveProgress}
          />
        </div>
      )}

      <div className="border-t border-zinc-800 px-5 py-2">
        <button
          type="button"
          onClick={() => setDetailsOpen((v) => !v)}
          className="flex w-full items-center gap-2 py-2 text-left text-xs text-zinc-500 transition hover:text-zinc-300"
        >
          <svg
            className={`h-3 w-3 shrink-0 transition-transform ${detailsOpen ? "rotate-90" : ""}`}
            viewBox="0 0 16 16"
            fill="currentColor"
          >
            <path d="M6 4l4 4-4 4V4z" />
          </svg>
          Technical details
          <span className="text-zinc-600">
            · {fileCount} files
            {dbTables ? " · database" : ""}
          </span>
        </button>

        {detailsOpen && (
          <div className="space-y-3 border-t border-zinc-800/50 pb-3 pt-3 motion-safe:animate-fade-in">
            <div>
              <p className="mb-1 text-[10px] font-medium uppercase tracking-wider text-zinc-600">
                Tech stack
              </p>
              <p className="text-xs text-zinc-400">{formatTechStackLine(plan.techStack)}</p>
            </div>

            <div>
              <p className="mb-1.5 text-[10px] font-medium uppercase tracking-wider text-zinc-600">
                Files
              </p>
              <ul className="space-y-1">
                {visibleFiles.map((f) => (
                  <li key={f.path} className="flex items-center gap-2 text-xs text-zinc-500">
                    <FileIcon filePath={f.path} className="h-3 w-3 shrink-0 opacity-70" />
                    <span className="truncate font-mono text-[10px]">{f.path}</span>
                  </li>
                ))}
                {remaining > 0 && (
                  <li className="text-[10px] text-zinc-600">... and {remaining} more</li>
                )}
              </ul>
            </div>

            {dbTables && (
              <div>
                <p className="mb-1 text-[10px] font-medium uppercase tracking-wider text-zinc-600">
                  Database
                </p>
                <p className="text-xs text-zinc-400">{dbTables}</p>
              </div>
            )}

            {apiLine && (
              <div>
                <p className="mb-1 text-[10px] font-medium uppercase tracking-wider text-zinc-600">
                  API routes
                </p>
                <p className="font-mono text-[10px] text-zinc-400">{apiLine}</p>
              </div>
            )}
          </div>
        )}
      </div>

      {variant !== "complete" && !isVisual && (
        <div className="border-t border-zinc-800 px-5 py-3">
          <p className="text-xs text-zinc-500">
            Estimated time: ~{minutes} minute{minutes === 1 ? "" : "s"}
          </p>
        </div>
      )}

      {showActions && onConfirm && onMakeChanges && (
        <div className="flex flex-col gap-3 border-t border-zinc-800 px-5 py-4 sm:flex-row sm:flex-wrap">
          <button
            type="button"
            onClick={onConfirm}
            disabled={!actionsEnabled}
            data-testid="build-plan-button"
            className="min-h-[44px] w-full rounded-lg bg-indigo-600 px-5 py-2 text-sm font-medium text-white transition hover:bg-indigo-500 disabled:cursor-not-allowed disabled:opacity-50 sm:w-auto"
          >
            Build Plan
          </button>
          <button
            type="button"
            onClick={onMakeChanges}
            disabled={confirmDisabled}
            data-testid="make-changes-button"
            className="min-h-[44px] w-full rounded-lg border border-zinc-700 bg-zinc-800/50 px-5 py-2 text-sm font-medium text-zinc-300 transition hover:border-zinc-600 hover:text-white disabled:cursor-not-allowed disabled:opacity-50 sm:w-auto"
          >
            Make Changes
          </button>
        </div>
      )}
    </div>
  );
}
