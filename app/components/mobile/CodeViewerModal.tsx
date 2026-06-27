"use client";

import type { DbFile, FileRoundEvent } from "@/app/lib/agentTypes";
import CodeViewer from "@/app/components/CodeViewer";

type CodeViewerModalProps = {
  open: boolean;
  onClose: () => void;
  file: DbFile | null;
  code: string;
  activeFileId: string | null;
  currentRound: FileRoundEvent | null;
  statusMessage?: string;
};

export default function CodeViewerModal({
  open,
  onClose,
  file,
  code,
  activeFileId,
  currentRound,
  statusMessage,
}: CodeViewerModalProps) {
  if (!open || !file) return null;

  return (
    <>
      <button
        type="button"
        aria-label="Close code viewer"
        className="fixed inset-0 z-50 bg-black/80 md:hidden"
        onClick={onClose}
      />
      <div className="fixed inset-0 z-50 flex flex-col bg-surface md:hidden">
        <div className="flex shrink-0 items-center justify-between border-b border-surface-border px-4 py-3 pt-safe">
          <p className="min-w-0 flex-1 truncate text-sm font-medium text-white">{file.file_path}</p>
          <button
            type="button"
            onClick={onClose}
            className="touch-target touch-press ml-2 rounded-lg p-2 text-gray-400 hover:bg-surface-raised"
            aria-label="Close"
          >
            <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>
        <div className="min-h-0 flex-1 overflow-hidden">
          <CodeViewer
            file={file}
            code={code}
            activeFileId={activeFileId}
            currentRound={currentRound}
            statusMessage={statusMessage}
            mobile
          />
        </div>
      </div>
    </>
  );
}
