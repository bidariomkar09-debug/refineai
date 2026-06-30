import { NextResponse } from "next/server";
import { getTrainingDataClean } from "@/app/lib/db";
import { cleanRowToTrainingDataRow } from "@/app/lib/trainingClean";
import { toOpenAIJSONL } from "@/app/lib/trainingExport";

export async function GET() {
  try {
    const rows = await getTrainingDataClean("train");
    if (rows.length === 0) {
      return NextResponse.json({ error: "No cleaned training data" }, { status: 404 });
    }
    const exportRows = rows.map(cleanRowToTrainingDataRow);
    return new NextResponse(toOpenAIJSONL(exportRows), {
      headers: {
        "Content-Type": "application/jsonl",
        "Content-Disposition": 'attachment; filename="refineai-clean-finetuning.jsonl"',
      },
    });
  } catch {
    return NextResponse.json({ error: "Export failed" }, { status: 500 });
  }
}
