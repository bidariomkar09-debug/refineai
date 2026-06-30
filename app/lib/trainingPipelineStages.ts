import type { LabComparisonResult } from "./modelLab";
import {
  buildSuiteMetrics,
  buildSuiteVerdict,
  runLabComparison,
} from "./modelLab";
import { MODEL_LAB_TEST_SUITE } from "./modelLabTestSuite";
import type { PipelineComparisonResult, TrainingPipelineRun } from "./settingsTypes";
import {
  createFineTunedModelRecord,
  createNotification,
  getAllTrainingData,
  getFineTunedModelById,
  getLatestCompletedPipelineRun,
  getPipelineSettings,
  getTrainingDataClean,
  getTrainingDataStats,
  replaceTrainingDataClean,
  syncFineTunedJobStatus,
  updateFineTunedModel,
  updateModelConfig,
  updatePipelineRun,
} from "./db";
import {
  buildVersionSuffix,
  createFineTuningJob,
  fetchFineTuningJobStatus,
  mapOpenAIJobStatus,
  uploadFineTuningFile,
} from "./fineTuning";
import { cleanRowToTrainingDataRow, runCleaningPipeline } from "./trainingClean";
import { toOpenAIJSONL } from "./trainingExport";
import { getActivePipelineRun } from "./trainingPipeline";

const PROMOTION_THRESHOLD = 7;
const TOTAL_SCORE_DIMENSIONS = 10;

function getInternal(result: PipelineComparisonResult | null) {
  return result?._internal ?? {};
}

function withInternal(
  result: PipelineComparisonResult | null,
  internal: PipelineComparisonResult["_internal"]
): PipelineComparisonResult {
  return { ...(result ?? {}), _internal: { ...getInternal(result), ...internal } };
}

function categoryWins(comparisons: LabComparisonResult[]): number {
  const categories = ["react", "api", "database", "css", "documentation"] as const;
  let wins = 0;
  for (const cat of categories) {
    const tests = MODEL_LAB_TEST_SUITE.filter((t) => t.category === cat);
    const catComparisons = comparisons.filter((c) =>
      tests.some((t) => c.testPrompt === t.target)
    );
    if (catComparisons.length === 0) continue;
    const bWins = catComparisons.filter((c) => c.winner === "model_b").length;
    if (bWins > catComparisons.length / 2) wins++;
  }
  return wins;
}

function computePerformanceDelta(
  comparisons: LabComparisonResult[],
  previousDelta = 0
): number {
  if (comparisons.length === 0) return 0;
  const avgNew = comparisons.reduce((s, c) => s + c.modelB.finalScore, 0) / comparisons.length;
  const avgOld = comparisons.reduce((s, c) => s + c.modelA.finalScore, 0) / comparisons.length;
  return Math.round(avgNew - avgOld);
}

async function failRun(run: TrainingPipelineRun, reason: string): Promise<TrainingPipelineRun> {
  const updated = await updatePipelineRun(run.id, {
    status: "failed",
    stage: "completed",
    completed_at: new Date().toISOString(),
    comparison_result: {
      ...(run.comparison_result ?? {}),
      rejectReason: reason,
    },
  });

  await createNotification({
    type: "pipeline_failed",
    title: "Training run failed",
    message: reason,
    metadata: { pipelineId: run.id },
  }).catch(() => {});

  return updated;
}

async function stageCollect(run: TrainingPipelineRun): Promise<TrainingPipelineRun> {
  const lastRun = await getLatestCompletedPipelineRun();
  const since = lastRun?.completed_at ?? lastRun?.started_at ?? "1970-01-01T00:00:00Z";
  const allData = await getAllTrainingData();
  const newRows = allData.filter((r) => r.created_at >= since);
  const prevTotal = allData.length - newRows.length;

  const stats = await getTrainingDataStats();
  for (const milestone of [5000, 10000]) {
    if (prevTotal < milestone && stats.totalExamples >= milestone) {
      await createNotification({
        type: "milestone",
        title: `${milestone.toLocaleString()} examples reached`,
        message: `Your training dataset has reached ${milestone.toLocaleString()} examples.`,
        metadata: { milestone, total: stats.totalExamples },
      }).catch(() => {});
    }
  }

  return updatePipelineRun(run.id, {
    stage: "cleaning",
    new_examples_collected: newRows.length,
    total_examples_used: allData.length,
  });
}

async function stageClean(run: TrainingPipelineRun): Promise<TrainingPipelineRun> {
  const raw = await getAllTrainingData();
  const result = runCleaningPipeline(raw);
  try {
    await replaceTrainingDataClean(result.rows);
  } catch {
    return failRun(run, "Cleaning failed — could not save dataset");
  }

  if (!result.summary.readyForFineTuning) {
    return failRun(
      run,
      `Not enough training examples after cleaning (${result.summary.trainingSet}/100 required)`
    );
  }

  return updatePipelineRun(run.id, {
    stage: "training",
    total_examples_used: result.summary.trainingSet,
  });
}

