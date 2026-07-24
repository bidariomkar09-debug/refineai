import { NextRequest, NextResponse } from "next/server";
import { appendDogfoodNote, getUserSettings, upsertUserSettings } from "@/app/lib/db";
import type { DogfoodLogEntry } from "@/app/lib/settingsTypes";

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
      "dogfood_log",
      "developer_mode",
    ] as const;
    const partial: Record<string, unknown> = {};
    for (const key of allowed) {
      if (body[key] !== undefined) partial[key] = body[key];
    }

    if (body.dogfood_entry && typeof body.dogfood_entry === "object") {
      const entry = body.dogfood_entry as DogfoodLogEntry;
      if (entry.projectId && entry.note?.trim()) {
        const log = await appendDogfoodNote({
          projectId: entry.projectId,
          prompt: entry.prompt ?? "",
          note: entry.note.trim(),
          createdAt: entry.createdAt ?? new Date().toISOString(),
        });
        return NextResponse.json({
          settings: { ...(await getUserSettings()), dogfood_log: log },
        });
      }
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
