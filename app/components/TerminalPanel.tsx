"use client";

import { useEffect, useRef } from "react";
import type { PreviewLogLine } from "@/app/lib/previewTypes";
import { PREVIEW_URL } from "@/app/lib/previewTypes";

type TerminalPanelProps = {
  logs: PreviewLogLine[];
  isOpen: boolean;
  onToggle: () => void;
};

export default function TerminalPanel({ logs, isOpen, onToggle }: TerminalPanelProps) {
  const bottomRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (isOpen) {
      bottomRef.current?.scrollIntoView({ behavior: "smooth" });
    }
  }, [logs.length, isOpen]);

  return (
    <div className="border-t border-surface-border bg-[#0d1117]">
      <button
        type="button"
        onClick={onToggle}
        className="flex w-full items-center justify-between px-4 py-2 text-xs text-gray-400 hover:text-white"
      >
        <span className="font-medium uppercase tracking-wider">Terminal</span>
        <span>{isOpen ? "Hide" : "Show"}</span>
      </button>
      {isOpen && (
        <div className="max-h-40 overflow-y-auto px-4 pb-3 font-mono text-[11px] leading-relaxed text-gray-400">
          {logs.length === 0 ? (
            <p className="text-gray-600">Output will appear here when you run the app.</p>
          ) : (
            logs.map((line, i) => (
              <div key={`${line.timestamp}-${i}`} className="whitespace-pre-wrap break-all">
                {line.message}
              </div>
            ))
          )}
          <div ref={bottomRef} />
        </div>
      )}
    </div>
  );
}
