"use client";

import type { FileRoundEvent } from "@/app/lib/agentTypes";

type MemoryDebugPanelProps = {
  visible: boolean;
  latestMemory?: string | null;
  rounds?: Array<Pick<FileRoundEvent, "round" | "memoryContext">>;
};

export default function MemoryDebugPanel({
  visible,
  latestMemory,
  rounds = [],
}: MemoryDebugPanelProps) {
  if (!visible) return null;

  const roundMemories = rounds.filter((r) => r.memoryContext?.trim());
  const hasMemory = Boolean(latestMemory?.trim()) || roundMemories.length > 0;

  return (
    <div
      className="rounded-xl border border-amber-500/30 bg-amber-500/5 p-4"
      data-testid="memory-debug-panel"
    >
      <p className="text-[10px] font-semibold uppercase tracking-wider text-amber-400">
        Developer — Memory injection
      </p>
      {!hasMemory ? (
        <p className="mt-2 text-xs text-amber-300/80">
          ⚠ No memory block was injected this build. Check personal memory settings or extraction.
        </p>
      ) : (
        <div className="mt-2 space-y-3">
          {latestMemory?.trim() && (
            <div>
              <p className="text-[10px] font-medium text-gray-500">Latest block</p>
              <pre className="mt-1 max-h-32 overflow-auto rounded bg-black/30 p-2 text-[11px] leading-relaxed text-gray-300 whitespace-pre-wrap">
                {latestMemory}
              </pre>
            </div>
          )}
          {roundMemories.length > 0 && (
            <div>
              <p className="text-[10px] font-medium text-gray-500">Per-round memory</p>
              <ul className="mt-1 max-h-24 space-y-1 overflow-auto text-[11px] text-gray-400">
                {roundMemories.map((r) => (
                  <li key={r.round}>
                    Round {r.round}: {r.memoryContext?.slice(0, 120)}
                    {(r.memoryContext?.length ?? 0) > 120 ? "…" : ""}
                  </li>
                ))}
              </ul>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
