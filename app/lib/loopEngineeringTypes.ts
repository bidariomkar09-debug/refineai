import type { BuildPhase, ChatMode, FileRoundEvent } from "./agentTypes";

export type LoopEngineeringStep = 1 | 2 | 3 | 4 | 5;

export type GoalPath = "yes" | "no" | null;

export type LoopIteration = {
  loopNumber: number;
  filePath: string;
  scoreBefore: number;
  scoreAfter: number;
  improvement: string;
  goalMet: boolean;
};

export type LoopEngineeringSnapshot = {
  visible: boolean;
  activeStep: LoopEngineeringStep;
  goalPath: GoalPath;
  pulseStep3: boolean;
  showLoopBack: boolean;
  goalMetFlash: boolean;
  loopIterations: LoopIteration[];
  totalLoops: number;
  goalQualityPercent: number;
  elapsedMs: number | null;
  reviewAccepted: boolean;
};

export type DeriveLoopEngineeringInput = {
  phase: BuildPhase;
  chatMode: ChatMode;
  isComposerActive: boolean;
  currentRound: FileRoundEvent | null;
  loopIterations: LoopIteration[];
  buildStartedAt: number | null;
  buildEndedAt: number | null;
  goalMetFlash: boolean;
  reviewAccepted: boolean;
  avgScore: number;
};

export const LOOP_STEP_LABELS: Record<
  LoopEngineeringStep,
  { full: string; short: string }
> = {
  1: { full: "Human sets goal", short: "Goal" },
  2: { full: "Trigger fires", short: "Plan" },
  3: { full: "Agent acts", short: "Act" },
  4: { full: "Goal met?", short: "Met?" },
  5: { full: "Human reviews", short: "Review" },
};
