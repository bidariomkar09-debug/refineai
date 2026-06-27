import {
  MAX_ROUNDS,
  TARGET_SCORE,
  type Iteration,
  type LoopResult,
  type LoopStatus,
  type LoopTask,
  taskToStatus,
} from "./types";

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
};

type ApiResponse = {
  output?: string;
  critique?: string;
  score: number;
  round: number;
  task: LoopTask;
  error?: string;
};

async function callApi(
  params: {
    target: string;
    currentOutput?: string;
    lastCritique?: string;
    round: number;
    task: LoopTask;
  },
  signal: AbortSignal
): Promise<ApiResponse> {
  if (signal.aborted) throw new LoopAbortedError();

  const response = await fetch("/api/chat", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(params),
    signal,
  });

  const data: ApiResponse = await response.json();

  if (!response.ok) {
    throw new LoopApiError(data.error ?? `API error (${response.status})`);
  }

  return data;
}

export async function runLoop(
  target: string,
  callbacks: LoopCallbacks,
  abortSignal: AbortSignal
): Promise<LoopResult> {
  const iterations: Iteration[] = [];
  let currentOutput = "";
  let lastCritique = "";
  let score = 0;
  let round = 1;

  const runTask = async (task: LoopTask): Promise<ApiResponse> => {
    callbacks.onStatus(taskToStatus(task));

    const result = await callApi(
      {
        target,
        round,
        task,
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

    const iteration: Iteration = {
      round,
      task,
      content,
      score: result.score,
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
    // Round 1: Generate
    await runTask("generate");
    if (score >= TARGET_SCORE) {
      callbacks.onStatus("complete");
      return {
        iterations,
        finalOutput: currentOutput,
        score,
        reason: "target_met",
      };
    }

    round = 2;

    while (round <= MAX_ROUNDS) {
      if (abortSignal.aborted) throw new LoopAbortedError();

      // Critique
      await runTask("critique");
      if (score >= TARGET_SCORE) {
        callbacks.onStatus("complete");
        return {
          iterations,
          finalOutput: currentOutput,
          score,
          reason: "target_met",
        };
      }

      if (abortSignal.aborted) throw new LoopAbortedError();
      if (round >= MAX_ROUNDS) break;

      round++;

      // Refine
      await runTask("refine");
      if (score >= TARGET_SCORE) {
        callbacks.onStatus("complete");
        return {
          iterations,
          finalOutput: currentOutput,
          score,
          reason: "target_met",
        };
      }

      if (abortSignal.aborted) throw new LoopAbortedError();
      round++;
    }

    callbacks.onStatus("complete");
    return {
      iterations,
      finalOutput: currentOutput,
      score,
      reason: "max_rounds",
    };
  } catch (error) {
    if (error instanceof LoopAbortedError) {
      callbacks.onStatus("stopped");
      return {
        iterations,
        finalOutput: currentOutput,
        score,
        reason: "stopped",
      };
    }

    if (error instanceof LoopApiError) {
      callbacks.onStatus("error");
      throw error;
    }

    if (error instanceof DOMException && error.name === "AbortError") {
      callbacks.onStatus("stopped");
      return {
        iterations,
        finalOutput: currentOutput,
        score,
        reason: "stopped",
      };
    }

    callbacks.onStatus("error");
    throw error;
  }
}
