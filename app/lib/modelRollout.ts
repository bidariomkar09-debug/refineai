export const ROLLOUT_TIERS = [10, 25, 50, 100] as const;

export function getNextRolloutTier(current: number): number | null {
  for (const tier of ROLLOUT_TIERS) {
    if (tier > current) return tier;
  }
  return null;
}

export function isCustomModelId(modelId: string | null | undefined): boolean {
  if (!modelId) return false;
  return modelId.startsWith("ft:") || modelId.includes("fine");
}
