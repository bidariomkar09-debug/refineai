import { NextResponse } from "next/server";
import { checkTrainingTrigger, startPipelineRun } from "@/app/lib/trainingPipeline";
import { processPipelineStage } from "@/app/lib/trainingPipelineStages";

export const maxDuration = 300;

export async function GET() {
  try {
    const trigger = await checkTrainingTrigger();
    return NextResponse.json({ trigger });
  } catch {
    return NextResponse.json({
      trigger: { shouldTrigger: false, reason: "Check failed" },
    });
  }
}

export async function POST() {
  try {
    const trigger = await checkTrainingTrigger();
    if (trigger.shouldTrigger) {
      const run = await startPipelineRun(false);
      if (run) {
        await processPipelineStage();
      }
    } else {
      await processPipelineStage();
    }
    const updatedTrigger = await checkTrainingTrigger();
    const result = await processPipelineStage();
    return NextResponse.json({ trigger: updatedTrigger, ...result });
  } catch {
    return NextResponse.json({
      trigger: { shouldTrigger: false, reason: "Trigger check failed" },
      run: null,
      advanced: false,
      message: "Failed",
    });
  }
}
