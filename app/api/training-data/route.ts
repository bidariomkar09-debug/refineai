import { NextRequest, NextResponse } from "next/server";
import {
  getTrainingDataSessions,
  getTrainingDataStats,
} from "@/app/lib/db";
import { parseTrainingFilters } from "@/app/lib/trainingFilters";

export async function GET(request: NextRequest) {
  try {
    const filters = parseTrainingFilters(request);
    const [stats, sessions] = await Promise.all([
      getTrainingDataStats(),
      getTrainingDataSessions(filters),
    ]);
    return NextResponse.json({ stats, sessions, count: stats.totalExamples });
  } catch (err) {
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "Failed to load training data" },
      { status: 500 }
    );
  }
}
