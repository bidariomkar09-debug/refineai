"use client";

import type { DbFile, FileRoundEvent } from "@/app/lib/agentTypes";
import CodeBlock, { detectLanguage } from "./CodeBlock";

type FileBuilderProps = {
  activeFile: DbFile | null;
  currentCode: string;
  currentRound: FileRoundEvent | null;
  statusMessage: string;
  isOpen: boolean;
  minimized: boolean;
  isBuilding: boolean;
  onClose: () => void;
  onToggleMinimize: () => void;
};

const TASK_LABEL: Record<string, string> = {
  write: "Writing",
  review: "Reviewing",
  refine: "Refining",
};

export default function FileBuilder({
  activeFile,
  currentCode,
  currentRound,
  statusMessage,
  isOpen,
  minimized,
  isBuilding,
  onClose,
  onToggleMinimize,
}: FileBuilderProps) {
  const panelBody = (
    <>
      <div className="flex items-center justify-between border-b border-surface-border px-3 py-2.5">
        <div className="min-w-0 flex-1">
          <h2 className="truncate text-sm font-semibold text-white">
            {activeFile?.file_name ?? "File Builder"}
          </h2>
          {activeFile && (
            <p className="truncate font-mono text-[10px] text-gray-500">{activeFile.file_path}</p>
          )}
        </div>
        <div className="flex shrink-0 items-center gap-1">
          <button
            type="button"
            onClick={onToggleMinimize}
            className="hidden rounded p-1.5 text-gray-400 hover:bg-surface-border hover:text-white lg:block"
            aria-label={minimized ? "Maximize panel" : "Minimize panel"}
          >
            {minimized ? (
              <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 8V4m0 0h4M4 4l5 5m11-1V4m0 0h-4m4 0l-5 5M4 16v4m0 0h4m-4 0l5-5m11 5l-5-5m5 5v-4m0 4h-4" />
              </svg>
            ) : (
              <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M20 12H4" />
              </svg>
            )}
          </button>
          <button
            type="button"
            onClick={onClose}
            className="rounded p-1.5 text-gray-400 hover:bg-surface-border hover:text-white lg:hidden"
            aria-label="Close"
          >
            ✕
          </button>
        </div>
      </div>

      {!minimized && (
        <div className="flex min-h-0 flex-1 flex-col overflow-hidden p-3">
          {statusMessage && (
            <p className="mb-2 text-xs text-gray-500">{statusMessage}</p>
          )}
          {activeFile && currentRound && (
            <div className="mb-2 flex items-center justify-between text-xs">
              <span className="text-gray-400">
                Round {currentRound.round} — {TASK_LABEL[currentRound.task]}
              </span>
              <span className="font-bold text-accent">{currentRound.score}%</span>
            </div>
          )}
          {activeFile && currentRound && (
            <div className="mb-3 h-1.5 overflow-hidden rounded-full bg-gray-800">
              <div
                className="h-full rounded-full bg-accent motion-safe:transition-all duration-500"
                style={{ width: `${currentRound.score}%` }}
              />
            </div>
          )}
          <div className="min-h-0 flex-1 overflow-hidden">
            <CodeBlock
              code={currentCode || activeFile?.content || ""}
              language={activeFile ? detectLanguage(activeFile.file_path) : "typescript"}
              maxHeight="100%"
            />
          </div>
        </div>
      )}
    </>
  );

  const minimizedStrip = (
    <div className="flex h-full flex-col items-center py-3">
      <button
        type="button"
        onClick={onToggleMinimize}
        className="rounded p-2 text-gray-400 hover:bg-surface-border hover:text-white"
        aria-label="Expand panel"
      >
        <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
        </svg>
      </button>
      {isBuilding && (
        <span className="mt-2 flex h-2 w-2 motion-safe:animate-pulse rounded-full bg-accent" />
      )}
    </div>
  );

  return (
    <>
      <aside
        className={`hidden shrink-0 flex-col overflow-hidden border-l border-surface-border bg-surface-raised motion-safe:transition-all duration-300 lg:flex ${
          minimized ? "w-10" : "w-96"
        }`}
      >
        {minimized ? minimizedStrip : panelBody}
      </aside>

      {isOpen && (
        <>
          <div
            className="fixed inset-0 z-40 bg-black/60 lg:hidden"
            onClick={onClose}
            aria-hidden="true"
          />
          <aside className="fixed inset-y-0 right-0 z-50 flex w-full max-w-md flex-col border-l border-surface-border bg-surface-raised lg:hidden">
            {panelBody}
          </aside>
        </>
      )}
    </>
  );
}
