import { NextResponse } from "next/server";
import { getSucceededFineTunedModel, saveModelComparison } from "@/app/lib/db";
import { formatOpenAIError } from "@/app/lib/fineTuning";
import {
  buildSuiteMetrics,
  buildSuiteVerdict,
  MODEL_LAB_CONTROL,
  runLabComparison,
} from "@/app/lib/modelLab";
import { MODEL_LAB_TEST_SUITE } from "@/app/lib/modelLabTestSuite";

export async function POST() {
  try {
    const fineTuned = await getSucceededFineTunedModel();
    if (!fineTuned?.model_id) {
      return NextResponse.json(
        { error: "No fine-tuned model available. Complete fine-tuning first." },
        { status: 400 }
      );
    }

    const comparisons = [];

    for (const test of MODEL_LAB_TEST_SUITE) {
      try {
        const comparison = await runLabComparison(
          test.target,
          test.filePath,
          MODEL_LAB_CONTROL,
          fineTuned.model_id
        );
        comparisons.push(comparison);

        try {
          await saveModelComparison({
            test_prompt: test.target,
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
      } catch {
        // skip failed test, continue suite
      }
    }

    if (comparisons.length === 0) {
      return NextResponse.json({ error: "All tests failed" }, { status: 502 });
    }

    const { verdict, verdictDetail, overallWinner } = buildSuiteVerdict(comparisons);
    const metrics = buildSuiteMetrics(comparisons);

    return NextResponse.json({
      comparisons,
      metrics,
      verdict,
      verdictDetail,
      overallWinner,
      fineTunedModelId: fineTuned.model_id,
      fineTunedRecordId: fineTuned.id,
    });
  } catch (err) {
    return NextResponse.json({ error: formatOpenAIError(err) }, { status: 502 });
  }
}
