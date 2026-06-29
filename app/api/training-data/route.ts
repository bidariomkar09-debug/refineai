import { NextResponse } from "next/server";
import { getTrainingDataCount } from "@/app/lib/db";

export async function GET() {
  try {
    const count = await getTrainingDataCount();
    return NextResponse.json({ count });
  } catch (err) {
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "Failed to load training data count" },
      { status: 500 }
    );
  }
}
