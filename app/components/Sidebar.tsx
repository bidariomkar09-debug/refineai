"use client";

import type { DbProject } from "@/app/lib/agentTypes";

type SidebarProps = {
  projects: DbProject[];
  activeProjectId: string | null;
  isLoading: boolean;
  isOpen: boolean;
  onClose: () => void;
  onSelectProject: (project: DbProject) => void;
  onNewProject: () => void;
};

const STATUS_BADGE: Record<string, string> = {
  planning: "bg-yellow-500/20 text-yellow-400",
  building: "bg-accent/20 text-accent",
  complete: "bg-accent-green/20 text-accent-green",
  error: "bg-red-500/20 text-red-400",
  paused: "bg-gray-500/20 text-gray-400",
};

function formatDate(iso: string): string {
  return new Date(iso).toLocaleDateString(undefined, {
    month: "short",
    day: "numeric",
  });
}

export default function Sidebar({
  projects,
  activeProjectId,
  isLoading,
  isOpen,
  onClose,
  onSelectProject,
  onNewProject,
}: SidebarProps) {
  const content = (
    <div className="flex h-full flex-col">
      <div className="border-b border-surface-border px-4 py-3">
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

      <div className="border-b border-surface-border px-4 py-3">
        <h2 className="text-xs font-semibold uppercase tracking-wider text-gray-400">
          Past Projects
        </h2>
      </div>

      <nav className="flex-1 overflow-y-auto p-3">
        {isLoading ? (
          <p className="px-2 py-4 text-sm text-gray-500">Loading...</p>
        ) : projects.length === 0 ? (
          <p className="px-2 py-4 text-sm text-gray-500">
            Your projects will appear here.
          </p>
        ) : (
          <ul className="space-y-1.5">
            {projects.map((project) => (
              <li key={project.id}>
                <button
                  type="button"
                  onClick={() => {
                    onSelectProject(project);
                    onClose();
                  }}
                  className={`w-full rounded-lg px-3 py-2.5 text-left transition ${
                    activeProjectId === project.id
                      ? "bg-accent/20 text-white"
                      : "text-gray-300 hover:bg-surface-border/50"
                  }`}
                >
                  <div className="flex items-center justify-between gap-2">
                    <span className="truncate text-sm font-medium">
                      {project.name}
                    </span>
                    <span
                      className={`shrink-0 rounded-full px-2 py-0.5 text-[10px] font-medium capitalize ${
                        STATUS_BADGE[project.status] ?? STATUS_BADGE.planning
                      }`}
                    >
                      {project.status}
                    </span>
                  </div>
                  <span className="mt-0.5 block text-xs text-gray-500">
                    {formatDate(project.created_at)}
                  </span>
                </button>
              </li>
            ))}
          </ul>
        )}
      </nav>
    </div>
  );

  return (
    <>
      <aside className="hidden h-full w-72 shrink-0 border-r border-surface-border bg-surface-raised md:flex md:flex-col">
        <div className="border-b border-surface-border px-4 py-4">
          <h1 className="text-lg font-bold text-white">RefineAI</h1>
          <p className="text-xs text-gray-500">AI Coding Agent</p>
        </div>
        {content}
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
        <div className="flex items-center justify-between border-b border-surface-border px-4 py-3">
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
        {content}
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

export function FileBuilderToggle({ onClick }: { onClick: () => void }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="flex items-center gap-2 rounded-lg border border-surface-border bg-surface-raised px-3 py-2 text-sm text-gray-300 transition hover:border-gray-600 hover:text-white lg:hidden"
      aria-label="Open file builder"
    >
      Files
    </button>
  );
}
