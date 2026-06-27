import { NextResponse } from "next/server";
import { getDashboardStats } from "@/app/lib/db";

export async function GET() {
  try {
    const stats = await getDashboardStats();
    return NextResponse.json(stats);
  } catch (err) {
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "Failed to load stats" },
      { status: 500 }
    );
  }
}
