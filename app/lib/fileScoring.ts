import {
  FILE_SCORE_THRESHOLD,
  meetsQualityThreshold,
  type DbFile,
  type FileStatus,
} from "./agentTypes";

export type FileOutcomeInput = {
  aiScore: number;
  runtimeVerified: boolean;
  maxRoundsReached: boolean;
  staticPass: boolean;
  bestEffort?: boolean;
};

export type FileOutcome = {
  status: FileStatus;
  displayScore: number;
  runtimeVerified: boolean;
};

export function resolveFileOutcome(input: FileOutcomeInput): FileOutcome {
  const { aiScore, runtimeVerified, maxRoundsReached, staticPass, bestEffort } = input;
  const aiPass = meetsQualityThreshold(aiScore);

  if (bestEffort || (maxRoundsReached && !aiPass)) {
    return {
      status: "best_effort",
      displayScore: aiScore,
      runtimeVerified: false,
    };
  }

  if (!staticPass) {
    return {
      status: "building",
      displayScore: aiScore,
      runtimeVerified: false,
    };
  }

  if (aiPass && runtimeVerified) {
    return {
      status: "done",
      displayScore: aiScore,
      runtimeVerified: true,
    };
  }

  if (aiPass && !runtimeVerified) {
    return {
      status: "needs_fix",
      displayScore: Math.min(70, aiScore),
      runtimeVerified: false,
    };
  }

  if (maxRoundsReached) {
    return {
      status: "best_effort",
      displayScore: aiScore,
      runtimeVerified: false,
    };
  }

  return {
    status: "building",
    displayScore: aiScore,
    runtimeVerified: false,
  };
}

export function isFileTrulyComplete(file: Pick<DbFile, "status" | "runtime_verified" | "score">): boolean {
  return file.status === "done" && file.runtime_verified === true;
}

export function isFileBuildBlocking(file: Pick<DbFile, "status">): boolean {
  return file.status === "building" || file.status === "pending" || file.status === "error";
}

export function isFileOrchestratorComplete(file: Pick<DbFile, "status" | "runtime_verified" | "score">): boolean {
  if (file.status === "skipped") return true;
  if (file.status === "best_effort") return true;
  if (file.status === "needs_fix") return true;
  return isFileTrulyComplete(file);
}

export function isProjectBuildComplete(files: DbFile[]): boolean {
  const relevant = files.filter((f) => f.status !== "skipped");
  if (relevant.length === 0) return false;
  return relevant.every(
    (f) => isFileTrulyComplete(f) || f.status === "best_effort"
  );
}

export function meetsVerifiedQualityThreshold(
  file: Pick<DbFile, "status" | "score" | "runtime_verified">
): boolean {
  return isFileTrulyComplete(file) && meetsQualityThreshold(file.score);
}

export { FILE_SCORE_THRESHOLD };
