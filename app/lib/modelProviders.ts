import OpenAI from "openai";
import type { ModelProvider, ModelProviderType, ResolvedModel } from "./settingsTypes";

export class ProviderError extends Error {
  constructor(
    message: string,
    public readonly statusCode: number = 500
  ) {
    super(message);
    this.name = "ProviderError";
  }
}

function getOpenAIClient(): OpenAI {
  const apiKey = process.env.OPENAI_API_KEY;
  if (!apiKey) throw new ProviderError("OPENAI_API_KEY is not configured", 500);
  return new OpenAI({ apiKey });
}

function getDefaultModel(): string {
  return process.env.OPENAI_MODEL ?? "gpt-4o";
}

export const PROVIDER_TIMEOUT_MS = 10_000;
const OPENAI_COST_PER_1K = 0.03;

export function isRetriableProviderError(err: unknown): boolean {
  if (err instanceof ProviderError) {
    return err.statusCode === 504 || err.statusCode === 408 || err.statusCode === 429;
  }
  if (err instanceof Error) {
    const msg = err.message.toLowerCase();
    return (
      err.name === "AbortError" ||
      msg.includes("abort") ||
      msg.includes("timeout") ||
      msg.includes("timed out") ||
      msg.includes("504")
    );
  }
  return false;
}

export function encodeApiKey(key: string): string {
  return Buffer.from(key, "utf-8").toString("base64");
}

export function decodeApiKey(encoded: string | null): string {
  if (!encoded) return "";
  try {
    return Buffer.from(encoded, "base64").toString("utf-8");
  } catch {
    return "";
  }
}

export function modelUsedLabel(resolved: ResolvedModel): string {
  if (resolved.providerType === "openai") return resolved.modelId;
  return `${resolved.providerType}:${resolved.modelId}`;
}

export function isSelfHostedProvider(type: ModelProviderType): boolean {
  return type !== "openai";
}

function estimateTokens(text: string): number {
  return Math.max(1, Math.ceil(text.length / 4));
}

function parseJSONContent<T>(content: string): T {
  const trimmed = content.trim();
  const fenceMatch = trimmed.match(/```(?:json)?\s*([\s\S]*?)```/);
  const jsonStr = fenceMatch ? fenceMatch[1].trim() : trimmed;
  return JSON.parse(jsonStr) as T;
}

async function fetchWithTimeout(
  url: string,
  init: RequestInit,
  timeoutMs = PROVIDER_TIMEOUT_MS
): Promise<Response> {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);
  try {
    return await fetch(url, { ...init, signal: controller.signal });
  } finally {
    clearTimeout(timer);
  }
}

export async function callOpenAI<T>(
  system: string,
  user: string,
  model: string,
  temperature: number
): Promise<{ data: T; tokens: number; latencyMs: number }> {
  const start = Date.now();
  const client = getOpenAIClient();
  const response = await client.chat.completions.create({
    model: model || getDefaultModel(),
    temperature,
    max_tokens: 4096,
    response_format: { type: "json_object" },
    messages: [
      { role: "system", content: system },
      { role: "user", content: user },
    ],
  });
  const content = response.choices[0]?.message?.content;
  if (!content) throw new ProviderError("Empty response", 502);
  return {
    data: parseJSONContent<T>(content),
    tokens: response.usage?.total_tokens ?? estimateTokens(content),
    latencyMs: Date.now() - start,
  };
}

export async function callReplicate<T>(
  system: string,
  user: string,
  provider: ModelProvider,
  temperature: number
): Promise<{ data: T; tokens: number; latencyMs: number }> {
  const start = Date.now();
  const apiKey = decodeApiKey(provider.api_key_encrypted);
  if (!apiKey) throw new ProviderError("Replicate API key not configured", 400);

  const prompt = `${system}\n\n${user}\n\nRespond with valid JSON only.`;
  const version = provider.model_name;
  if (!version) throw new ProviderError("Replicate model version required", 400);

  const createRes = await fetchWithTimeout("https://api.replicate.com/v1/predictions", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${apiKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      version,
      input: { prompt, temperature },
    }),
  });

  if (!createRes.ok) throw new ProviderError("Replicate request failed", 502);
  const prediction = (await createRes.json()) as {
    id: string;
    status: string;
    output?: string | string[];
    error?: string;
  };

  let status = prediction.status;
  let output = prediction.output;
  let attempts = 0;

  while (status !== "succeeded" && status !== "failed" && attempts < 20) {
    if (Date.now() - start > PROVIDER_TIMEOUT_MS) {
      throw new ProviderError("Replicate timeout", 504);
    }
    await new Promise((r) => setTimeout(r, 500));
    const pollRes = await fetchWithTimeout(
      `https://api.replicate.com/v1/predictions/${prediction.id}`,
      { headers: { Authorization: `Bearer ${apiKey}` } },
      PROVIDER_TIMEOUT_MS - (Date.now() - start)
    );
    if (!pollRes.ok) throw new ProviderError("Replicate poll failed", 502);
    const polled = (await pollRes.json()) as typeof prediction;
    status = polled.status;
    output = polled.output;
    if (polled.error) throw new ProviderError(polled.error, 502);
    attempts++;
  }

  if (status !== "succeeded" || !output) {
    throw new ProviderError("Replicate did not complete in time", 504);
  }

  const content = Array.isArray(output) ? output.join("") : String(output);
  return {
    data: parseJSONContent<T>(content),
    tokens: estimateTokens(content),
    latencyMs: Date.now() - start,
  };
}

