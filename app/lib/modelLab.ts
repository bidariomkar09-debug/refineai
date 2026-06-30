import { FILE_SCORE_THRESHOLD, type FileTask } from "./agentTypes";
import { callFileTask } from "./agentAI";
import { COMPARISON_BASE_MODEL } from "./fineTuning";

export type LabRound = {
  round: number;
  task: string;
  output: string;
  score: number;
};

export type LabModelResult = {
  model: string;
  label: string;
  rounds: LabRound[];
  round1: LabRound | null;
  round2: LabRound | null;
  finalScore: number;
  roundsTaken: number;
  totalTokens: number;
  timeMs: number;
  firstRoundScore: number;
  error?: string;
};

export type LabComparisonResult = {
  testPrompt: string;
  modelA: LabModelResult;
  modelB: LabModelResult;
  winner: "model_a" | "model_b" | "tie";
};

export type LabMetricRow = {
  metric: string;
  modelA: string;
  modelB: string;
  winner: "model_a" | "model_b" | "tie";
};

export type LabSuiteResult = {
  comparisons: LabComparisonResult[];
  metrics: LabMetricRow[];
  verdict: string;
  verdictDetail: string;
  overallWinner: "model_a" | "model_b" | "tie";
  fineTunedModelId: string | null;
  fineTunedRecordId: string | null;
};

export const MODEL_LAB_CONTROL = COMPARISON_BASE_MODEL;

const LAB_MAX_ROUNDS = 6;

async function runLabLoop(
  model: string,
  target: string,
  filePath: string
): Promise<LabModelResult> {
  const start = Date.now();
  const label =
    model === COMPARISON_BASE_MODEL || model === "gpt-4o"
      ? "GPT-4o (Control)"
      : "Your Fine-Tuned Model";

  const rounds: LabRound[] = [];
  let currentCode = "";
  let lastReview = "";
  let score = 0;
  let round = 1;
  let totalTokens = 0;
  let firstRoundScore = 0;

  const labContext = {
    filePath,
    filePurpose: target,
    projectContext: `Model Lab test\nTarget: ${target}`,
    completedFiles: "No prior files.",
  };

  const runTask = async (task: FileTask): Promise<boolean> => {
    try {
      const result = await callFileTask({
        ...labContext,
        task,
        round,
        currentCode: currentCode || undefined,
        lastReview: lastReview || undefined,
        modelOverride: model,
      });
      totalTokens += result.tokens;
      score = result.score;

      if (task === "review") {
        lastReview = result.review ?? "";
        rounds.push({ round, task, output: lastReview, score });
      } else {
        currentCode = result.code ?? currentCode;
        rounds.push({ round, task, output: currentCode, score });
        if (round === 1 && task === "write") firstRoundScore = score;
      }
      return true;
    } catch {
      return false;
    }
  };

  try {
    const ok = await runTask("write");
    if (!ok) throw new Error("write failed");
    if (firstRoundScore === 0 && rounds[0]) firstRoundScore = rounds[0].score;

    while (score < FILE_SCORE_THRESHOLD && round < LAB_MAX_ROUNDS) {
      await runTask("review");
      if (score >= FILE_SCORE_THRESHOLD) break;
      round++;
      await runTask("refine");
      if (score >= FILE_SCORE_THRESHOLD) break;
      round++;
    }
  } catch {
    return {
      model,
      label,
      rounds,
      round1: rounds[0] ?? null,
      round2: rounds[1] ?? null,
      finalScore: score,
      roundsTaken: round,
      totalTokens,
      timeMs: Date.now() - start,
      firstRoundScore,
      error: "Loop failed",
    };
  }

  const codeRounds = rounds.filter((r) => r.task === "write" || r.task === "refine");

  return {
    model,
    label,
    rounds,
    round1: codeRounds[0] ?? rounds[0] ?? null,
    round2: codeRounds[1] ?? rounds[1] ?? null,
    finalScore: score,
    roundsTaken: round,
    totalTokens,
    timeMs: Date.now() - start,
    firstRoundScore: firstRoundScore || codeRounds[0]?.score || 0,
  };
}

function pickWinner(a: LabModelResult, b: LabModelResult): "model_a" | "model_b" | "tie" {
  if (a.error && !b.error) return "model_b";
  if (b.error && !a.error) return "model_a";
  if (a.finalScore > b.finalScore) return "model_a";
  if (b.finalScore > a.finalScore) return "model_b";
  if (a.roundsTaken < b.roundsTaken) return "model_a";
  if (b.roundsTaken < a.roundsTaken) return "model_b";
  return "tie";
}

export async function runLabComparison(
  target: string,
  filePath: string,
  modelA: string,
  modelB: string
): Promise<LabComparisonResult> {
  const [modelAResult, modelBResult] = await Promise.all([
    runLabLoop(modelA, target, filePath),
    runLabLoop(modelB, target, filePath),
  ]);

  return {
    testPrompt: target,
    modelA: modelAResult,
    modelB: modelBResult,
    winner: pickWinner(modelAResult, modelBResult),
  };
}

