import type {
  PipelineTriggerStatus,
  TrainingPipelineRun,
} from "./settingsTypes";
import {
  countTrainingDataSince,
  createNotification,
  createPipelineRun,
  getActivatedFineTunedModel,
  getLatestCompletedPipelineRun,
  getModelConfig,
  getModelMonitorStats,
  getNextPipelineRunNumber,
  getPipelineHistory,
  getPipelineSettings,
} from "./db";

export const MIN_NEW_EXAMPLES = 200;
export const MIN_DAYS_BETWEEN_RUNS = 7;

export async function checkTrainingTrigger(): Promise<PipelineTriggerStatus> {
  const settings = await getPipelineSettings();
  const lastRun = await getLatestCompletedPipelineRun();
  const activeRun = await getActivePipelineRun();

  const since = lastRun?.completed_at ?? lastRun?.started_at ?? "1970-01-01T00:00:00Z";
  const newExamples = await countTrainingDataSince(since);
  const examplesNeeded = Math.max(0, MIN_NEW_EXAMPLES - newExamples);

  const lastRunTime = lastRun?.completed_at
    ? new Date(lastRun.completed_at).getTime()
    : 0;
  const daysSinceLastRun = lastRunTime
    ? (Date.now() - lastRunTime) / (24 * 60 * 60 * 1000)
    : MIN_DAYS_BETWEEN_RUNS;
  const daysUntilEligible = Math.max(0, MIN_DAYS_BETWEEN_RUNS - daysSinceLastRun);

  let isStable = true;
  try {
    const [monitor, config] = await Promise.all([getModelMonitorStats(), getModelConfig()]);
    isStable = !monitor.underperforming;
    if (!config.is_custom_model_enabled && config.rollout_percentage === 0 && lastRun) {
      isStable = true;
    }
  } catch {
    isStable = true;
  }

  const hasActiveRun = !!activeRun;
  const isPaused = settings.auto_training_paused;

  const shouldTrigger =
    !isPaused &&
    !hasActiveRun &&
    newExamples >= MIN_NEW_EXAMPLES &&
    daysSinceLastRun >= MIN_DAYS_BETWEEN_RUNS &&
    isStable;

  let reason = "Ready to train";
  if (isPaused) reason = "Auto training is paused";
  else if (hasActiveRun) reason = "Pipeline run in progress";
  else if (newExamples < MIN_NEW_EXAMPLES)
    reason = `Need ${examplesNeeded} more examples`;
  else if (daysUntilEligible > 0)
    reason = `Next run eligible in ${Math.ceil(daysUntilEligible)} days`;
  else if (!isStable) reason = "Model success rate unstable — waiting";

  return {
    shouldTrigger,
    newExamplesSinceLastRun: newExamples,
    examplesNeeded,
    daysSinceLastRun: Math.floor(daysSinceLastRun),
    daysUntilEligible: Math.ceil(daysUntilEligible),
    isPaused,
    isStable,
    hasActiveRun,
    reason,
  };
}

export async function getActivePipelineRun(): Promise<TrainingPipelineRun | null> {
  const history = await getPipelineHistory(10);
  return history.find((r) => !["completed", "failed"].includes(r.status)) ?? null;
}

export async function startPipelineRun(force = false): Promise<TrainingPipelineRun | null> {
  if (!force) {
    const trigger = await checkTrainingTrigger();
    if (!trigger.shouldTrigger) return null;
  }

  const active = await getActivePipelineRun();
  if (active) return active;

  const runNumber = await getNextPipelineRunNumber();
  const activated = await getActivatedFineTunedModel();
  const previousModelId = activated?.model_id ?? null;

  const run = await createPipelineRun({
    pipeline_run_number: runNumber,
    previous_model_id: previousModelId,
    status: "running",
    stage: "collecting",
  });

  await createNotification({
    type: "pipeline_started",
    title: "Training pipeline started",
    message: `LoopModel v${runNumber} training run has begun.`,
    metadata: { pipelineId: run.id, runNumber },
  }).catch(() => {});

  return run;
}

export type ProcessPipelineResult = {
  run: TrainingPipelineRun | null;
  advanced: boolean;
  message: string;
};
