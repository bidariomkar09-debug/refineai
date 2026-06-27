"use client";

import type { DbSession } from "@/app/lib/db";
import type { Iteration } from "@/app/lib/types";
import { TASK_LABELS } from "@/app/lib/types";
import SessionHistory from "./SessionHistory";

type SidebarProps = {
  iterations: Iteration[];
  sessions: DbSession[];
  activeSessionId: string | null;
  sessionsLoading: boolean;
  isOpen: boolean;
  onClose: () => void;
  onSelectRound: (round: number) => void;
  onSelectSession: (session: DbSession) => void;
  onNewSession: () => void;
  activeRound: number | null;
};

export default function Sidebar({
  iterations,
  sessions,
  activeSessionId,
  sessionsLoading,
  isOpen,
  onClose,
  onSelectRound,
  onSelectSession,
  onNewSession,
  activeRound,
}: SidebarProps) {
  const roundsContent = (
    <div className="flex min-h-0 flex-1 flex-col">
      <div className="border-b border-surface-border px-4 py-3">
        <h2 className="text-xs font-semibold uppercase tracking-wider text-gray-400">
          Round History
        </h2>
        <p className="mt-1 text-xs text-gray-500">
          {iterations.length === 0
            ? "No rounds yet"
            : `${iterations.length} round${iterations.length === 1 ? "" : "s"}`}
        </p>
      </div>
      <nav className="flex-1 overflow-y-auto p-3">
        {iterations.length === 0 ? (
          <p className="px-2 py-4 text-sm text-gray-500">
            Rounds will appear here as the loop runs.
          </p>
        ) : (
          <ul className="space-y-1.5">
            {iterations.map((iteration) => (
              <li key={iteration.round}>
                <button
                  type="button"
                  onClick={() => {
                    onSelectRound(iteration.round);
                    onClose();
                  }}
                  className={`w-full rounded-lg px-3 py-2.5 text-left transition ${
                    activeRound === iteration.round
                      ? "bg-accent/20 text-white"
                      : "text-gray-300 hover:bg-surface-border/50"
                  }`}
                >
                  <div className="flex items-center justify-between gap-2">
                    <span className="text-sm font-medium">
                      Round {iteration.round}
                    </span>
                    <span
                      className={`text-xs font-bold tabular-nums ${
                        iteration.score >= 90
                          ? "text-accent-green"
                          : "text-gray-400"
                      }`}
                    >
                      {iteration.score}%
                    </span>
                  </div>
                  <span className="mt-0.5 block text-xs text-gray-500">
                    {TASK_LABELS[iteration.task]}
                  </span>
                </button>
              </li>
            ))}
          </ul>
        )}
      </nav>
    </div>
  );

  const content = (
    <div className="flex h-full flex-col">
      <SessionHistory
        sessions={sessions}
        activeSessionId={activeSessionId}
        isLoading={sessionsLoading}
        onSelectSession={(session) => {
          onSelectSession(session);
          onClose();
        }}
        onNewSession={() => {
          onNewSession();
          onClose();
        }}
      />
      {roundsContent}
    </div>
  );

  return (
    <>
      <aside className="hidden h-full w-72 shrink-0 border-r border-surface-border bg-surface-raised md:flex md:flex-col">
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
            <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>
        {content}
      </aside>
    </>
  );
}

export function SidebarToggle({
  onClick,
  sessionCount,
}: {
  onClick: () => void;
  sessionCount: number;
}) {
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
      {sessionCount > 0 && (
        <span className="rounded-full bg-accent/20 px-1.5 py-0.5 text-xs font-medium text-accent">
          {sessionCount}
        </span>
      )}
    </button>
  );
}
