"use client";

import type { ExplorerFile } from "@/app/lib/mergeProjectFiles";
import FileExplorer from "./FileExplorer";

type SidebarProps = {
  mergedFiles: ExplorerFile[];
  selectedFileId: string | null;
  activeFileId: string | null;
  isOpen: boolean;
  onClose: () => void;
  onNewProject: () => void;
  onSelectFile: (file: ExplorerFile) => void;
  tabletExpanded?: boolean;
  onTabletExpand?: () => void;
};

export function SidebarContent({
  mergedFiles,
  selectedFileId,
  activeFileId,
  onClose,
  onNewProject,
  onSelectFile,
}: Omit<SidebarProps, "isOpen" | "tabletExpanded" | "onTabletExpand">) {
  return (
    <div className="flex h-full flex-col">
      <div className="shrink-0 border-b border-surface-border px-3 py-3">
        <h1 className="text-base font-bold text-white">RefineAI</h1>
        <p className="mb-2 text-[10px] text-gray-500">AI Coding Agent</p>
        <button
          type="button"
          onClick={() => {
            onNewProject();
            onClose();
          }}
          className="min-h-[44px] w-full rounded-xl bg-accent px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-indigo-600"
        >
          + New Project
        </button>
      </div>

      <div className="flex min-h-0 flex-1 flex-col">
        <div className="shrink-0 px-3 py-1.5">
          <h2 className="text-[10px] font-semibold uppercase tracking-wider text-gray-500">
            Explorer
          </h2>
        </div>
        <div className="min-h-0 flex-1 overflow-y-auto px-1">
          <FileExplorer
            files={mergedFiles}
            selectedFileId={selectedFileId}
            activeFileId={activeFileId}
            onSelectFile={onSelectFile}
          />
        </div>
      </div>
    </div>
  );
}

export default function Sidebar(props: SidebarProps) {
  const { isOpen, onClose, tabletExpanded, onTabletExpand, ...contentProps } = props;

  return (
    <>
      {/* Desktop lg+ full sidebar */}
      <aside className="hidden h-full w-72 shrink-0 border-r border-surface-border bg-surface-raised lg:flex lg:flex-col">
        <SidebarContent {...contentProps} onClose={onClose} />
      </aside>

      {/* Tablet md–lg icon rail */}
      <aside className="hidden h-full w-[60px] shrink-0 flex-col items-center border-r border-surface-border bg-surface-raised py-3 md:flex lg:hidden">
        <button
          type="button"
          onClick={onTabletExpand}
          className="touch-target touch-press mb-3 rounded-lg p-2 text-accent hover:bg-surface-border"
          aria-label="Expand file explorer"
        >
          <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M2.25 12.75V6A2.25 2.25 0 014.5 3.75h4.318a2.25 2.25 0 011.591.659l1.182 1.182A2.25 2.25 0 0015.318 6H19.5A2.25 2.25 0 0121.75 8.25v9.5A2.25 2.25 0 0119.5 20.25H4.5A2.25 2.25 0 012.25 18V12.75z" />
          </svg>
        </button>
        <button
          type="button"
          onClick={() => {
            contentProps.onNewProject();
          }}
          className="touch-target touch-press rounded-lg p-2 text-accent hover:bg-surface-border"
          aria-label="New project"
        >
          <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M12 4.5v15m7.5-7.5h-15" />
          </svg>
        </button>
      </aside>

      {/* Tablet expanded overlay */}
      {tabletExpanded && (
        <>
          <div
            className="fixed inset-0 z-40 bg-black/60 md:block lg:hidden"
            onClick={onClose}
            aria-hidden="true"
          />
          <aside className="fixed inset-y-0 left-0 z-50 w-72 border-r border-surface-border bg-surface-raised md:block lg:hidden">
            <div className="flex items-center justify-between border-b border-surface-border px-4 py-3">
              <span className="text-sm font-semibold text-white">Files</span>
              <button
                type="button"
                onClick={onClose}
                className="touch-target rounded-lg p-1.5 text-gray-400 hover:bg-surface-border hover:text-white"
                aria-label="Close sidebar"
              >
                ✕
              </button>
            </div>
            <SidebarContent {...contentProps} onClose={onClose} />
          </aside>
        </>
      )}
    </>
  );
}

export function FilesButton({ onClick }: { onClick: () => void }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="touch-target touch-press flex items-center gap-2 rounded-lg border border-surface-border bg-surface-raised px-3 py-2 text-sm text-gray-300 transition hover:border-gray-600 hover:text-white md:hidden"
      aria-label="Open files"
    >
      <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M2.25 12.75V6A2.25 2.25 0 014.5 3.75h4.318a2.25 2.25 0 011.591.659l1.182 1.182A2.25 2.25 0 0015.318 6H19.5A2.25 2.25 0 0121.75 8.25v9.5A2.25 2.25 0 0119.5 20.25H4.5A2.25 2.25 0 012.25 18V12.75z" />
      </svg>
      Files
    </button>
  );
}
