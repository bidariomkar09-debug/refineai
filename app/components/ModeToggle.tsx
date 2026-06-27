"use client";

import type { AppMode } from "@/app/lib/developerConfig";

type ModeToggleProps = {
  mode: AppMode;
  onChange: (mode: AppMode) => void;
};

export default function ModeToggle({ mode, onChange }: ModeToggleProps) {
  return (
    <div className="flex items-center rounded-lg border border-surface-border bg-surface-raised p-0.5">
      <button
        type="button"
        onClick={() => onChange("simple")}
        className={`rounded-md px-3 py-1.5 text-xs font-medium transition ${
          mode === "simple"
            ? "bg-accent text-white"
            : "text-gray-400 hover:text-white"
        }`}
      >
        Simple
      </button>
      <button
        type="button"
        onClick={() => onChange("developer")}
        className={`rounded-md px-3 py-1.5 text-xs font-medium transition ${
          mode === "developer"
            ? "bg-accent text-white"
            : "text-gray-400 hover:text-white"
        }`}
      >
        Developer
      </button>
    </div>
  );
}
