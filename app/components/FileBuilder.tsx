"use client";

import type { DbFile, FileRoundEvent } from "@/app/lib/agentTypes";
import CodeBlock, { detectLanguage } from "./CodeBlock";
import FileTree from "./FileTree";

type FileBuilderProps = {
  files: DbFile[];
  activeFile: DbFile | null;
  currentCode: string;
  currentRound: FileRoundEvent | null;
  statusMessage: string;
  isOpen: boolean;
  onClose: () => void;
  onSelectFile: (file: DbFile) => void;
};

const TASK_LABEL: Record<string, string> = {
  write: "Writing",
  review: "Reviewing",
  refine: "Refining",
};

export default function FileBuilder({
  files,
  activeFile,
  currentCode,
  currentRound,
  statusMessage,
  isOpen,
  onClose,
  onSelectFile,
}: FileBuilderProps) {
  const panel = (
    <div className="flex h-full flex-col">
      <div className="flex items-center justify-between border-b border-surface-border px-4 py-3">
        <h2 className="text-sm font-semibold text-white">File Builder</h2>
        <button
          type="button"
          onClick={onClose}
          className="text-gray-400 hover:text-white md:hidden"
          aria-label="Close"
        >
          ✕
        </button>
      </div>

      <div className="border-b border-surface-border p-3">
        <p className="mb-2 text-xs text-gray-500">{statusMessage}</p>
        {activeFile && (
          <div className="mb-2">
            <p className="font-mono text-xs text-accent">{activeFile.file_path}</p>
            {currentRound && (
              <p className="mt-1 text-xs text-gray-400">
                Round {currentRound.round} — {TASK_LABEL[currentRound.task]} —{" "}
                <span className="font-bold text-white">{currentRound.score}%</span>
              </p>
            )}
          </div>
        )}
        <CodeBlock
          code={currentCode || activeFile?.content || ""}
          language={activeFile ? detectLanguage(activeFile.file_path) : "typescript"}
          maxHeight="280px"
        />
      </div>

      <div className="flex-1 overflow-y-auto p-3">
        <p className="mb-2 text-xs font-semibold uppercase tracking-wider text-gray-500">
          All Files
        </p>
        <FileTree
          files={files}
          activeFileId={activeFile?.id ?? null}
          onSelect={onSelectFile}
        />
      </div>
    </div>
  );

  return (
    <>
      <aside className="hidden h-full w-96 shrink-0 border-l border-surface-border bg-surface-raised lg:flex lg:flex-col">
        {panel}
      </aside>

      {isOpen && (
        <>
          <div
            className="fixed inset-0 z-40 bg-black/60 lg:hidden"
            onClick={onClose}
            aria-hidden="true"
          />
          <aside className="fixed inset-y-0 right-0 z-50 w-full max-w-md border-l border-surface-border bg-surface-raised lg:hidden">
            {panel}
          </aside>
        </>
      )}
    </>
  );
}
