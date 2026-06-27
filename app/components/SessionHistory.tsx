"use client";

import type { DbSession } from "@/app/lib/db";

type SessionHistoryProps = {
  sessions: DbSession[];
  activeSessionId: string | null;
  isLoading: boolean;
  onSelectSession: (session: DbSession) => void;
  onNewSession: () => void;
};

function formatDate(dateStr: string): string {
  const date = new Date(dateStr);
  return date.toLocaleDateString(undefined, {
    month: "short",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

function truncate(text: string, max = 48): string {
  if (text.length <= max) return text;
  return `${text.slice(0, max)}…`;
}

const STATUS_STYLES: Record<
  DbSession["status"],
  { label: string; className: string }
> = {
  running: {
    label: "Running",
    className: "bg-accent/20 text-accent",
  },
  completed: {
    label: "Completed",
    className: "bg-accent-green/20 text-accent-green",
  },
  stopped: {
    label: "Stopped",
    className: "bg-yellow-500/20 text-yellow-400",
  },
};

export default function SessionHistory({
  sessions,
  activeSessionId,
  isLoading,
  onSelectSession,
  onNewSession,
}: SessionHistoryProps) {
  return (
    <div className="flex flex-col border-b border-surface-border">
      <div className="flex items-center justify-between px-4 py-3">
        <h2 className="text-xs font-semibold uppercase tracking-wider text-gray-400">
          Past Sessions
        </h2>
        <button
          type="button"
          onClick={onNewSession}
          className="rounded-md bg-accent/20 px-2 py-1 text-xs font-medium text-accent transition hover:bg-accent/30"
        >
          New
        </button>
      </div>

      <div className="max-h-48 overflow-y-auto px-3 pb-3">
        {isLoading ? (
          <p className="px-2 py-3 text-sm text-gray-500">Loading sessions…</p>
        ) : sessions.length === 0 ? (
          <p className="px-2 py-3 text-sm text-gray-500">
            No saved sessions yet.
          </p>
        ) : (
          <ul className="space-y-1">
            {sessions.map((session) => {
              const statusStyle = STATUS_STYLES[session.status];
              const isActive = activeSessionId === session.id;

              return (
                <li key={session.id}>
                  <button
                    type="button"
                    onClick={() => onSelectSession(session)}
                    className={`w-full rounded-lg px-3 py-2 text-left transition ${
                      isActive
                        ? "bg-accent/20 ring-1 ring-accent/40"
                        : "hover:bg-surface-border/50"
                    }`}
                  >
                    <div className="flex items-start justify-between gap-2">
                      <p className="line-clamp-2 text-sm font-medium text-gray-200">
                        {truncate(session.target)}
                      </p>
                      <span
                        className={`shrink-0 rounded-full px-2 py-0.5 text-[10px] font-medium ${statusStyle.className}`}
                      >
                        {statusStyle.label}
                      </span>
                    </div>
                    <p className="mt-1 text-[11px] text-gray-500">
                      {formatDate(session.created_at)}
                    </p>
                  </button>
                </li>
              );
            })}
          </ul>
        )}
      </div>
    </div>
  );
}
