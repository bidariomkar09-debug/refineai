import { NextResponse } from "next/server";
import { emergencyRollbackModel } from "@/app/lib/db";

export async function POST() {
  try {
    const config = await emergencyRollbackModel();
    return NextResponse.json({ config, rolledBack: true });
  } catch {
    return NextResponse.json({ error: "Rollback failed", rolledBack: false }, { status: 500 });
  }
}
