import { NextResponse } from "next/server";
import { processPipelineStage } from "@/app/lib/trainingPipelineStages";

export const maxDuration = 300;

export async function POST() {
  try {
    const result = await processPipelineStage();
    return NextResponse.json(result);
  } catch {
    return NextResponse.json({
      run: null,
      advanced: false,
      message: "Process step failed",
    });
  }
}
