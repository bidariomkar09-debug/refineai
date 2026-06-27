"use client";

import { useCallback, useState } from "react";
import type { DbFile, FileRoundEvent } from "@/app/lib/agentTypes";
import CodeBlock, { detectLanguage } from "./CodeBlock";

type CodeViewerProps = {
  file: DbFile | null;
  code: string;
  activeFileId: string | null;
  currentRound: FileRoundEvent | null;
};

const STATUS_LABEL: Record<string, string> = {
  pending: "Pending",
  building: "Building",
  done: "Complete",
  error: "Error",
  skipped: "Skipped",
};

export default function CodeViewer({
  file,
  code,
  activeFileId,
  currentRound,
}: CodeViewerProps) {
  const [copied, setCopied] = useState(false);

  const handleCopy = useCallback(async () => {
    const text = code || file?.content || "";
    if (!text) return;
    try {
      await navigator.clipboard.writeText(text);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      setCopied(false);
    }
  }, [code, file?.content]);

  if (!file) {
    return (
      <div className="flex h-full flex-col items-center justify-center text-center">
        <div className="mb-3 rounded-full bg-surface-raised p-4">
          <svg className="h-8 w-8 text-gray-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={1.5}
              d="M10 20l4-16m4 4l4 4-4 4M6 16l-4-4 4-4"
            />
          </svg>
        </div>
        <p className="text-sm text-gray-400">Select a file from the explorer</p>
        <p className="mt-1 text-xs text-gray-600">View generated code, scores, and build rounds</p>
      </div>
    );
  }

  const isLiveBuilding = file.id === activeFileId && file.status === "building";
  const displayRound = isLiveBuilding && currentRound ? currentRound.round : file.rounds_taken;
  const displayScore =
    isLiveBuilding && currentRound ? currentRound.score : file.score;
  const displayCode = code || file.content || "// No code yet...";

  return (
    <div className="flex h-full flex-col">
      <div className="shrink-0 border-b border-surface-border bg-surface-raised/80 px-4 py-2.5">
        <div className="flex items-center justify-between gap-3">
          <p className="min-w-0 truncate font-mono text-xs text-gray-300">{file.file_path}</p>
          <button
            type="button"
            onClick={handleCopy}
            disabled={!displayCode || displayCode.startsWith("// No code")}
            className="shrink-0 rounded-lg border border-surface-border px-3 py-1 text-xs text-gray-300 transition hover:border-accent hover:text-white disabled:opacity-40"
          >
            {copied ? "Copied" : "Copy"}
          </button>
        </div>
        <div className="mt-1.5 flex flex-wrap items-center gap-2 text-[11px] text-gray-500">
          <span>
            Round{" "}
            <span className="font-semibold text-gray-300">{displayRound || "—"}</span>
          </span>
          <span className="text-gray-700">·</span>
          <span>
            Score{" "}
            <span
              className={`font-semibold ${
                displayScore >= 90 ? "text-accent-green" : "text-gray-300"
              }`}
            >
              {displayScore > 0 ? `${displayScore}%` : "—"}
            </span>
          </span>
          <span className="text-gray-700">·</span>
          <span
            className={`rounded-full px-2 py-0.5 text-[10px] font-medium ${
              file.status === "done"
                ? "bg-accent-green/15 text-accent-green"
                : file.status === "building"
                  ? "bg-accent/15 text-accent"
                  : file.status === "error"
                    ? "bg-red-500/15 text-red-400"
                    : "bg-gray-700/40 text-gray-400"
            }`}
          >
            {STATUS_LABEL[file.status] ?? file.status}
          </span>
        </div>
      </div>

      <div className="min-h-0 flex-1 overflow-hidden p-3 motion-safe:transition-opacity duration-200">
        <CodeBlock
          code={displayCode}
          language={detectLanguage(file.file_path)}
          maxHeight="100%"
        />
      </div>
    </div>
  );
}
