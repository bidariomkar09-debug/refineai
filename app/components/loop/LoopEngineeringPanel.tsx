"use client";

import type { LoopEngineeringSnapshot } from "@/app/lib/loopEngineeringTypes";
import LoopEngineeringBar from "./LoopEngineeringBar";
import LoopCounter from "./LoopCounter";
import GoalMetIndicator from "./GoalMetIndicator";

type LoopEngineeringPanelProps = {
  snapshot: LoopEngineeringSnapshot;
  goalMetScore: number;
};

export default function LoopEngineeringPanel({
  snapshot,
  goalMetScore,
}: LoopEngineeringPanelProps) {
  if (!snapshot.visible) return null;

  return (
    <>
      <GoalMetIndicator show={snapshot.goalMetFlash} score={goalMetScore} />
      <LoopEngineeringBar snapshot={snapshot} />
      <LoopCounter iterations={snapshot.loopIterations} visible={snapshot.visible} />
    </>
  );
}
