import { NextRequest, NextResponse } from "next/server";
import {
  getCustomModelRecentStats,
  getModelConfig,
  getSucceededFineTunedModel,
  updateModelConfig,
} from "@/app/lib/db";

export async function GET() {
  try {
    const config = await getModelConfig();
    const [stats, fineTuned] = await Promise.all([
      getCustomModelRecentStats(config.custom_model_id),
      getSucceededFineTunedModel(),
    ]);

    return NextResponse.json({
      config,
      stats,
      suggestedModelId: fineTuned?.model_id ?? config.custom_model_id,
    });
  } catch {
    return NextResponse.json({
      config: {
        active_model: "gpt-4o",
        fallback_model: "gpt-4o",
        rollout_percentage: 0,
        is_custom_model_enabled: false,
        custom_model_id: null,
      },
      stats: { customHandled: 0, totalRecent: 0, successfulCustom: 0 },
      suggestedModelId: null,
    });
  }
}

export async function PATCH(request: NextRequest) {
  try {
    const body = await request.json();
    const partial: Parameters<typeof updateModelConfig>[0] = {};

    if (typeof body.is_custom_model_enabled === "boolean") {
      partial.is_custom_model_enabled = body.is_custom_model_enabled;
    }
    if (typeof body.custom_model_id === "string") {
      partial.custom_model_id = body.custom_model_id.trim() || null;
    }
    if (typeof body.rollout_percentage === "number") {
      partial.rollout_percentage = Math.min(100, Math.max(0, body.rollout_percentage));
    }
    if (typeof body.fallback_model === "string") {
      partial.fallback_model = body.fallback_model;
    }
    if (typeof body.active_model === "string") {
      partial.active_model = body.active_model;
    }

    const config = await updateModelConfig(partial);
    const stats = await getCustomModelRecentStats(config.custom_model_id);

    return NextResponse.json({ config, stats });
  } catch {
    return NextResponse.json({ error: "Failed to update model config" }, { status: 500 });
  }
}
