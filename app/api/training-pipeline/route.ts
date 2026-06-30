import { NextResponse } from "next/server";
import {
  getNotifications,
  getPipelineHistory,
  getPipelineSettings,
} from "@/app/lib/db";
import { checkTrainingTrigger, getActivePipelineRun } from "@/app/lib/trainingPipeline";

export async function GET() {
  try {
    const [history, settings, trigger, notifications, activeRun] = await Promise.all([
      getPipelineHistory(),
      getPipelineSettings(),
      checkTrainingTrigger(),
      getNotifications(15),
      getActivePipelineRun(),
    ]);

    return NextResponse.json({
      history,
      settings,
      trigger,
      notifications,
      activeRun,
    });
  } catch {
    return NextResponse.json({
      history: [],
      settings: { auto_training_paused: false, require_manual_approval: false },
      trigger: {
        shouldTrigger: false,
        newExamplesSinceLastRun: 0,
        examplesNeeded: 200,
        daysSinceLastRun: 0,
        daysUntilEligible: 7,
        isPaused: false,
        isStable: true,
        hasActiveRun: false,
        reason: "Unavailable",
      },
      notifications: [],
      activeRun: null,
    });
  }
}
