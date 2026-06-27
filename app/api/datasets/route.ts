import { NextResponse } from "next/server";
import { getAllDatasetFiles } from "@/app/lib/db";

export async function GET() {
  try {
    const files = await getAllDatasetFiles();
    return NextResponse.json({ files });
  } catch (err) {
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "Failed to load datasets" },
      { status: 500 }
    );
  }
}
