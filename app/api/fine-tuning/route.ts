import { NextResponse } from "next/server";
import { getLatestFineTunedModel } from "@/app/lib/db";

export async function GET() {
  try {
    const record = await getLatestFineTunedModel();
    return NextResponse.json({ record });
  } catch {
    return NextResponse.json({ record: null });
  }
}
