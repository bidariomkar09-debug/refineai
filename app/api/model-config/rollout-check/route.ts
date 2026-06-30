import { NextRequest, NextResponse } from "next/server";
import {
  acceptRolloutSuggestion,
  checkRolloutSuggestion,
  dismissRolloutSuggestion,
} from "@/app/lib/rolloutCheck";

export async function GET() {
  try {
    const suggestion = await checkRolloutSuggestion();
    return NextResponse.json({ suggestion });
  } catch {
    return NextResponse.json({
      suggestion: {
        show: false,
        currentPercentage: 0,
        suggestedPercentage: 0,
        message: "",
      },
    });
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const action = body.action as string;

    if (action === "accept") {
      const pct = typeof body.suggestedPercentage === "number" ? body.suggestedPercentage : 0;
      await acceptRolloutSuggestion(pct);
      return NextResponse.json({ ok: true });
    }

    if (action === "dismiss") {
      await dismissRolloutSuggestion();
      return NextResponse.json({ ok: true });
    }

    return NextResponse.json({ error: "Invalid action" }, { status: 400 });
  } catch {
    return NextResponse.json({ error: "Action failed" }, { status: 500 });
  }
}