async function stageTrain(run: TrainingPipelineRun): Promise<TrainingPipelineRun> {
  const internal = getInternal(run.comparison_result);
  let recordId = internal.fineTuneRecordId;

  if (!recordId) {
    const trainRows = await getTrainingDataClean("train");
    if (trainRows.length === 0) {
      return failRun(run, "No cleaned training data available");
    }
    const jsonlContent = toOpenAIJSONL(trainRows.map(cleanRowToTrainingDataRow));
    const record = await createFineTunedModelRecord(trainRows.length);
    recordId = record.id;
    try {
      const fileId = await uploadFineTuningFile(
        jsonlContent,
        `refineai-pipeline-v${run.pipeline_run_number}.jsonl`
      );
      await updateFineTunedModel(recordId, {
        status: "uploaded",
        openai_file_id: fileId,
      });
    } catch {
      await syncFineTunedJobStatus(recordId, "failed", null, "Upload failed");
      return failRun(run, "Failed to upload training file to OpenAI");
    }
    return updatePipelineRun(run.id, {
      comparison_result: withInternal(run.comparison_result, { fineTuneRecordId: recordId }),
    });
  }

  const fineTuned = await getFineTunedModelById(recordId);
  if (!fineTuned) {
    return failRun(run, "Fine-tune record not found");
  }

  if (!fineTuned.job_id) {
    if (!fineTuned.openai_file_id) {
      return failRun(run, "Missing uploaded training file");
    }
    try {
      const suffix = buildVersionSuffix(run.pipeline_run_number);
      const { jobId, status } = await createFineTuningJob(fineTuned.openai_file_id, suffix);
      await updateFineTunedModel(recordId, {
        job_id: jobId,
        status: mapOpenAIJobStatus(status),
      });
    } catch {
      await syncFineTunedJobStatus(recordId, "failed", null, "Failed to start fine-tuning job");
      return failRun(run, "Failed to start fine-tuning job");
    }
    return run;
  }

  try {
    const jobStatus = await fetchFineTuningJobStatus(fineTuned.job_id);
    await syncFineTunedJobStatus(
      recordId,
      jobStatus.status,
      jobStatus.modelId,
      jobStatus.errorMessage
    );

    if (jobStatus.status === "failed") {
      return failRun(run, jobStatus.errorMessage ?? "Fine-tuning job failed");
    }

    if (jobStatus.status !== "succeeded" || !jobStatus.modelId) {
      return run;
    }

    return updatePipelineRun(run.id, {
      stage: "testing",
      new_model_id: jobStatus.modelId,
      comparison_result: withInternal(run.comparison_result, {
        fineTuneRecordId: recordId,
        testIndex: 0,
        comparisons: [],
      }),
    });
  } catch {
    return run;
  }
}

async function stageTest(run: TrainingPipelineRun): Promise<TrainingPipelineRun> {
  const internal = getInternal(run.comparison_result);
  const newModelId = run.new_model_id;
  const previousModelId = run.previous_model_id;

  if (!newModelId) {
    return failRun(run, "No new model ID for testing");
  }

  const controlModel = previousModelId ?? "gpt-4o";
  const testIndex = internal.testIndex ?? 0;
  const stored = (internal.comparisons ?? []) as LabComparisonResult[];

  if (testIndex >= MODEL_LAB_TEST_SUITE.length) {
    return updatePipelineRun(run.id, { stage: "deciding" });
  }

  const batchSize = 2;
  const comparisons = [...stored];

  for (let i = 0; i < batchSize && testIndex + i < MODEL_LAB_TEST_SUITE.length; i++) {
    const test = MODEL_LAB_TEST_SUITE[testIndex + i];
    try {
      const comparison = await runLabComparison(
        test.target,
        test.filePath,
        controlModel,
        newModelId
      );
      comparisons.push(comparison);
    } catch {
      // skip failed test
    }
  }

  const nextIndex = Math.min(testIndex + batchSize, MODEL_LAB_TEST_SUITE.length);

  if (nextIndex >= MODEL_LAB_TEST_SUITE.length) {
    const metrics = buildSuiteMetrics(comparisons);
    const verdict = buildSuiteVerdict(comparisons);
    const catWins = categoryWins(comparisons);
    const metricWins = metrics.filter((m) => m.winner === "model_b").length;
    const testWins = comparisons.filter((c) => c.winner === "model_b").length;
    const totalScore = metricWins + catWins + Math.min(5, testWins);
    const performanceDelta = computePerformanceDelta(comparisons);

    const finalResult: PipelineComparisonResult = {
      metrics,
      verdict: verdict.verdict,
      verdictDetail: verdict.verdictDetail,
      metricWins,
      categoryWins: catWins,
      testWins,
      totalScoreDimensions: TOTAL_SCORE_DIMENSIONS,
      performanceDelta,
      versionLabel: `loop-v${run.pipeline_run_number}`,
      _internal: { fineTuneRecordId: internal.fineTuneRecordId, testIndex: nextIndex, comparisons },
    };

    return updatePipelineRun(run.id, {
      stage: "deciding",
      comparison_result: finalResult,
    });
  }

  return updatePipelineRun(run.id, {
    comparison_result: withInternal(run.comparison_result, {
      testIndex: nextIndex,
      comparisons,
    }),
  });
}

