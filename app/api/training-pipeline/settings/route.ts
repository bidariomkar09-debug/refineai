import { NextRequest, NextResponse } from "next/server";
import { updatePipelineSettings } from "@/app/lib/db";

export async function PATCH(request: NextRequest) {
  try {
    const body = await request.json();
    const partial: Parameters<typeof updatePipelineSettings>[0] = {};

    if (typeof body.auto_training_paused === "boolean") {
      partial.auto_training_paused = body.auto_training_paused;
    }
    if (typeof body.require_manual_approval === "boolean") {
      partial.require_manual_approval = body.require_manual_approval;
    }

    const settings = await updatePipelineSettings(partial);
    return NextResponse.json({ settings });
  } catch {
    return NextResponse.json({ error: "Failed to update settings" }, { status: 500 });
  }
}
