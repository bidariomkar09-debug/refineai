"use client";

import { useState } from "react";
import type { ProjectPlan } from "@/app/lib/agentTypes";
import type { ExplorerFile } from "@/app/lib/mergeProjectFiles";
import {
  estimateBuildMinutes,
  formatApiRoutes,
  formatDatabaseTables,
  formatTechStackLine,
  truncateFileList,
} from "@/app/lib/planPresentation";
import FileIcon from "./FileIcon";
import PlanTodoList from "./PlanTodoList";

type PlanCardVariant = "plan" | "building" | "complete";

type PlanCardProps = {
  plan: ProjectPlan;
  liveFiles?: ExplorerFile[];
  variant?: PlanCardVariant;
  showActions?: boolean;
  onConfirm?: () => void;
  onMakeChanges?: () => void;
  confirmDisabled?: boolean;
  animate?: boolean;
};

export default function PlanCard({
  plan,
  liveFiles,
  variant = "plan",
  showActions = false,
  onConfirm,
  onMakeChanges,
  confirmDisabled = false,
  animate = true,
}: PlanCardProps) {
  const [detailsOpen, setDetailsOpen] = useState(false);
  const { visible: visibleFiles, remaining } = truncateFileList(plan.files, 8);
  const fileCount = plan.files.length;
  const minutes = estimateBuildMinutes(fileCount, plan.estimatedMinutes);
  const dbTables = formatDatabaseTables(plan.databaseSchema);
  const apiLine = formatApiRoutes(plan.apiRoutes);
  const showLiveProgress = variant === "building" || variant === "complete";

  const fadeClass = animate ? "motion-safe:animate-fade-in" : "";

  return (
    <div
      className={`overflow-hidden rounded-xl border border-surface-border bg-surface-raised text-sm shadow-lg shadow-black/20 ${fadeClass}`}
    >
      <div className="border-b border-surface-border px-5 py-3.5">
        <h3 className="text-sm font-semibold text-white">{plan.name}</h3>
        <p className="mt-1 text-xs leading-relaxed text-gray-400">{plan.description}</p>
      </div>

      <div className="px-5 py-4">
        <PlanTodoList
          plan={plan}
          liveFiles={showLiveProgress ? liveFiles : undefined}
          showProgress={showLiveProgress}
        />
      </div>

      <div className="border-t border-surface-border px-5 py-2">
        <button
          type="button"
          onClick={() => setDetailsOpen((v) => !v)}
          className="flex w-full items-center gap-2 py-2 text-left text-xs text-gray-500 transition hover:text-gray-300"
        >
          <svg
            className={`h-3 w-3 shrink-0 transition-transform ${detailsOpen ? "rotate-90" : ""}`}
            viewBox="0 0 16 16"
            fill="currentColor"
          >
            <path d="M6 4l4 4-4 4V4z" />
          </svg>
          Technical details
          <span className="text-gray-600">
            · {fileCount} files
            {dbTables ? " · database" : ""}
          </span>
        </button>

        {detailsOpen && (
          <div className="space-y-3 border-t border-surface-border/50 pb-3 pt-3 motion-safe:animate-fade-in">
            <div>
              <p className="mb-1 text-[10px] font-medium uppercase tracking-wider text-gray-600">
                Tech stack
              </p>
              <p className="text-xs text-gray-400">{formatTechStackLine(plan.techStack)}</p>
            </div>

            <div>
              <p className="mb-1.5 text-[10px] font-medium uppercase tracking-wider text-gray-600">
                Files
              </p>
              <ul className="space-y-1">
                {visibleFiles.map((f) => (
                  <li key={f.path} className="flex items-center gap-2 text-xs text-gray-500">
                    <FileIcon filePath={f.path} className="h-3 w-3 shrink-0 opacity-70" />
                    <span className="truncate font-mono text-[10px]">{f.path}</span>
                  </li>
                ))}
                {remaining > 0 && (
                  <li className="text-[10px] text-gray-600">... and {remaining} more</li>
                )}
              </ul>
            </div>

            {dbTables && (
              <div>
                <p className="mb-1 text-[10px] font-medium uppercase tracking-wider text-gray-600">
                  Database
                </p>
                <p className="text-xs text-gray-400">{dbTables}</p>
              </div>
            )}

            {apiLine && (
              <div>
                <p className="mb-1 text-[10px] font-medium uppercase tracking-wider text-gray-600">
                  API routes
                </p>
                <p className="font-mono text-[10px] text-gray-400">{apiLine}</p>
              </div>
            )}
          </div>
        )}
      </div>

      {variant !== "complete" && (
        <div className="border-t border-surface-border px-5 py-3">
          <p className="text-xs text-gray-500">
            Estimated time: ~{minutes} minute{minutes === 1 ? "" : "s"}
          </p>
        </div>
      )}

      {showActions && onConfirm && onMakeChanges && (
        <div className="flex flex-col gap-3 border-t border-surface-border px-5 py-4 sm:flex-row sm:flex-wrap">
          <button
            type="button"
            onClick={onConfirm}
            disabled={confirmDisabled}
            className="min-h-[44px] w-full rounded-lg bg-white px-5 py-2 text-sm font-medium text-gray-900 transition hover:bg-gray-100 disabled:cursor-not-allowed disabled:opacity-50 sm:w-auto"
          >
            Build
          </button>
          <button
            type="button"
            onClick={onMakeChanges}
            disabled={confirmDisabled}
            className="min-h-[44px] w-full rounded-lg border border-surface-border px-5 py-2 text-sm font-medium text-gray-300 transition hover:border-gray-500 hover:text-white disabled:cursor-not-allowed disabled:opacity-50 sm:w-auto"
          >
            Edit plan
          </button>
        </div>
      )}
    </div>
  );
}
