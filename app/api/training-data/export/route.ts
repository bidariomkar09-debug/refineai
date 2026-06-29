import { NextRequest, NextResponse } from "next/server";
import { getTrainingDataForExport } from "@/app/lib/db";
import { parseTrainingFilters } from "@/app/lib/trainingFilters";
import {
  buildTrainingDataExport,
  toCSV,
  toHuggingFaceDataset,
  toOpenAIJSONL,
} from "@/app/lib/trainingExport";

export async function GET(request: NextRequest) {
  try {
    const filters = parseTrainingFilters(request);
    const format = request.nextUrl.searchParams.get("format") ?? "all";
    const rows = await getTrainingDataForExport(filters);

    if (format === "openai") {
      return new NextResponse(toOpenAIJSONL(rows), {
        headers: {
          "Content-Type": "application/jsonl",
          "Content-Disposition": 'attachment; filename="refineai-openai-finetuning.jsonl"',
        },
      });
    }

    if (format === "huggingface") {
      return new NextResponse(JSON.stringify(toHuggingFaceDataset(rows), null, 2), {
        headers: {
          "Content-Type": "application/json",
          "Content-Disposition": 'attachment; filename="refineai-huggingface-dataset.json"',
        },
      });
    }

    if (format === "csv") {
      return new NextResponse(toCSV(rows), {
        headers: {
          "Content-Type": "text/csv",
          "Content-Disposition": 'attachment; filename="refineai-training-data.csv"',
        },
      });
    }

    return new NextResponse(JSON.stringify(buildTrainingDataExport(rows), null, 2), {
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
