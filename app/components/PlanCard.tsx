"use client";

import type { FileStatus, ProjectPlan } from "@/app/lib/agentTypes";
import { meetsQualityThreshold } from "@/app/lib/agentTypes";
import type { ExplorerFile } from "@/app/lib/mergeProjectFiles";
import {
  estimateBuildMinutes,
  formatApiRoutes,
  formatDatabaseTables,
  formatTechStackLine,
  truncateFileList,
} from "@/app/lib/planPresentation";
import FileIcon from "./FileIcon";

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

function statusDot(status: FileStatus, score: number) {
  if (status === "building") return "bg-accent motion-safe:animate-pulse";
  if (status === "done" && meetsQualityThreshold(score)) return "bg-accent-green";
  if (status === "error") return "bg-red-400";
  if (status === "skipped") return "bg-gray-600";
  return "bg-gray-500";
}

function getLiveStatus(path: string, liveFiles?: ExplorerFile[]): ExplorerFile | undefined {
  if (!liveFiles) return undefined;
  const normalized = path.replace(/\\/g, "/");
  return liveFiles.find((f) => f.file_path.replace(/\\/g, "/") === normalized);
}

function SectionLabel({ children }: { children: React.ReactNode }) {
  return (
    <p className="mb-1.5 text-xs font-medium text-gray-400">{children}</p>
  );
}

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
  const { visible: visibleFiles, remaining } = truncateFileList(plan.files, 10);
  const fileCount = plan.files.length;
  const minutes = estimateBuildMinutes(fileCount, plan.estimatedMinutes);
  const dbTables = formatDatabaseTables(plan.databaseSchema);
  const apiLine = formatApiRoutes(plan.apiRoutes);
  const showLiveStatus = variant === "building" || variant === "complete";

  const fadeClass = animate ? "motion-safe:animate-fade-in" : "";

  return (
    <div
      className={`overflow-hidden rounded-xl border border-surface-border bg-surface-raised text-sm shadow-lg shadow-black/20 ${fadeClass}`}
    >
      <div className="border-b border-surface-border px-5 py-4">
        <h3 className="text-base font-bold text-white">
          <span className="mr-1.5" aria-hidden="true">
            🚀
          </span>
          {plan.name}
        </h3>
      </div>

      <div className="space-y-4 px-5 py-4">
        <div>
          <SectionLabel>What I&apos;ll build:</SectionLabel>
          <p className="leading-relaxed text-gray-300">{plan.description}</p>
        </div>

        <div>
          <SectionLabel>Tech Stack:</SectionLabel>
          <p className="text-gray-200">{formatTechStackLine(plan.techStack)}</p>
        </div>

        <div>
          <SectionLabel>
            Files I&apos;ll create: ({fileCount} file{fileCount === 1 ? "" : "s"})
          </SectionLabel>
          <ul className="space-y-1">
            {visibleFiles.map((f) => {
              const live = getLiveStatus(f.path, showLiveStatus ? liveFiles : undefined);
              const status = live?.status ?? "pending";
              const score = live?.score ?? 0;
              const isActive = status === "building";

              return (
                <li
                  key={f.path}
                  className={`flex items-start gap-2 rounded-lg px-2 py-1.5 transition-colors duration-200 ${
                    isActive
                      ? "border border-accent/20 bg-accent/5"
                      : status === "done"
                        ? "bg-accent-green/5"
                        : ""
                  }`}
                >
                  {showLiveStatus && live ? (
                    <span
                      className={`mt-1.5 h-2 w-2 shrink-0 rounded-full ${statusDot(status, score)}`}
                    />
                  ) : (
                    <FileIcon filePath={f.path} className="mt-0.5 h-3.5 w-3.5 shrink-0" />
                  )}
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center justify-between gap-2">
                      <span className="truncate text-gray-200">
                        <span className="font-mono text-[11px] text-gray-400">{f.path}</span>
                        <span className="mx-1.5 text-gray-600">—</span>
                        <span className="text-xs text-gray-300">{f.purpose}</span>
                      </span>
                      {live && live.score > 0 && status === "done" && (
                        <span className="shrink-0 text-xs font-semibold text-accent-green">
                          {live.score}%
                        </span>
                      )}
                    </div>
                  </div>
                </li>
              );
            })}
            {remaining > 0 && (
              <li className="px-2 py-1 text-xs text-gray-500">... and {remaining} more</li>
            )}
          </ul>
        </div>

        {dbTables && (
          <div>
            <SectionLabel>Database:</SectionLabel>
            <p className="text-gray-200">{dbTables}</p>
          </div>
        )}

        {apiLine && (
          <div>
            <SectionLabel>API Routes:</SectionLabel>
            <p className="font-mono text-xs text-gray-300">{apiLine}</p>
          </div>
        )}
      </div>

      {variant !== "complete" && (
        <div className="border-t border-surface-border px-5 py-3">
          <p className="text-xs text-gray-400">
            Estimated time: ~{minutes} minute{minutes === 1 ? "" : "s"}
          </p>
        </div>
      )}

      {showActions && onConfirm && onMakeChanges && (
        <div className="flex flex-wrap gap-3 border-t border-surface-border px-5 py-4">
          <button
            type="button"
            onClick={onConfirm}
            disabled={confirmDisabled}
            className="rounded-xl bg-accent-green px-5 py-2.5 text-sm font-semibold text-white transition hover:bg-green-600 disabled:cursor-not-allowed disabled:opacity-50"
          >
            🔨 Start Building
          </button>
          <button
            type="button"
            onClick={onMakeChanges}
            disabled={confirmDisabled}
            className="rounded-xl border border-surface-border bg-surface px-5 py-2.5 text-sm font-medium text-gray-300 transition hover:border-gray-600 hover:text-white disabled:cursor-not-allowed disabled:opacity-50"
          >
            ✏️ Make Changes
          </button>
        </div>
      )}
    </div>
  );
}
