import { NextResponse } from "next/server";
import { startPipelineRun } from "@/app/lib/trainingPipeline";
import { processPipelineStage } from "@/app/lib/trainingPipelineStages";

export async function POST() {
  try {
    const run = await startPipelineRun(true);
    if (!run) {
      return NextResponse.json({ error: "Could not start pipeline" }, { status: 409 });
    }
    const result = await processPipelineStage();
    return NextResponse.json({ started: result.run ?? run, ...result });
  } catch {
    return NextResponse.json({ error: "Force retrain failed" }, { status: 500 });
  }
}