export async function callRunpod<T>(
  system: string,
  user: string,
  provider: ModelProvider,
  temperature: number
): Promise<{ data: T; tokens: number; latencyMs: number }> {
  const start = Date.now();
  const url = provider.endpoint_url;
  if (!url) throw new ProviderError("RunPod endpoint URL required", 400);

  const apiKey = decodeApiKey(provider.api_key_encrypted);
  const prompt = `${system}\n\n${user}\n\nRespond with valid JSON only.`;

  const res = await fetchWithTimeout(url, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      ...(apiKey ? { Authorization: `Bearer ${apiKey}` } : {}),
    },
    body: JSON.stringify({
      input: {
        prompt,
        temperature,
        max_tokens: 4096,
      },
    }),
  });

  if (!res.ok) throw new ProviderError("RunPod request failed", 502);
  const body = (await res.json()) as {
    output?: string;
    text?: string;
    choices?: Array<{ text?: string; message?: { content?: string } }>;
  };

  const content =
    body.output ??
    body.text ??
    body.choices?.[0]?.message?.content ??
    body.choices?.[0]?.text ??
    "";

  if (!content) throw new ProviderError("Empty RunPod response", 502);

  return {
    data: parseJSONContent<T>(content),
    tokens: estimateTokens(content),
    latencyMs: Date.now() - start,
  };
}

export async function callCustomEndpoint<T>(
  system: string,
  user: string,
  provider: ModelProvider,
  temperature: number
): Promise<{ data: T; tokens: number; latencyMs: number }> {
  const start = Date.now();
  const baseUrl = provider.endpoint_url?.replace(/\/$/, "");
  if (!baseUrl) throw new ProviderError("Custom endpoint URL required", 400);

  const apiKey = decodeApiKey(provider.api_key_encrypted);
  const url = baseUrl.includes("/chat/completions")
    ? baseUrl
    : `${baseUrl}/v1/chat/completions`;

  const res = await fetchWithTimeout(url, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      ...(apiKey ? { Authorization: `Bearer ${apiKey}` } : {}),
    },
    body: JSON.stringify({
      model: provider.model_name ?? "default",
      temperature,
      max_tokens: 4096,
      response_format: { type: "json_object" },
      messages: [
        { role: "system", content: system },
        { role: "user", content: user },
      ],
    }),
  });

  if (!res.ok) throw new ProviderError("Custom endpoint request failed", 502);
  const body = (await res.json()) as {
    choices?: Array<{ message?: { content?: string } }>;
    usage?: { total_tokens?: number };
  };

  const content = body.choices?.[0]?.message?.content;
  if (!content) throw new ProviderError("Empty custom endpoint response", 502);

  return {
    data: parseJSONContent<T>(content),
    tokens: body.usage?.total_tokens ?? estimateTokens(content),
    latencyMs: Date.now() - start,
  };
}

export async function callProviderJSON<T>(
  system: string,
  user: string,
  resolved: ResolvedModel,
  temperature: number
): Promise<{ data: T; tokens: number; latencyMs: number }> {
  switch (resolved.providerType) {
    case "replicate":
      if (!resolved.provider) throw new ProviderError("Provider config missing", 400);
      return callReplicate<T>(system, user, resolved.provider, temperature);
    case "runpod":
      if (!resolved.provider) throw new ProviderError("Provider config missing", 400);
      return callRunpod<T>(system, user, resolved.provider, temperature);
    case "custom":
      if (!resolved.provider) throw new ProviderError("Provider config missing", 400);
      return callCustomEndpoint<T>(system, user, resolved.provider, temperature);
    case "openai":
    default:
      return callOpenAI<T>(system, user, resolved.modelId, temperature);
  }
}

export async function testProviderConnection(
  provider: ModelProvider
): Promise<{ ok: boolean; latencyMs: number; message: string }> {
  const start = Date.now();
  try {
    await callProviderJSON<{ ok: boolean }>(
      'Respond with JSON: { "ok": true }',
      "ping",
      {
        modelId: provider.model_name ?? "gpt-4o",
        providerType: provider.provider_type,
        provider,
      },
      0
    );
    return { ok: true, latencyMs: Date.now() - start, message: "Connection successful" };
  } catch (err) {
    return {
      ok: false,
      latencyMs: Date.now() - start,
      message: err instanceof Error ? err.message : "Connection failed",
    };
  }
}

export function getOpenAICostPer1k(): number {
  return OPENAI_COST_PER_1K;
}

export function resolveOpenAIModel(modelId: string): ResolvedModel {
  return { modelId, providerType: "openai" };
}

export function resolveFromProvider(provider: ModelProvider): ResolvedModel {
  return {
    modelId: provider.model_name ?? provider.provider_name,
    providerType: provider.provider_type,
    providerId: provider.id,
    provider,
  };
}
