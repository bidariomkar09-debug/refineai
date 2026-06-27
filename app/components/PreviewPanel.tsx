"use client";

import { useState } from "react";
import type { PreviewLogLine, PreviewStatus } from "@/app/lib/previewTypes";
import { PREVIEW_URL } from "@/app/lib/previewTypes";
import TerminalPanel from "./TerminalPanel";

type PreviewPanelProps = {
  status: PreviewStatus;
  lastUpdated: string | null;
  iframeKey: number;
  viewport: "desktop" | "mobile";
  logs: PreviewLogLine[];
  terminalOpen: boolean;
  onToggleTerminal: () => void;
  onRefresh: () => void;
  onRetry: () => void;
  onViewportChange: (v: "desktop" | "mobile") => void;
};

function StatusDot({ status }: { status: PreviewStatus }) {
  if (status === "running") {
    return <span className="h-2 w-2 rounded-full bg-accent-green" />;
  }
  if (status === "error") {
    return <span className="h-2 w-2 rounded-full bg-red-400" />;
  }
  if (status === "installing" || status === "starting") {
    return (
      <span className="relative flex h-2 w-2">
        <span className="absolute inline-flex h-full w-full motion-safe:animate-ping rounded-full bg-accent opacity-60" />
        <span className="relative inline-flex h-2 w-2 rounded-full bg-accent" />
      </span>
    );
  }
  return <span className="h-2 w-2 rounded-full bg-gray-500" />;
}

function statusLabel(status: PreviewStatus): string {
  switch (status) {
    case "running":
      return `Running on localhost:3001`;
    case "installing":
      return "Installing dependencies...";
    case "starting":
      return "Starting preview server...";
    case "error":
      return "Preview unavailable";
    default:
      return "Preview not started";
  }
}

export default function PreviewPanel({
  status,
  lastUpdated,
  iframeKey,
  viewport,
  logs,
  terminalOpen,
  onToggleTerminal,
  onRefresh,
  onRetry,
  onViewportChange,
}: PreviewPanelProps) {
  const [localViewport, setLocalViewport] = useState(viewport);

  const handleViewport = (v: "desktop" | "mobile") => {
    setLocalViewport(v);
    onViewportChange(v);
  };

  const formattedTime = lastUpdated
    ? new Date(lastUpdated).toLocaleTimeString(undefined, {
        hour: "2-digit",
        minute: "2-digit",
      })
    : null;

  return (
    <div className="flex h-full flex-col">
      <div className="flex shrink-0 flex-wrap items-center justify-between gap-2 border-b border-surface-border bg-surface-raised/80 px-4 py-2.5">
        <div className="flex items-center gap-2 text-xs">
          <StatusDot status={status} />
          <span className="text-gray-300">{statusLabel(status)}</span>
          {formattedTime && (
            <span className="text-gray-600">· Updated {formattedTime}</span>
          )}
        </div>
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={() => handleViewport("desktop")}
            className={`rounded px-2 py-1 text-[10px] ${
              localViewport === "desktop"
                ? "bg-accent/20 text-accent"
                : "text-gray-500 hover:text-gray-300"
            }`}
          >
            Desktop
          </button>
          <button
            type="button"
            onClick={() => handleViewport("mobile")}
            className={`rounded px-2 py-1 text-[10px] ${
              localViewport === "mobile"
                ? "bg-accent/20 text-accent"
                : "text-gray-500 hover:text-gray-300"
            }`}
          >
            Mobile
          </button>
          <button
            type="button"
            onClick={onRefresh}
            disabled={status !== "running"}
            className="rounded-lg border border-surface-border px-2.5 py-1 text-[10px] text-gray-300 hover:text-white disabled:opacity-40"
          >
            Refresh
          </button>
          <a
            href={PREVIEW_URL}
            target="_blank"
            rel="noopener noreferrer"
            className={`rounded-lg border border-surface-border px-2.5 py-1 text-[10px] text-gray-300 hover:text-white ${
              status !== "running" ? "pointer-events-none opacity-40" : ""
            }`}
          >
            Open tab
          </a>
        </div>
      </div>

      <div className="relative min-h-0 flex-1 overflow-hidden bg-[#1a1a1a] p-4">
        {(status === "installing" || status === "starting") && (
          <div className="absolute inset-0 z-10 flex flex-col items-center justify-center bg-surface/90">
            <div className="mb-3 h-8 w-8 motion-safe:animate-spin rounded-full border-2 border-accent border-t-transparent" />
            <p className="text-sm text-gray-300">{statusLabel(status)}</p>
          </div>
        )}

        {status === "error" && (
          <div className="flex h-full flex-col items-center justify-center text-center">
            <p className="mb-4 text-sm text-gray-400">
              Something went wrong starting the preview.
            </p>
            <button
              type="button"
              onClick={onRetry}
              className="rounded-xl bg-accent px-5 py-2 text-sm font-medium text-white hover:bg-blue-600"
            >
              Retry
            </button>
          </div>
        )}

        {status === "idle" && (
          <div className="flex h-full flex-col items-center justify-center text-center">
            <p className="text-sm text-gray-400">
              Click Run App in the chat summary to preview your project here.
            </p>
          </div>
        )}

        {status === "running" && (
          <div
            className={`mx-auto h-full overflow-hidden rounded-lg border border-surface-border bg-white ${
              localViewport === "mobile" ? "max-w-[375px]" : "w-full"
            }`}
          >
            <iframe
              key={iframeKey}
              src={PREVIEW_URL}
              title="App Preview"
              className="h-full w-full border-0"
              sandbox="allow-scripts allow-same-origin allow-forms allow-popups"
            />
          </div>
        )}
      </div>

      <TerminalPanel logs={logs} isOpen={terminalOpen} onToggle={onToggleTerminal} />
    </div>
  );
}
