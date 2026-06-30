import { createHash, randomBytes } from "crypto";
import { runFileLoop } from "./fileLoopEngine";
import type { LoopModelPublicModel } from "./settingsTypes";
import {
  getActivatedFineTunedModel,
  getLoopModelApiKeyByHash,
  logLoopModelApiUsage,
  touchLoopModelApiKey,
} from "./db";

export const LOOPMODEL_API_KEY_PREFIX = "lm_live_";
export const API_PRICE_PER_1K_TOKENS = 0.002;
export const REFINEAI_SUBSCRIBER_MONTHLY = 29;

export class LoopModelApiError extends Error {
  constructor(
    message: string,
    public readonly statusCode: number = 400,
    public readonly code: string = "invalid_request"
  ) {
    super(message);
    this.name = "LoopModelApiError";
  }
}

export function hashApiKey(key: string): string {
  return createHash("sha256").update(key).digest("hex");
}

export function generateApiKey(): { key: string; prefix: string; hash: string } {
  const secret = randomBytes(24).toString("hex");
  const key = `${LOOPMODEL_API_KEY_PREFIX}${secret}`;
  const prefix = `${LOOPMODEL_API_KEY_PREFIX}${secret.slice(0, 8)}…`;
  return { key, prefix, hash: hashApiKey(key) };
}

export async function authenticateLoopModelRequest(
  authHeader: string | null
): Promise<{ developerId: string; apiKeyId: string }> {
  if (!authHeader?.startsWith("Bearer ")) {
    throw new LoopModelApiError("Missing API key. Use Authorization: Bearer lm_live_…", 401, "invalid_api_key");
  }
  const key = authHeader.slice(7).trim();
  if (!key.startsWith(LOOPMODEL_API_KEY_PREFIX)) {
    throw new LoopModelApiError("Invalid API key format", 401, "invalid_api_key");
  }

  const record = await getLoopModelApiKeyByHash(hashApiKey(key));
  if (!record || !record.is_active) {
    throw new LoopModelApiError("Invalid or revoked API key", 401, "invalid_api_key");
  }

  void touchLoopModelApiKey(record.id).catch(() => {});
  return { developerId: record.developer_id, apiKeyId: record.id };
}

export const LOOPMODEL_PUBLIC_MODELS: LoopModelPublicModel[] = [
  {
    id: "loop-v1",
    name: "LoopModel v1",
    description: "Baseline loop-refinement model trained on RefineAI sessions",
    context_window: 128000,
    pricing_per_1k_tokens: 0.002,
  },
  {
    id: "loop-v5",
    name: "LoopModel v5",
    description: "Latest production loop model with highest first-round accuracy",
    context_window: 128000,
    pricing_per_1k_tokens: 0.002,
  },
  {
    id: "loop-oss-v1",
    name: "LoopModel-OSS v1",
    description: "Self-hosted Llama fine-tune compatible with open-source stacks",
    context_window: 32000,
    pricing_per_1k_tokens: 0.001,
  },
];

export type LoopRefineRequest = {
  target: string;
  file_path?: string;
  code?: string;
  model?: string;
  max_rounds?: number;
};

export type LoopRefineResponse = {
  id: string;
  object: "loop.refinement";
  model: string;
  output: string;
  score: number;
  rounds: number;
  usage: { total_tokens: number };
  created: number;
};

export async function runLoopModelRefine(
  body: LoopRefineRequest,
  auth: { developerId: string; apiKeyId: string }
): Promise<LoopRefineResponse> {
  const target = typeof body.target === "string" ? body.target.trim() : "";
  if (!target) throw new LoopModelApiError("target is required", 400);

  const filePath = body.file_path ?? "components/Generated.tsx";
  const filePurpose = target.slice(0, 120);
  const start = Date.now();

  let activatedModel = body.model ?? "loop-v5";
  try {
    const activated = await getActivatedFineTunedModel();
    if (activated?.model_id && (!body.model || body.model.startsWith("loop-"))) {
      activatedModel = activated.model_id;
    }
  } catch {
    // use default
  }

  const result = await runFileLoop(
    {
      filePath,
      filePurpose,
      projectContext: `LoopModel API request\nTarget: ${target}`,
      completedFiles: body.code ? `Existing code provided.` : "No prior files.",
    },
    {
      onRound: async () => {},
      onStatus: () => {},
    }
  );

  const latencyMs = Date.now() - start;

  void logLoopModelApiUsage({
    api_key_id: auth.apiKeyId,
    developer_id: auth.developerId,
    endpoint: "/v1/loop/refine",
    model_used: activatedModel,
    tokens_used: result.totalTokens,
    latency_ms: latencyMs,
    status: "success",
  }).catch(() => {});

  return {
    id: `loop_${randomBytes(12).toString("hex")}`,
    object: "loop.refinement",
    model: body.model ?? "loop-v5",
    output: result.content,
    score: result.score,
    rounds: result.roundsTaken,
    usage: { total_tokens: result.totalTokens },
    created: Math.floor(Date.now() / 1000),
  };
}

export function loopModelErrorResponse(err: unknown): Response {
  if (err instanceof LoopModelApiError) {
    return Response.json(
      { error: { message: err.message, type: err.code } },
      { status: err.statusCode }
    );
  }
  return Response.json(
    { error: { message: "Internal error", type: "server_error" } },
    { status: 500 }
  );
}
