"use client";

import type { ExplorerFile } from "@/app/lib/mergeProjectFiles";
import { meetsQualityThreshold } from "@/app/lib/agentTypes";
import FileIcon from "./FileIcon";
import { USER_MESSAGES } from "@/app/lib/userMessages";

type BuildChecklistProps = {
  files: ExplorerFile[];
  activeFileId: string | null;
};

function StatusIndicator({
  file,
  isActive,
}: {
  file: ExplorerFile;
  isActive: boolean;
}) {
  if (file.status === "building" || isActive) {
    return (
      <span className="relative flex h-2.5 w-2.5 shrink-0">
        <span className="absolute inline-flex h-full w-full motion-safe:animate-ping rounded-full bg-accent opacity-60" />
        <span className="relative inline-flex h-2.5 w-2.5 rounded-full bg-accent" />
      </span>
    );
  }
  if (file.status === "done" && meetsQualityThreshold(file.score)) {
    return (
      <svg className="h-4 w-4 shrink-0 text-accent-green" viewBox="0 0 16 16" fill="currentColor">
        <path d="M6.5 11.5L3.5 8.5l1-1 2 2 5-5 1 1-6 6z" />
      </svg>
    );
  }
  if (file.status === "error") {
    return <span className="h-2.5 w-2.5 shrink-0 rounded-full bg-red-400" />;
  }
  if (file.status === "skipped") {
    return <span className="text-[10px] text-gray-600">skip</span>;
  }
  return <span className="h-2.5 w-2.5 shrink-0 rounded-full bg-gray-600" />;
}

export default function BuildChecklist({ files, activeFileId }: BuildChecklistProps) {
  if (files.length === 0) return null;

  const doneCount = files.filter((f) => f.status === "done").length;

  return (
    <div className="rounded-xl border border-surface-border bg-surface-raised/50 p-4">
      <div className="mb-3 flex items-center justify-between">
        <div>
          <p className="text-xs font-semibold uppercase tracking-wider text-gray-500">
            Building your project
          </p>
          <p className="mt-0.5 text-[10px] text-gray-600">{USER_MESSAGES.qualityTarget}</p>
        </div>
        <span className="text-xs tabular-nums text-gray-400">
          {doneCount}/{files.length} files
        </span>
      </div>
      <ul className="space-y-1.5">
        {files.map((file) => {
          const isActive = file.id === activeFileId || file.status === "building";
          return (
            <li
              key={file.id}
              className={`flex items-center gap-2 rounded-lg px-2.5 py-2 text-xs transition-colors duration-200 ${
                isActive
                  ? "border border-accent/30 bg-accent/10"
                  : file.status === "done"
                    ? "bg-accent-green/5"
                    : "bg-surface/40"
              }`}
            >
              <StatusIndicator file={file} isActive={isActive} />
              <FileIcon filePath={file.file_path} className="h-3.5 w-3.5 shrink-0" />
              <span
                className={`min-w-0 flex-1 truncate font-mono ${
                  file.status === "done"
                    ? "text-gray-200"
                    : isActive
                      ? "text-accent"
                      : "text-gray-500"
                }`}
              >
                {file.file_path}
              </span>
              {file.status === "done" && file.score > 0 && (
                <span
                  className={`shrink-0 font-semibold tabular-nums ${
                    meetsQualityThreshold(file.score)
                      ? "text-accent-green"
                      : "text-amber-400"
                  }`}
                >
                  {file.score}%
                </span>
              )}
              {isActive && file.status === "building" && (
                <span className="shrink-0 text-[10px] text-accent">building</span>
              )}
            </li>
          );
        })}
      </ul>
    </div>
  );
}
