import { NextRequest, NextResponse } from "next/server";
import { getLatestFineTunedModel } from "@/app/lib/db";
import { compareModels, formatOpenAIError } from "@/app/lib/fineTuning";

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const prompt = typeof body.prompt === "string" ? body.prompt.trim() : "";

    if (!prompt) {
      return NextResponse.json({ error: "Test prompt required" }, { status: 400 });
    }

    const record = await getLatestFineTunedModel();
    if (!record?.model_id || record.status !== "succeeded") {
      return NextResponse.json(
        { error: "No succeeded fine-tuned model available" },
        { status: 400 }
      );
    }

    const result = await compareModels(prompt, record.model_id);
    return NextResponse.json({ result });
  } catch (err) {
    return NextResponse.json({ error: formatOpenAIError(err) }, { status: 502 });
  }
}
