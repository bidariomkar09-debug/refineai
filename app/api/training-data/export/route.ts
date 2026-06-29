import { NextResponse } from "next/server";
import { getAllTrainingData } from "@/app/lib/db";
import { buildTrainingDataExport } from "@/app/lib/trainingExport";

export async function GET() {
  try {
    const rows = await getAllTrainingData();
    const payload = buildTrainingDataExport(rows);

    return new NextResponse(JSON.stringify(payload, null, 2), {
      headers: {
        "Content-Type": "application/json",
        "Content-Disposition": 'attachment; filename="refineai-training-data.json"',
      },
    });
  } catch (err) {
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "Failed to export training data" },
      { status: 500 }
    );
  }
}
