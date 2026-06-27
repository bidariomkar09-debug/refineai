import type { DeveloperConfig } from "./developerConfig";
import type {
  ApiCallSnapshot,
  Iteration,
  LoopResult,
  LoopStats,
  LoopStatus,
  LoopTask,
} from "./types";
import { taskToStatus } from "./types";

export class LoopAbortedError extends Error {
  constructor() {
    super("Loop was stopped by user");
    this.name = "LoopAbortedError";
  }
}

export class LoopApiError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "LoopApiError";
  }
}

type LoopCallbacks = {
  onStatus: (status: LoopStatus) => void;
  onIteration: (iteration: Iteration) => void;
  onScore: (score: number) => void;
  onApiCall?: (snapshot: ApiCallSnapshot) => void;
};

type ApiResponse = {
  output?: string;
  critique?: string;
  score: number;
  round: number;
  task: LoopTask;
  rawContent?: string;
  usage?: { total_tokens: number };
  apiSnapshot?: ApiCallSnapshot;
  error?: string;
};

export type LoopOptions = {
  config: DeveloperConfig;
};

function computeStats(
  iterations: Iteration[],
  totalTokens: number,
  timeTakenSec: number,
  model: string
): LoopStats {
  let scoreDeltaSum = 0;
  for (let i = 1; i < iterations.length; i++) {
    scoreDeltaSum += iterations[i].score - iterations[i - 1].score;
  }
  const avgScoreDelta =
    iterations.length > 1 ? scoreDeltaSum / (iterations.length - 1) : 0;

  return {
    totalRounds: iterations.length,
    totalTokens,
    avgScoreDelta: Math.round(avgScoreDelta * 10) / 10,
    timeTakenSec: Math.round(timeTakenSec * 10) / 10,
    model,
  };
}

async function callApi(
  params: {
    target: string;
    currentOutput?: string;
    lastCritique?: string;
    round: number;
    task: LoopTask;
    config: DeveloperConfig;
  },
  signal: AbortSignal
): Promise<ApiResponse> {
  if (signal.aborted) throw new LoopAbortedError();

  const response = await fetch("/api/chat", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      target: params.target,
      round: params.round,
      task: params.task,
      currentOutput: params.currentOutput,
      lastCritique: params.lastCritique,
      systemPrompt: params.config.systemPrompt,
      model: params.config.model,
      temperature: params.config.temperature,
      jsonMode: params.config.jsonMode,
    }),
    signal,
  });

  const data: ApiResponse = await response.json();

  if (!response.ok) {
    throw new LoopApiError(data.error ?? `API error (${response.status})`);
  }

  return data;
}

function buildLoopResult(
  iterations: Iteration[],
  currentOutput: string,
  score: number,
  reason: LoopResult["reason"],
  totalTokens: number,
  startTime: number,
  model: string
): LoopResult {
  const timeTakenSec = (Date.now() - startTime) / 1000;
  return {
    iterations,
    finalOutput: currentOutput,
    score,
    reason,
    stats: computeStats(iterations, totalTokens, timeTakenSec, model),
  };
}

export async function runLoop(
  target: string,
  callbacks: LoopCallbacks,
  abortSignal: AbortSignal,
  options: LoopOptions
): Promise<LoopResult> {
  const { config } = options;
  const scoreThreshold = config.scoreThreshold;
  const maxRounds = config.maxRounds;

  const iterations: Iteration[] = [];
  let currentOutput = "";
  let lastCritique = "";
  let score = 0;
  let round = 1;
  let totalTokens = 0;
  const startTime = Date.now();

  const runTask = async (task: LoopTask): Promise<ApiResponse> => {
    callbacks.onStatus(taskToStatus(task));

    const result = await callApi(
      {
        target,
        round,
        task,
        config,
        ...(currentOutput ? { currentOutput } : {}),
        ...(lastCritique && task !== "generate"
          ? { lastCritique }
          : {}),
      },
      abortSignal
    );

    const content =
      task === "critique"
        ? (result.critique ?? "")
        : (result.output ?? "");

    if (result.usage?.total_tokens) {
      totalTokens += result.usage.total_tokens;
    }

    if (result.apiSnapshot) {
      callbacks.onApiCall?.(result.apiSnapshot);
    }

    const iteration: Iteration = {
      round,
      task,
      content,
      score: result.score,
      rawJson: config.jsonMode ? result.rawContent : undefined,
      apiCall: result.apiSnapshot,
      tokensUsed: result.usage?.total_tokens,
    };

    iterations.push(iteration);
    score = result.score;
    callbacks.onIteration(iteration);
    callbacks.onScore(score);

    if (task === "critique") {
      lastCritique = content;
    } else {
      currentOutput = content;
    }

    return result;
  };

  try {
    await runTask("generate");
    if (score >= scoreThreshold) {
      callbacks.onStatus("complete");
      return buildLoopResult(
        iterations,
        currentOutput,
        score,
        "target_met",
        totalTokens,
        startTime,
        config.model
      );
    }

    round = 2;

    while (round <= maxRounds) {
      if (abortSignal.aborted) throw new LoopAbortedError();

      await runTask("critique");
      if (score >= scoreThreshold) {
        callbacks.onStatus("complete");
        return buildLoopResult(
          iterations,
          currentOutput,
          score,
          "target_met",
          totalTokens,
          startTime,
          config.model
        );
      }

      if (abortSignal.aborted) throw new LoopAbortedError();
      if (round >= maxRounds) break;

      round++;
      await runTask("refine");
      if (score >= scoreThreshold) {
        callbacks.onStatus("complete");
        return buildLoopResult(
          iterations,
          currentOutput,
          score,
          "target_met",
          totalTokens,
          startTime,
          config.model
        );
      }

      if (abortSignal.aborted) throw new LoopAbortedError();
      round++;
    }

    callbacks.onStatus("complete");
    return buildLoopResult(
      iterations,
      currentOutput,
      score,
      "max_rounds",
      totalTokens,
      startTime,
      config.model
    );
  } catch (error) {
    const partial = buildLoopResult(
      iterations,
      currentOutput,
      score,
      "stopped",
      totalTokens,
      startTime,
      config.model
    );

    if (error instanceof LoopAbortedError) {
      callbacks.onStatus("stopped");
      return { ...partial, reason: "stopped" };
    }

    if (error instanceof LoopApiError) {
      callbacks.onStatus("error");
      throw error;
    }

    if (error instanceof DOMException && error.name === "AbortError") {
      callbacks.onStatus("stopped");
      return { ...partial, reason: "stopped" };
    }

    callbacks.onStatus("error");
    throw error;
  }
}