function avg(nums: number[]): number {
  if (nums.length === 0) return 0;
  return Math.round((nums.reduce((a, b) => a + b, 0) / nums.length) * 10) / 10;
}

function metricWinner(
  aVal: number,
  bVal: number,
  lowerIsBetter = false
): "model_a" | "model_b" | "tie" {
  if (lowerIsBetter) {
    if (aVal < bVal) return "model_a";
    if (bVal < aVal) return "model_b";
  } else {
    if (aVal > bVal) return "model_a";
    if (bVal > aVal) return "model_b";
  }
  return "tie";
}

export function buildSuiteMetrics(comparisons: LabComparisonResult[]): LabMetricRow[] {
  const aRounds = comparisons.map((c) => c.modelA.roundsTaken);
  const bRounds = comparisons.map((c) => c.modelB.roundsTaken);
  const aFirst = comparisons.map((c) => c.modelA.firstRoundScore);
  const bFirst = comparisons.map((c) => c.modelB.firstRoundScore);
  const aTokens = comparisons.map((c) => c.modelA.totalTokens);
  const bTokens = comparisons.map((c) => c.modelB.totalTokens);
  const aTime = comparisons.map((c) =>
    c.modelA.roundsTaken > 0 ? c.modelA.timeMs / c.modelA.roundsTaken / 1000 : 0
  );
  const bTime = comparisons.map((c) =>
    c.modelB.roundsTaken > 0 ? c.modelB.timeMs / c.modelB.roundsTaken / 1000 : 0
  );
  const aConsistency =
    (comparisons.filter((c) => c.modelA.finalScore >= 95).length / comparisons.length) * 100;
  const bConsistency =
    (comparisons.filter((c) => c.modelB.finalScore >= 95).length / comparisons.length) * 100;

  const rows: Array<{ metric: string; a: number; b: number; lower?: boolean; pct?: boolean }> = [
    { metric: "Avg rounds to 95%", a: avg(aRounds), b: avg(bRounds), lower: true },
    { metric: "Avg first round score", a: avg(aFirst), b: avg(bFirst), pct: true },
    { metric: "Avg tokens used", a: Math.round(avg(aTokens)), b: Math.round(avg(bTokens)), lower: true },
    { metric: "Avg time per round", a: avg(aTime), b: avg(bTime), lower: true },
    { metric: "Consistency score", a: Math.round(aConsistency), b: Math.round(bConsistency), pct: true },
  ];

  return rows.map(({ metric, a, b, lower, pct }) => {
    const w = metricWinner(a, b, lower);
    const fmt = (v: number) => (pct ? `${v}%` : String(v));
    return {
      metric,
      modelA: fmt(a),
      modelB: fmt(b),
      winner: w,
    };
  });
}

export function buildSuiteVerdict(comparisons: LabComparisonResult[]): {
  verdict: string;
  verdictDetail: string;
  overallWinner: "model_a" | "model_b" | "tie";
} {
  const metrics = buildSuiteMetrics(comparisons);
  const bWins = metrics.filter((m) => m.winner === "model_b").length;
  const aWins = metrics.filter((m) => m.winner === "model_a").length;

  const avgARounds = avg(comparisons.map((c) => c.modelA.roundsTaken));
  const avgBRounds = avg(comparisons.map((c) => c.modelB.roundsTaken));
  const avgATokens = avg(comparisons.map((c) => c.modelA.totalTokens));
  const avgBTokens = avg(comparisons.map((c) => c.modelB.totalTokens));
  const avgAFirst = avg(comparisons.map((c) => c.modelA.firstRoundScore));
  const avgBFirst = avg(comparisons.map((c) => c.modelB.firstRoundScore));

  const fasterPct =
    avgARounds > 0 ? Math.round(((avgARounds - avgBRounds) / avgARounds) * 100) : 0;
  const tokenPct =
    avgATokens > 0 ? Math.round(((avgATokens - avgBTokens) / avgATokens) * 100) : 0;
  const accuracyPct =
    avgAFirst > 0 ? Math.round(((avgBFirst - avgAFirst) / avgAFirst) * 100) : 0;

  const overallWinner: "model_a" | "model_b" | "tie" =
    bWins > aWins ? "model_b" : aWins > bWins ? "model_a" : "tie";

  if (overallWinner === "model_b") {
    return {
      overallWinner,
      verdict: "Your Model Wins!",
      verdictDetail: `${Math.max(0, fasterPct)}% faster, ${Math.max(0, tokenPct)}% fewer tokens, higher first-round accuracy (+${Math.max(0, accuracyPct)}%)`,
    };
  }
  if (overallWinner === "model_a") {
    return {
      overallWinner,
      verdict: "GPT-4o Wins",
      verdictDetail: `Control model performed better across ${aWins} of ${metrics.length} metrics.`,
    };
  }
  return {
    overallWinner: "tie",
    verdict: "It's a Tie",
    verdictDetail: "Both models performed similarly across the test suite.",
  };
}
