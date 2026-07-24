"use client";

import type { PreviewLogLine, PreviewStatus } from "@/app/lib/previewTypes";
import type { SandpackTemplate } from "@/app/lib/previewSandpack";
import PreviewPanel from "@/app/components/PreviewPanel";

type PreviewOverlayProps = {
  open: boolean;
  onClose: () => void;
  status: PreviewStatus;
  lastUpdated: string | null;
  iframeKey: number;
  viewport: "desktop" | "mobile";
  logs: PreviewLogLine[];
  terminalOpen: boolean;
  previewMode?: "localhost" | "sandpack";
  sandpackFiles?: Record<string, string | false> | null;
  sandpackTemplate?: SandpackTemplate;
  sandpackEntry?: string;
  sandpackDependencies?: Record<string, string>;
  onToggleTerminal: () => void;
  onRefresh: () => void;
  onRetry: () => void;
  onViewportChange: (v: "desktop" | "mobile") => void;
};

export default function PreviewOverlay({
  open,
  onClose,
  ...previewProps
}: PreviewOverlayProps) {
  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50 flex flex-col bg-surface md:hidden">
      <div className="flex shrink-0 items-center justify-between border-b border-surface-border px-4 py-3 pt-safe">
        <p className="text-sm font-medium text-white">Preview</p>
        <button
          type="button"
          onClick={onClose}
          className="touch-target touch-press rounded-lg p-2 text-gray-400 hover:bg-surface-raised"
          aria-label="Close preview"
        >
          <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
          </svg>
        </button>
      </div>
      <div className="min-h-0 flex-1 overflow-hidden">
        <PreviewPanel {...previewProps} />
      </div>
    </div>
  );
}
