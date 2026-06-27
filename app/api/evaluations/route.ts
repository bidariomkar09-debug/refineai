import { NextResponse } from "next/server";
import { getEvaluationStats } from "@/app/lib/db";

export async function GET() {
  try {
    const stats = await getEvaluationStats();
    return NextResponse.json(stats);
  } catch (err) {
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "Failed to load evaluations" },
      { status: 500 }
    );
  }
}
