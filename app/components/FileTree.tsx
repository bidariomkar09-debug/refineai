"use client";

import type { DbFile } from "@/app/lib/agentTypes";

type FileTreeProps = {
  files: DbFile[];
  activeFileId: string | null;
  onSelect?: (file: DbFile) => void;
};

const STATUS_ICON: Record<string, string> = {
  pending: "⏳",
  building: "🔄",
  done: "✅",
  error: "❌",
  skipped: "⏭️",
};

export default function FileTree({ files, activeFileId, onSelect }: FileTreeProps) {
  if (files.length === 0) {
    return (
      <p className="px-2 py-4 text-xs text-gray-500">Files will appear after planning.</p>
    );
  }

  return (
    <ul className="space-y-1">
      {files.map((file) => (
        <li key={file.id}>
          <button
            type="button"
            onClick={() => onSelect?.(file)}
            className={`flex w-full items-center gap-2 rounded-lg px-2 py-1.5 text-left text-xs transition ${
              activeFileId === file.id
                ? "bg-accent/20 text-white"
                : "text-gray-400 hover:bg-surface-border/50 hover:text-gray-200"
            }`}
          >
            <span>{STATUS_ICON[file.status] ?? "⏳"}</span>
            <span className="truncate font-mono">{file.file_path}</span>
            {file.status === "done" && (
              <span className="ml-auto text-accent-green">{file.score}%</span>
            )}
          </button>
        </li>
      ))}
    </ul>
  );
}
