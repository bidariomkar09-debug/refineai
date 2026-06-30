import { NextRequest, NextResponse } from "next/server";
import { approvePipelineRun } from "@/app/lib/trainingPipelineStages";

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const runId = typeof body.runId === "string" ? body.runId : "";
    if (!runId) {
      return NextResponse.json({ error: "runId required" }, { status: 400 });
    }
    const run = await approvePipelineRun(runId);
    if (!run) {
      return NextResponse.json({ error: "Run not found or not awaiting approval" }, { status: 404 });
    }
    return NextResponse.json({ run });
  } catch {
    return NextResponse.json({ error: "Approval failed" }, { status: 500 });
  }
}
