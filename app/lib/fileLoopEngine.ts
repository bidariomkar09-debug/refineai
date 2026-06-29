import {
  FILE_ABSOLUTE_MAX_ROUNDS,
  FILE_SCORE_THRESHOLD,
  type FileRoundEvent,
  type FileTask,
} from "./agentTypes";
import { callFileTask, describeImprovement } from "./agentAI";

export type FileLoopContext = {
  filePath: string;
  filePurpose: string;
  projectContext: string;
  completedFiles: string;
};

export type FileLoopCallbacks = {
  onRound: (event: FileRoundEvent) => void | Promise<void>;
  onStatus?: (message: string) => void;
};

export type FileLoopResult = {
  content: string;
  score: number;
  roundsTaken: number;
  totalTokens: number;
};

export async function runFileLoop(
  context: FileLoopContext,
  callbacks: FileLoopCallbacks,
  signal?: AbortSignal
): Promise<FileLoopResult> {
  let currentCode = "";
  let lastReview = "";
  let score = 0;
  let previousScore = 0;
  let round = 1;
  let totalTokens = 0;

  const runTask = async (task: FileTask): Promise<void> => {
    if (signal?.aborted) throw new Error("aborted");

    const prevCode = currentCode;
    const scoreBefore = previousScore;

    const result = await callFileTask({
      task,
      filePath: context.filePath,
      filePurpose: context.filePurpose,
      projectContext: context.projectContext,
      completedFiles: context.completedFiles,
      currentCode: currentCode || undefined,
      lastReview: lastReview || undefined,
      round,
    });

    totalTokens += result.tokens;
    previousScore = score;
    score = result.score;

    if (task === "review") {
      lastReview = result.review ?? "";
      await callbacks.onRound({
        round,
        task,
        score,
        review: lastReview,
        code: currentCode,
        inputContext: result.inputContext,
        modelUsed: result.modelUsed,
        scoreBefore,
        scoreImprovement: score - scoreBefore,
        tokensUsed: result.tokens,
        temperature: result.temperature,
        output: lastReview,
        improvement: describeImprovement(task, prevCode, currentCode),
      });
    } else {
      currentCode = result.code ?? currentCode;
      await callbacks.onRound({
        round,
        task,
        score,
        code: currentCode,
        critique: task === "refine" ? lastReview || undefined : undefined,
        inputContext: result.inputContext,
        modelUsed: result.modelUsed,
        scoreBefore,
        scoreImprovement: score - scoreBefore,
        tokensUsed: result.tokens,
        temperature: result.temperature,
        output: currentCode,
        improvement: describeImprovement(task, prevCode, currentCode),
      });
    }
  };

  callbacks.onStatus?.("Writing the code...");
  await runTask("write");

  while (score < FILE_SCORE_THRESHOLD && round < FILE_ABSOLUTE_MAX_ROUNDS) {
    if (signal?.aborted) throw new Error("aborted");

    callbacks.onStatus?.("Reviewing the code...");
    await runTask("review");
    if (score >= FILE_SCORE_THRESHOLD) break;

    if (round >= FILE_ABSOLUTE_MAX_ROUNDS) break;
    round++;

    callbacks.onStatus?.("Making improvements...");
    await runTask("refine");
    if (score >= FILE_SCORE_THRESHOLD) break;

    round++;
  }

  return { content: currentCode, score, roundsTaken: round, totalTokens };
}

export function checkSyntax(code: string): { valid: boolean; issues: string[] } {
  const issues: string[] = [];
  const openBraces = (code.match(/{/g) ?? []).length;
  const closeBraces = (code.match(/}/g) ?? []).length;
  const openParens = (code.match(/\(/g) ?? []).length;
  const closeParens = (code.match(/\)/g) ?? []).length;

  if (openBraces !== closeBraces) issues.push("Mismatched braces");
  if (openParens !== closeParens) issues.push("Mismatched parentheses");
  if (code.includes("```")) issues.push("Contains markdown fences");

  return { valid: issues.length === 0, issues };
}
