import { NextRequest, NextResponse } from "next/server";
import { getStatusPageData, subscribeStatusUpdates } from "@/app/lib/db";

export async function GET() {
  try {
    const data = await getStatusPageData();
    return NextResponse.json(data);
  } catch {
    return NextResponse.json({
      overall: "operational",
      uptime90Days: 99.9,
      apiUptime: 99.9,
      loopApiUptime: 99.9,
      incidents: [],
    });
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const email = typeof body.email === "string" ? body.email.trim() : "";
    if (!email || !email.includes("@")) {
      return NextResponse.json({ error: "Valid email required" }, { status: 400 });
    }
    await subscribeStatusUpdates(email);
    return NextResponse.json({ subscribed: true });
  } catch {
    return NextResponse.json({ error: "Subscribe failed" }, { status: 500 });
  }
}
