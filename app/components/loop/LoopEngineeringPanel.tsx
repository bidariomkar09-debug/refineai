"use client";

import type { LoopEngineeringSnapshot } from "@/app/lib/loopEngineeringTypes";
import LoopEngineeringBar from "./LoopEngineeringBar";
import LoopCounter from "./LoopCounter";
import GoalMetIndicator from "./GoalMetIndicator";
import MemoryDebugPanel from "./MemoryDebugPanel";
import type { FileRoundEvent } from "@/app/lib/agentTypes";

type LoopEngineeringPanelProps = {
  snapshot: LoopEngineeringSnapshot;
  goalMetScore: number;
  developerMode?: boolean;
  latestMemory?: string | null;
  memoryRounds?: Array<Pick<FileRoundEvent, "round" | "memoryContext">>;
};

export default function LoopEngineeringPanel({
  snapshot,
  goalMetScore,
  developerMode = false,
  latestMemory,
  memoryRounds,
}: LoopEngineeringPanelProps) {
  if (!snapshot.visible && !developerMode) return null;

  return (
    <>
      {snapshot.visible && (
        <>
          <GoalMetIndicator show={snapshot.goalMetFlash} score={goalMetScore} />
          <LoopEngineeringBar snapshot={snapshot} />
          <LoopCounter iterations={snapshot.loopIterations} visible={snapshot.visible} />
        </>
      )}
      <div className="px-3 pt-2">
        <MemoryDebugPanel
          visible={developerMode}
          latestMemory={latestMemory}
          rounds={memoryRounds}
        />
      </div>
    </>
  );
}
