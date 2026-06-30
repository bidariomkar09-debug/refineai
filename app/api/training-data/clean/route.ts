import { NextResponse } from "next/server";
import {
  getAllTrainingData,
  getCleaningSummaryFromClean,
  replaceTrainingDataClean,
} from "@/app/lib/db";
import { EMPTY_CLEANING_SUMMARY, runCleaningPipeline } from "@/app/lib/trainingClean";

export async function GET() {
  try {
    const raw = await getAllTrainingData();
    const summary = await getCleaningSummaryFromClean(raw.length);
    return NextResponse.json({ summary });
  } catch {
    return NextResponse.json({ summary: EMPTY_CLEANING_SUMMARY });
  }
}

export async function POST() {
  try {
    const raw = await getAllTrainingData();
    const result = runCleaningPipeline(raw);
    try {
      await replaceTrainingDataClean(result.rows);
    } catch {
      return NextResponse.json({
        summary: { ...result.summary, afterCleaning: 0, trainingSet: 0, testSet: 0 },
      });
    }
    return NextResponse.json({ summary: result.summary });
  } catch {
    return NextResponse.json({ summary: EMPTY_CLEANING_SUMMARY });
  }
}
