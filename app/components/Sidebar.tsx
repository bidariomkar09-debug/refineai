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
};

function SidebarContent({
  mergedFiles,
  selectedFileId,
  activeFileId,
  onClose,
  onNewProject,
  onSelectFile,
}: Omit<SidebarProps, "isOpen">) {
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
          className="w-full rounded-xl bg-accent px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-blue-600"
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
  const { isOpen, onClose, ...contentProps } = props;

  return (
    <>
      <aside className="hidden h-full w-72 shrink-0 border-r border-surface-border bg-surface-raised md:flex md:flex-col">
        <SidebarContent {...contentProps} onClose={onClose} />
      </aside>

      {isOpen && (
        <div
          className="fixed inset-0 z-40 bg-black/60 md:hidden"
          onClick={onClose}
          aria-hidden="true"
        />
      )}

      <aside
        className={`fixed inset-y-0 left-0 z-50 w-80 transform border-r border-surface-border bg-surface-raised transition-transform duration-300 md:hidden ${
          isOpen ? "translate-x-0" : "-translate-x-full"
        }`}
      >
        <div className="flex items-center justify-between border-b border-surface-border px-4 py-3 md:hidden">
          <span className="text-sm font-semibold text-white">RefineAI</span>
          <button
            type="button"
            onClick={onClose}
            className="rounded-lg p-1.5 text-gray-400 hover:bg-surface-border hover:text-white"
            aria-label="Close sidebar"
          >
            ✕
          </button>
        </div>
        <SidebarContent {...contentProps} onClose={onClose} />
      </aside>
    </>
  );
}

export function SidebarToggle({ onClick }: { onClick: () => void }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="flex items-center gap-2 rounded-lg border border-surface-border bg-surface-raised px-3 py-2 text-sm text-gray-300 transition hover:border-gray-600 hover:text-white md:hidden"
      aria-label="Open sidebar"
    >
      <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
      </svg>
      Menu
    </button>
  );
}
