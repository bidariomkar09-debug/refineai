import { NextRequest, NextResponse } from "next/server";
import { getSucceededFineTunedModel, saveModelComparison } from "@/app/lib/db";
import { formatOpenAIError } from "@/app/lib/fineTuning";
import { MODEL_LAB_CONTROL, runLabComparison } from "@/app/lib/modelLab";

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const target = typeof body.target === "string" ? body.target.trim() : "";
    const filePath =
      typeof body.filePath === "string" ? body.filePath : "components/LabTest.tsx";

    if (!target) {
      return NextResponse.json({ error: "Test target required" }, { status: 400 });
    }

    const fineTuned = await getSucceededFineTunedModel();
    if (!fineTuned?.model_id) {
      return NextResponse.json(
        { error: "No fine-tuned model available. Complete fine-tuning first." },
        { status: 400 }
      );
    }

    const comparison = await runLabComparison(
      target,
      filePath,
      MODEL_LAB_CONTROL,
      fineTuned.model_id
    );

    try {
      await saveModelComparison({
        test_prompt: target,
        model_a: MODEL_LAB_CONTROL,
        model_b: fineTuned.model_id,
        model_a_score: comparison.modelA.finalScore,
        model_b_score: comparison.modelB.finalScore,
        model_a_rounds: comparison.modelA.roundsTaken,
        model_b_rounds: comparison.modelB.roundsTaken,
        model_a_tokens: comparison.modelA.totalTokens,
        model_b_tokens: comparison.modelB.totalTokens,
        winner: comparison.winner,
      });
    } catch {
      // silent
    }

    return NextResponse.json({
      comparison,
      fineTunedRecordId: fineTuned.id,
    });
  } catch (err) {
    return NextResponse.json({ error: formatOpenAIError(err) }, { status: 502 });
  }
}
