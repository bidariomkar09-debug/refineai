import {
  getModelConfig,
  getModelErrorCountSince,
  updateModelConfig,
} from "./db";
import { getNextRolloutTier } from "./modelRollout";
import type { RolloutSuggestion } from "./settingsTypes";

const STABLE_DAYS_MS = 3 * 24 * 60 * 60 * 1000;
const DISMISS_COOLDOWN_MS = 24 * 60 * 60 * 1000;

export async function checkRolloutSuggestion(): Promise<RolloutSuggestion> {
  const config = await getModelConfig();
  const current = config.rollout_percentage;
  const nextTier = getNextRolloutTier(current);

  const empty: RolloutSuggestion = {
    show: false,
    currentPercentage: current,
    suggestedPercentage: current,
    message: "",
  };

  if (!config.is_custom_model_enabled || !config.custom_model_id || !nextTier) {
    return empty;
  }

  if (current === 0) {
    return empty;
  }

  if (config.rollout_suggestion_dismissed_at) {
    const dismissedAt = new Date(config.rollout_suggestion_dismissed_at).getTime();
    if (Date.now() - dismissedAt < DISMISS_COOLDOWN_MS) {
      return empty;
    }
  }

  const since = new Date(Date.now() - STABLE_DAYS_MS).toISOString();
  const errors = await getModelErrorCountSince(since);
  if (errors > 0) return empty;

  if (config.suggested_rollout_percentage === nextTier) {
    return {
      show: true,
      currentPercentage: current,
      suggestedPercentage: nextTier,
      message: `Your model is stable! Increase rollout to ${nextTier}%?`,
    };
  }

  await updateModelConfig({ suggested_rollout_percentage: nextTier }).catch(() => {});

  return {
    show: true,
    currentPercentage: current,
    suggestedPercentage: nextTier,
    message: `Your model is stable! Increase rollout to ${nextTier}%?`,
  };
}

export async function acceptRolloutSuggestion(
  suggestedPercentage: number
): Promise<void> {
  await updateModelConfig({
    rollout_percentage: suggestedPercentage,
    suggested_rollout_percentage: null,
    rollout_suggestion_dismissed_at: null,
  });
}

export async function dismissRolloutSuggestion(): Promise<void> {
  await updateModelConfig({
    suggested_rollout_percentage: null,
    rollout_suggestion_dismissed_at: new Date().toISOString(),
  });
}
