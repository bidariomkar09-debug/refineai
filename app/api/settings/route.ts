import { NextRequest, NextResponse } from "next/server";
import { getUserSettings, upsertUserSettings } from "@/app/lib/db";

export async function GET() {
  try {
    const settings = await getUserSettings();
    return NextResponse.json({ settings });
  } catch (err) {
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "Failed to load settings" },
      { status: 500 }
    );
  }
}

export async function PATCH(request: NextRequest) {
  try {
    const body = await request.json();
    const allowed = [
      "account_name",
      "selected_model",
      "score_threshold",
      "max_rounds",
      "temperature",
      "theme",
      "timezone",
    ] as const;
    const partial: Record<string, unknown> = {};
    for (const key of allowed) {
      if (body[key] !== undefined) partial[key] = body[key];
    }
    const settings = await upsertUserSettings(partial);
    return NextResponse.json({ settings });
  } catch (err) {
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "Failed to save settings" },
      { status: 500 }
    );
  }
}
