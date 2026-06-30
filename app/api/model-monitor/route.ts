import { NextResponse } from "next/server";
import { getModelMonitorStats } from "@/app/lib/db";
import { checkRolloutSuggestion } from "@/app/lib/rolloutCheck";

export async function GET() {
  try {
    const [stats, rollout] = await Promise.all([
      getModelMonitorStats(),
      checkRolloutSuggestion(),
    ]);
    return NextResponse.json({ stats, rollout });
  } catch {
    return NextResponse.json({
      stats: {
        gpt4oRequests: 0,
        customModelRequests: 0,
        customSuccessRate: 0,
        customAvgScore: 0,
        gpt4oAvgScore: 0,
        fallbackTriggers: 0,
        underperforming: false,
        customModelId: null,
        rolloutPercentage: 0,
        isCustomEnabled: false,
      },
      rollout: {
        show: false,
        currentPercentage: 0,
        suggestedPercentage: 0,
        message: "",
      },
    });
  }
}
