import { NextResponse } from "next/server";
import { getModelComparisons, getSucceededFineTunedModel } from "@/app/lib/db";

export async function GET() {
  try {
    const [comparisons, fineTuned] = await Promise.all([
      getModelComparisons(),
      getSucceededFineTunedModel(),
    ]);
    return NextResponse.json({
      comparisons,
      fineTunedModelId: fineTuned?.model_id ?? null,
      fineTunedRecordId: fineTuned?.id ?? null,
    });
  } catch {
    return NextResponse.json({
      comparisons: [],
      fineTunedModelId: null,
      fineTunedRecordId: null,
    });
  }
}
