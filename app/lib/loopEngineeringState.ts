import { FILE_SCORE_THRESHOLD, meetsQualityThreshold } from "./agentTypes";
import type {
  DeriveLoopEngineeringInput,
  GoalPath,
  LoopEngineeringSnapshot,
  LoopEngineeringStep,
  LoopIteration,
} from "./loopEngineeringTypes";

export function recordLoopIterationFromRound(
  iterations: LoopIteration[],
  filePath: string,
  round: {
    task: string;
    score: number;
    scoreBefore: number;
    improvement: string;
  }
): { iterations: LoopIteration[]; goalMetFlash: boolean } {
  if (round.task !== "review") {
    return { iterations, goalMetFlash: false };
  }

  const goalMet = meetsQualityThreshold(round.score);
  const loopNumber =
    iterations.filter((i) => !i.goalMet).length + (goalMet ? 0 : 1);

  const entry: LoopIteration = {
    loopNumber: goalMet ? iterations.length + 1 : loopNumber,
    filePath,
    scoreBefore: round.scoreBefore,
    scoreAfter: round.score,
    improvement: round.improvement || "Quality review",
    goalMet,
  };

  return {
    iterations: [...iterations, entry],
    goalMetFlash: goalMet,
  };
}

export function deriveLoopEngineeringState(
  input: DeriveLoopEngineeringInput
): LoopEngineeringSnapshot {
  const {
    phase,
    chatMode,
    isComposerActive,
    currentRound,
    loopIterations,
    buildStartedAt,
    buildEndedAt,
    goalMetFlash,
    reviewAccepted,
    avgScore,
  } = input;

  const visible = chatMode === "agent" || chatMode === "plan";

  let activeStep: LoopEngineeringStep = 1;
  let goalPath: GoalPath = null;
  let pulseStep3 = false;
  let showLoopBack = false;

  if (phase === "complete") {
    activeStep = 5;
  } else if (phase === "building") {
    const task = currentRound?.task;
    if (task === "review" && currentRound) {
      activeStep = 4;
      if (currentRound.score >= FILE_SCORE_THRESHOLD) {
        goalPath = "yes";
      } else {
        goalPath = "no";
        showLoopBack = true;
      }
    } else {
      activeStep = 3;
      pulseStep3 = task === "write" || task === "refine" || !task;
    }
  } else if (phase === "planning" || phase === "awaiting_confirm") {
    activeStep = 2;
  } else if (phase === "idle" || isComposerActive) {
    activeStep = 1;
  }

  const elapsedMs =
    buildStartedAt != null
      ? (buildEndedAt ?? Date.now()) - buildStartedAt
      : null;

  const totalLoops = loopIterations.filter((i) => !i.goalMet).length;
  const lastGoalMet = [...loopIterations].reverse().find((i) => i.goalMet);
  const goalQualityPercent = lastGoalMet?.scoreAfter ?? avgScore;

  return {
    visible,
    activeStep,
    goalPath,
    pulseStep3,
    showLoopBack,
    goalMetFlash,
    loopIterations,
    totalLoops,
    goalQualityPercent,
    elapsedMs,
    reviewAccepted,
  };
}

export function formatElapsed(ms: number | null): string {
  if (ms == null || ms < 0) return "—";
  const totalSec = Math.floor(ms / 1000);
  const min = Math.floor(totalSec / 60);
  const sec = totalSec % 60;
  if (min === 0) return `${sec}s`;
  return `${min}m ${sec}s`;
}

export function resetLoopEngineeringState(): {
  loopIterations: LoopIteration[];
  buildStartedAt: null;
  buildEndedAt: null;
  goalMetFlash: false;
  reviewAccepted: false;
} {
  return {
    loopIterations: [],
    buildStartedAt: null,
    buildEndedAt: null,
    goalMetFlash: false,
    reviewAccepted: false,
  };
}