async function stageDecide(run: TrainingPipelineRun): Promise<TrainingPipelineRun> {
  const result = run.comparison_result ?? {};
  const metricWins = result.metricWins ?? 0;
  const categoryWinsCount = result.categoryWins ?? 0;
  const testWins = result.testWins ?? 0;
  const totalScore = metricWins + categoryWinsCount + Math.min(5, Math.floor(testWins / 4));
  const shouldPromote = totalScore >= PROMOTION_THRESHOLD;
  const settings = await getPipelineSettings();
  const versionLabel = result.versionLabel ?? `loop-v${run.pipeline_run_number}`;
  const performanceDelta = result.performanceDelta ?? 0;

  if (shouldPromote && settings.require_manual_approval) {
    await createNotification({
      type: "pipeline_approval",
      title: `${versionLabel} ready for review`,
      message: `New model beats current by ${performanceDelta}%+. Approve to promote.`,
      metadata: { pipelineId: run.id, performanceDelta },
    }).catch(() => {});

    return updatePipelineRun(run.id, {
      status: "awaiting_approval",
      stage: "completed",
      was_promoted: false,
      completed_at: new Date().toISOString(),
      comparison_result: {
        ...result,
        rejectReason: "Awaiting manual approval",
      },
    });
  }

  if (shouldPromote && run.new_model_id) {
    try {
      await updateModelConfig({
        is_custom_model_enabled: true,
        custom_model_id: run.new_model_id,
        rollout_percentage: 10,
      });
    } catch {
      // silent — production model unchanged
    }

    const deltaText =
      performanceDelta >= 0 ? `+${performanceDelta}%` : `${performanceDelta}%`;

    await createNotification({
      type: "pipeline_promoted",
      title: `${versionLabel} is live!`,
      message: `LoopModel ${versionLabel} is live! ${deltaText} better than previous.`,
      metadata: { pipelineId: run.id, modelId: run.new_model_id, performanceDelta },
    }).catch(() => {});

    return updatePipelineRun(run.id, {
      status: "completed",
      stage: "completed",
      was_promoted: true,
      completed_at: new Date().toISOString(),
      comparison_result: result,
    });
  }

  const reason =
    result.rejectReason ??
    `Scored ${totalScore}/${TOTAL_SCORE_DIMENSIONS} — below promotion threshold of ${PROMOTION_THRESHOLD}`;

  await createNotification({
    type: "pipeline_rejected",
    title: "Training run complete",
    message: "Current model still best. New version did not beat the threshold.",
    metadata: { pipelineId: run.id, reason, totalScore },
  }).catch(() => {});

  return updatePipelineRun(run.id, {
    status: "completed",
    stage: "completed",
    was_promoted: false,
    completed_at: new Date().toISOString(),
    comparison_result: { ...result, rejectReason: reason },
  });
}

export async function processPipelineStage(): Promise<{
  run: TrainingPipelineRun | null;
  advanced: boolean;
  message: string;
}> {
  let run = await getActivePipelineRun();

  if (!run) {
    return { run: null, advanced: false, message: "No active pipeline run" };
  }

  if (run.status === "awaiting_approval") {
    return { run, advanced: false, message: "Awaiting manual approval" };
  }

  if (run.status === "completed" || run.status === "failed") {
    return { run, advanced: false, message: "Pipeline already finished" };
  }

  const prevStage = run.stage;

  try {
    switch (run.stage) {
      case "collecting":
        run = await stageCollect(run);
        break;
      case "cleaning":
        run = await stageClean(run);
        break;
      case "training":
        run = await stageTrain(run);
        break;
      case "testing":
        run = await stageTest(run);
        break;
      case "deciding":
        run = await stageDecide(run);
        break;
      default:
        break;
    }
  } catch {
    run = await failRun(run, "Unexpected pipeline error");
  }

  const advanced = run.stage !== prevStage || run.status === "completed" || run.status === "failed";
  return {
    run,
    advanced,
    message: `Stage: ${run.stage} (${run.status})`,
  };
}

export async function approvePipelineRun(runId: string): Promise<TrainingPipelineRun | null> {
  const { getPipelineHistory } = await import("./db");
  const history = await getPipelineHistory(20);
  const run = history.find((r) => r.id === runId);
  if (!run || run.status !== "awaiting_approval" || !run.new_model_id) return null;

  try {
    await updateModelConfig({
      is_custom_model_enabled: true,
      custom_model_id: run.new_model_id,
      rollout_percentage: 10,
    });
  } catch {
    return null;
  }

  const versionLabel = run.comparison_result?.versionLabel ?? `loop-v${run.pipeline_run_number}`;

  await createNotification({
    type: "pipeline_promoted",
    title: `${versionLabel} is live!`,
    message: `Manually approved — ${versionLabel} promoted to production at 10% rollout.`,
    metadata: { pipelineId: run.id },
  }).catch(() => {});

  return updatePipelineRun(runId, {
    status: "completed",
    was_promoted: true,
    comparison_result: {
      ...(run.comparison_result ?? {}),
      rejectReason: undefined,
    },
  });
}
