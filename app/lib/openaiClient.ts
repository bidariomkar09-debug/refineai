import OpenAI from "openai";
import {
  callProviderJSON,
  getOpenAICostPer1k,
  isSelfHostedProvider,
  modelUsedLabel,
  PROVIDER_TIMEOUT_MS,
  resolveFromProvider,
  resolveOpenAIModel,
} from "./modelProviders";
import {
  getActiveModelProvider,
  getModelConfig,
  logModelError,
  logProviderRequest,
  updateProviderLatency,
} from "./db";
import type { ResolvedModel } from "./settingsTypes";

export const FALLBACK_MODEL = "gpt-4o";

export class OpenAIClientError extends Error {
  constructor(
    message: string,
    public readonly statusCode: number = 500
  ) {
    super(message);
    this.name = "OpenAIClientError";
  }
}

export function getOpenAIClient(): OpenAI {
  const apiKey = process.env.OPENAI_API_KEY;
  if (!apiKey) {
    throw new OpenAIClientError("OPENAI_API_KEY is not configured", 500);
  }
  return new OpenAI({ apiKey });
}

export function getModel(): string {
  return process.env.OPENAI_MODEL ?? FALLBACK_MODEL;
}

export type ModelSelectionContext = {
  explicitOverride?: string;
};

function isOpenAIFineTuned(modelId: string): boolean {
  return modelId.startsWith("ft:") || modelId.includes("fine");
}

/**
 * Multi-provider model router — OpenAI rollout + active self-hosted provider.
 */
export async function selectModelForRequest(
  ctx: ModelSelectionContext = {}
): Promise<ResolvedModel> {
  if (ctx.explicitOverride) {
    return resolveOpenAIModel(ctx.explicitOverride);
  }

  try {
    const activeProvider = await getActiveModelProvider();
    if (activeProvider && isSelfHostedProvider(activeProvider.provider_type)) {
      return resolveFromProvider(activeProvider);
    }
  } catch {
    // fall through
  }

  try {
    const config = await getModelConfig();
    const fallback = config.fallback_model || FALLBACK_MODEL;

    if (!config.is_custom_model_enabled || !config.custom_model_id) {
      return resolveOpenAIModel(fallback);
    }

    const roll = Math.random() * 100;
    if (roll <= config.rollout_percentage) {
      return resolveOpenAIModel(config.custom_model_id);
    }

    return resolveOpenAIModel(fallback);
  } catch {
    return resolveOpenAIModel(getModel());
  }
}

/** @deprecated Use selectModelForRequest — returns model id string for compatibility */
export async function selectModelIdForRequest(
  ctx: ModelSelectionContext = {}
): Promise<string> {
  const resolved = await selectModelForRequest(ctx);
  return modelUsedLabel(resolved);
}

export async function generateJSON<T>(
  system: string,
  user: string,
  model?: string | ResolvedModel,
  temperature = 0.7
): Promise<{ data: T; tokens: number }> {
  const resolved: ResolvedModel =
    typeof model === "string" || model === undefined
      ? resolveOpenAIModel(model ?? getModel())
      : model;

  const result = await callProviderJSON<T>(system, user, resolved, temperature);
  return { data: result.data, tokens: result.tokens };
}

export async function generateJSONWithFallback<T>(
  system: string,
  user: string,
  selected: string | ResolvedModel,
  temperature: number,
  fallbackModel: string = FALLBACK_MODEL
): Promise<{ data: T; tokens: number; modelUsed: string; fellBack: boolean }> {
  const resolved: ResolvedModel =
    typeof selected === "string" ? resolveOpenAIModel(selected) : selected;
  const fallback = resolveOpenAIModel(fallbackModel);
  const isCustom =
    isSelfHostedProvider(resolved.providerType) || isOpenAIFineTuned(resolved.modelId);

  try {
    const result = await callProviderJSON<T>(system, user, resolved, temperature);
    const label = modelUsedLabel(resolved);

    void logProviderRequest({
      provider_id: resolved.providerId ?? null,
      provider_type: resolved.providerType,
      model_used: label,
      tokens_used: result.tokens,
      latency_ms: result.latencyMs,
      success: true,
    }).catch(() => {});

    if (resolved.providerId) {
      void updateProviderLatency(resolved.providerId, result.latencyMs).catch(() => {});
    }

    return { data: result.data, tokens: result.tokens, modelUsed: label, fellBack: false };
  } catch (firstErr) {
    if (!isCustom) throw firstErr;

    try {
      const result = await callProviderJSON<T>(system, user, fallback, temperature);
      void logModelError({
        attempted_model: modelUsedLabel(resolved),
        fallback_model: fallbackModel,
        error_message: firstErr instanceof Error ? firstErr.message : "Provider failed",
      });
      void logProviderRequest({
        provider_id: resolved.providerId ?? null,
        provider_type: resolved.providerType,
        model_used: modelUsedLabel(resolved),
        tokens_used: 0,
        latency_ms: PROVIDER_TIMEOUT_MS,
        success: false,
      }).catch(() => {});

      return {
        data: result.data,
        tokens: result.tokens,
        modelUsed: fallbackModel,
        fellBack: true,
      };
    } catch {
      throw firstErr;
    }
  }
}

// Re-export for cost reference
export { getOpenAICostPer1k };
